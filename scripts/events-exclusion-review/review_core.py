"""Existing private Events review convention: draft -> explicit receipt -> derived holds.

No public write occurs here. Baseline policy/history remain outside this case journal.
"""
from pathlib import Path
from datetime import datetime,timezone
import json,os,secrets,threading
from matching import digest,sha
CHOICES={'EXCLUDE','KEEP','UNSURE'}
class ReviewStore:
 def __init__(self,case):self.case=Path(case);self.lock=threading.RLock()
 def load(self,name):return json.loads((self.case/name).read_text())
 def atomic(self,name,data):
  p=self.case/name;tmp=p.with_name(p.name+'.'+secrets.token_hex(6)+'.tmp')
  with tmp.open('x') as f:json.dump(data,f,indent=2,ensure_ascii=False);f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,p)
 def manifest(self):
  m=self.load('review-manifest.json');expected=m['manifestDigest'];body={k:v for k,v in m.items() if k!='manifestDigest'}
  if digest(body)!=expected:raise ValueError('Review manifest changed or corrupt; regenerate and review')
  if m.get('assetsDigest')!=digest(self.load('assets.json')):raise ValueError('Asset bindings changed; previous draft is stale')
  return m
 def records(self):
  with self.lock:
   p=self.case/'decisions.jsonl';rows=[];previous=None
   if not p.exists():return rows
   for line in p.read_text().splitlines():
    row=json.loads(line);h=row.pop('recordHash')
    if row.get('previousRecordHash')!=previous or digest(row)!=h:raise ValueError('Decision history integrity failed')
    row['recordHash']=h;rows.append(row);previous=h
   return rows
 def effective(self):
  state={}
  for receipt in self.records():
   for item in receipt['selections']:
    key=item['assetKey'];current=state.get(key)
    if item['choice']=='EXCLUDE':state[key]={'choice':'EXCLUDE','receiptId':receipt['receiptId'],'recordHash':receipt['recordHash']}
    elif item['choice']=='RESTORE' and current and current['receiptId']==item.get('reversesReceiptId'):state[key]={'choice':'KEEP','receiptId':receipt['receiptId'],'restoredFrom':item['reversesReceiptId']}
    elif item['choice']=='KEEP' and (not current or current['choice']!='EXCLUDE'):state[key]={'choice':'KEEP','receiptId':receipt['receiptId']}
  return state
 def validated_effective(self):
  """Bind active exclusions to their original approval, permitting unrelated ID imports."""
  with self.lock:
   manifest=self.manifest();assets=self.load('assets.json');rows={r['assetKey'] for r in manifest['rows']};history={r['receiptId']:r for r in self.records()};state=self.effective()
   for key,decision in state.items():
    if decision['choice']!='EXCLUDE':continue
    receipt=history[decision['receiptId']]
    if receipt['sourceCommit']!=manifest['sourceCommit'] or receipt['batchId']!=manifest['batchId']:raise ValueError('Approved receipt source binding changed; explicit fresh review is required')
    item=next((r for r in receipt['selections'] if r['assetKey']==key),None);a=assets.get(key)
    if not a or key not in rows or not item or key!=a['eventId']+'|'+a['assetId']:raise ValueError('Approved receipt membership binding changed; explicit fresh review is required')
    fields=['eventId','assetId','originalPath','originalSha256']
    if any(item.get(f)!=a.get(f) for f in fields) or item['publicAtReview']!=a['public'] or item.get('baselineHoldPreserved',False)!=a.get('existingHold',False) or item.get('coverReferences',[])!=a.get('coverReferences',[]):raise ValueError('Approved receipt asset binding changed; explicit fresh review is required')
    if not Path(a['originalPath']).is_file() or sha(a['originalPath'])!=item['originalSha256']:raise ValueError('Approved original bytes changed or unavailable; projection is blocked')
   return state
 def set_draft(self,choices,revision,manifest_digest):
  with self.lock:
   m=self.manifest();d=self.load('draft.json');allowed={r['assetKey'] for r in m['rows']}
   if manifest_digest!=m['manifestDigest'] or d['manifestDigest']!=manifest_digest or revision!=d['revision']:raise ValueError('Stale review revision; reload before saving')
   if not choices or not set(choices)<=allowed or any(v not in CHOICES for v in choices.values()):raise ValueError('Unknown asset or invalid choice')
   d['choices'].update(choices);d['revision']+=1;self.atomic('draft.json',d);return d
 def approve(self,keys,revision,manifest_digest,owner_confirmed=False,restore=False):
  with self.lock:
   if (self.case/'approval-hold.json').exists():raise ValueError('Private approval is on hold for independent tooling review; drafts remain saved')
   if owner_confirmed is not True:raise ValueError('Explicit owner confirmation is required')
   m=self.manifest();d=self.load('draft.json');assets=self.load('assets.json');allowed={r['assetKey'] for r in m['rows']}
   if revision!=d['revision'] or manifest_digest!=m['manifestDigest'] or d['manifestDigest']!=manifest_digest:raise ValueError('Stale review/approval; reload and confirm exact selections')
   if not keys or len(keys)!=len(set(keys)) or not set(keys)<=allowed:raise ValueError('Approval must enumerate unique known memberships')
   fingerprint=digest({'keys':sorted(keys),'choices':{k:d['choices'][k] for k in sorted(keys)},'revision':revision,'manifestDigest':manifest_digest,'restore':restore})
   history=self.records()
   state=self.effective();selections=[]
   for key in sorted(keys):
    a=assets[key];choice=d['choices'][key]
    if not Path(a['originalPath']).is_file() or sha(a['originalPath'])!=a['originalSha256']:raise ValueError('Original binding changed or unavailable; review is blocked')
    if restore:
     if a.get('existingHold') or a.get('priorOmission'):raise ValueError('Existing baseline holds/omissions cannot be restored by this batch')
     if state.get(key,{}).get('choice')!='EXCLUDE':
      retry=next((r for r in reversed(history) if r.get('requestFingerprint')==fingerprint and all(state.get(i['assetKey'],{}).get('receiptId')==r['receiptId'] for i in r['selections'])),None)
      if retry:return retry
      raise ValueError('No approved batch hold to restore')
     item={'choice':'RESTORE','reversesReceiptId':state[key]['receiptId']}
    else:
     if choice=='UNSURE':continue
     if choice=='KEEP' and state.get(key,{}).get('choice')=='EXCLUDE':raise ValueError('Use explicit Restore; KEEP draft does not reverse an approved hold')
     item={'choice':choice}
    selections.append({**item,'assetKey':key,'eventId':a['eventId'],'assetId':a['assetId'],'originalPath':a['originalPath'],'originalSha256':a['originalSha256'],'publicAtReview':a['public'],'baselineHoldPreserved':a.get('existingHold',False),'coverReferences':a.get('coverReferences',[])})
   if not selections:raise ValueError('No decided selections to approve; UNSURE is not approval')
   # Retry only a receipt whose decisions are still effective. A Restore starts a new generation.
   for previous in reversed(history):
    if previous.get('requestFingerprint')==fingerprint and all(state.get(item['assetKey'],{}).get('receiptId')==previous['receiptId'] for item in previous['selections']) and previous['sourceCommit']==m['sourceCommit'] and previous['batchId']==m['batchId']:
     if all(any(old.get('assetKey')==item['assetKey'] and all(old.get(f)==item.get(f) for f in ['eventId','assetId','originalPath','originalSha256','publicAtReview','coverReferences']) for old in previous['selections']) for item in selections):return previous
   receipt={'schemaVersion':1,'privateOnly':True,'receiptId':'batch-'+secrets.token_hex(12),'requestFingerprint':fingerprint,'recordedAtUTC':datetime.now(timezone.utc).isoformat(),'actor':'Owner explicitly confirmed private review decisions','manifestDigest':manifest_digest,'draftRevision':revision,'sourceCommit':m['sourceCommit'],'batchId':m['batchId'],'selections':selections,'selectionDigest':digest(selections),'previousRecordHash':history[-1]['recordHash'] if history else None,'publicationAuthorized':False}
   receipt['recordHash']=digest(receipt)
   with (self.case/'decisions.jsonl').open('a') as f:f.write(json.dumps(receipt,sort_keys=True,ensure_ascii=False)+'\n');f.flush();os.fsync(f.fileno())
   (self.case/'receipts').mkdir(exist_ok=True);self.atomic('receipts/'+receipt['receiptId']+'.json',receipt)
   return receipt
 def import_candidates(self,keys,revision,manifest_digest,provenance):
  with self.lock:
   m=self.manifest();d=self.load('draft.json');assets=self.load('assets.json')
   if revision!=d['revision'] or manifest_digest!=m['manifestDigest']:raise ValueError('Stale import; reload')
   if not keys or len(keys)>2000 or len(set(keys))!=len(keys) or not set(keys)<=set(assets):raise ValueError('Import requires unique known eventId|assetId memberships')
   if not isinstance(provenance,str) or not provenance.strip() or len(provenance)>500:raise ValueError('Private import provenance is required')
   folder=self.case/'manifest-history';folder.mkdir(exist_ok=True);self.atomic('manifest-history/'+m['manifestDigest']+'.json',m)
   existing={r['assetKey'] for r in m['rows']};added=[]
   for key in keys:
    if key in existing:continue
    m['rows'].append({'assetKey':key,'inputGroupIds':[],'methods':['OWNER_IMPORTED_CANDIDATE_ID'],'verified':False,'needsJonReview':True});d['choices'][key]='UNSURE';added.append(key)
   m['summary']['candidateMemberships']=len(m['rows']);m['summary']['publicCandidateMemberships']=sum(assets[r['assetKey']]['public'] for r in m['rows']);m.pop('manifestDigest');m['manifestDigest']=digest(m);d['manifestDigest']=m['manifestDigest'];d['revision']+=1
   self.atomic('review-manifest.json',m);self.atomic('draft.json',d)
   with (self.case/'candidate-imports.jsonl').open('a') as f:f.write(json.dumps({'recordedAtUTC':datetime.now(timezone.utc).isoformat(),'source':provenance,'keys':keys,'added':added,'status':'CANDIDATES_ONLY_NOT_APPROVAL','manifestDigest':m['manifestDigest']},ensure_ascii=False)+'\n')
   return {'added':added,'manifestDigest':m['manifestDigest'],'approved':False}
