"""Prepare an exact private exclusion plan from approved receipts, never from drafts."""
from pathlib import Path
from collections import defaultdict
import json
from matching import digest,sha
from review_core import ReviewStore

def baseline_holds(policy):
 if policy.get("schemaVersion")==2:
  return [{**album,**asset} for album in policy["albums"] for asset in album["excludedAssets"]]
 return policy["holds"]

def approved_cover_changes(repo,store,manifest,assets,effective):
 """Resolve only explicit same-album retained cover decisions, never infer a replacement."""
 path=store.case/'cover-decisions.json'
 if not path.exists():return {}
 receipt=store.load('cover-decisions.json');body={k:v for k,v in receipt.items() if k!='receiptDigest'}
 if digest(body)!=receipt.get('receiptDigest') or receipt.get('ownerConfirmed') is not True or receipt.get('privateOnly') is not True or receipt.get('publicationAuthorized') is not False:raise ValueError('Invalid owner cover-decision receipt')
 if receipt.get('type')!='OWNER_CONFIRMED_PRIVATE_COVER_DECISIONS' or receipt.get('schemaVersion')!=1:raise ValueError('Invalid cover-decision type')
 if any(receipt.get(r)!=manifest.get(m) for r,m in [('sourceCommit','sourceCommit'),('reviewManifestDigest','manifestDigest'),('assetsDigest','assetsDigest')]):raise ValueError('Stale cover-decision source binding')
 parent=next((r for r in store.records() if r['receiptId']==receipt.get('parentDecisionReceiptId')),None)
 if not parent or parent['recordHash']!=receipt.get('parentDecisionRecordHash'):raise ValueError('Cover decision lacks its exact exclusion receipt')
 required={(key,ref['kind'],ref['eventId']) for key,d in effective.items() if d['choice']=='EXCLUDE' for ref in assets[key]['coverReferences']}
 if not isinstance(receipt.get('selections'),list) or not receipt['selections']:raise ValueError('Empty cover-decision receipt')
 changes={};roles={'album':'coverId','directory':'directory'}
 for selection in receipt['selections']:
  eid=selection['eventId'];key=eid+'|'+selection['oldAssetId'];kind=roles.get(selection['role']);binding=(key,kind,eid)
  if binding not in required or binding in changes:raise ValueError('Extra, duplicate or wrong-role cover decision')
  if effective[key]['receiptId']!=parent['receiptId']:raise ValueError('Cover decision exclusion generation changed')
  event=json.loads((Path(repo)/f'data/events/{eid}.json').read_text())['events'][0]
  if digest(event)!=selection['sourceEventDigest']:raise ValueError('Cover decision event source changed')
  if kind=='directory':
   current=json.loads((Path(repo)/'data/events/portrait-covers.json').read_text())['covers'][eid]
   if current['sourceEventId']!=eid or current['photoId']!=selection['oldAssetId']:raise ValueError('Directory cover source/role changed')
  elif event['coverId']!=selection['oldAssetId']:raise ValueError('Saved album cover source changed')
  new_key=eid+'|'+selection['newAssetId'];asset=assets.get(new_key)
  photo=next((p for p in event['photos'] if p['id']==selection['newAssetId']),None)
  if not photo or not asset or not asset['public'] or asset.get('existingHold') or asset.get('priorOmission') or effective.get(new_key,{}).get('choice')=='EXCLUDE':raise ValueError('Cover replacement must be a retained public member of the same album')
  if asset['originalPath']!=selection['newOriginalPath'] or asset['originalSha256']!=selection['newOriginalSha256'] or sha(asset['originalPath'])!=selection['newOriginalSha256'] or sha(Path(repo)/photo['display'])!=selection['newPublicDisplaySha256']:raise ValueError('Cover replacement original/display binding changed')
  changes[binding]={**selection,'newPhoto':photo,'coverDecisionReceiptDigest':receipt['receiptDigest']}
 return changes

def project_summary_photos(summary,removed,cover_changes):
 """The index embeds saved-cover previews; these must obey the same membership policy."""
 if 'photos' not in summary:return
 replacements={c['oldAssetId']:c['newPhoto'] for c in cover_changes if c['role']=='album' and c['eventId']==summary['id']}
 photos=[];seen=set()
 for original in summary['photos']:
  photo=replacements.get(original['id'],original)
  if photo['id'] not in removed and photo['id'] not in seen:photos.append(photo);seen.add(photo['id'])
 summary['photos']=photos

def project_parent_html(text,before,count):
 import re
 text=re.sub(r'(?<=content=")([^"<>]*)',lambda m:m[0].replace(str(before)+' photographs',str(count)+' photographs').replace(str(before)+' photos',str(count)+' photos'),text)
 return text.replace(str(before)+' JPEGs',str(count)+' JPEGs')

def prepare_plan(repo,case):
 repo=Path(repo);store=ReviewStore(case);
 if (store.case/'approval-hold.json').exists():raise ValueError('Private plan is on hold for independent tooling review; draft choices are preserved')
 m=store.manifest();assets=store.load('assets.json');effective=store.validated_effective()
 covers=approved_cover_changes(repo,store,m,assets,effective)
 index=json.loads((repo/'data/events/index.json').read_text());baseline=json.loads((repo/'scripts/events-public-exclusions.json').read_text())
 approved={key:row for key,row in effective.items() if row['choice']=='EXCLUDE'}
 pending=[];groups=defaultdict(list);already_private=[];blockers=[]
 for key,decision in approved.items():
  a=assets[key]
  if not a['public'] or a.get('existingHold') or a.get('priorOmission'):
   already_private.append({'assetKey':key,'decision':decision,'existingRestrictionsPreserved':True});continue
  if a['boundary']!='EVENTS':blockers.append({'assetKey':key,'reason':'LIVE1_WEDDING_DELIVERY_REQUIRES_SEPARATE_COORDINATION'});continue
  unresolved=[ref for ref in a['coverReferences'] if (key,ref['kind'],ref['eventId']) not in covers]
  if unresolved:blockers.append({'assetKey':key,'reason':'EXPLICIT_RETAINED_COVER_DECISION_REQUIRED','references':unresolved})
  groups[a['eventId']].append(key)
  for other_key,other in assets.items():
   if other_key!=key and other['public'] and other['originalSha256']==a['originalSha256'] and other_key not in approved: block={'assetKey':key,'otherMembership':other_key,'reason':'CROSS_GALLERY_SCOPE_DECISION_REQUIRED'};blockers.append(block)
 for eid,keys in groups.items():
  summary=next(e for e in index['events'] if e['id']==eid)
  if not summary.get('manifest'):blockers.append({'eventId':eid,'reason':'NONLOCAL_MANIFEST_REQUIRES_SEPARATE_INTEGRATION'});continue
  full=json.loads((repo/summary['manifest']).read_text())['events'][0];removed={assets[k]['assetId'] for k in keys};retained=[p for p in full['photos'] if p['id'] not in removed]
  if len(full['photos'])-len(retained)!=len(removed):raise ValueError('Approved asset not present in pinned event manifest')
  if not retained:blockers.append({'eventId':eid,'reason':'EMPTIED_PUBLIC_ALBUM_REQUIRES_EXPLICIT_WITHDRAWAL_PLAN'})
  parents=[p['id'] for p in index.get('parentEvents',[]) if eid in p['childEventIds']]
  removed_photos=[p for p in full['photos'] if p['id'] in removed]
  pending.append({'eventId':eid,'title':full['title'],'sourcePhotoCount':len(full['photos']),'expectedPhotoCount':len(retained),'removedMemberships':[{'assetKey':k,'assetId':assets[k]['assetId'],'sourceFilename':assets[k]['filenames'][0],'originalPath':assets[k]['originalPath'],'originalSha256':assets[k]['originalSha256'],'receiptId':approved[k]['receiptId']} for k in keys],'deniedPublicPaths':sorted({p[k] for p in removed_photos for k in ['thumbnail','display','download']}),'deniedPublicVariantSha256':sorted({sha(repo/p['display']) for p in removed_photos}),'searchTermsToRemove':sorted({p['caption'] for p in removed_photos}),'expectedOrderedZIPMembers':[{'filename':p['originalFilename'],'assetId':p['id'],'sha256':sha(repo/p['display'])} for p in retained],'packages':full.get('packages',[]),'affectedParentEvents':parents,'sourceEventDigest':digest(full)})
 count=sum(p['sourcePhotoCount']-p['expectedPhotoCount'] for p in pending)
 plan={'schemaVersion':1,'privateOnly':True,'type':'APPROVED_EVENTS_EXCLUSION_PLAN','sourceCommit':m['sourceCommit'],'reviewManifestDigest':m['manifestDigest'],'baselinePolicyDigest':digest(baseline),'baselineHoldsPreserved':[(h['eventId'],h['assetId']) for h in baseline_holds(baseline)],'ownerConfirmedExclusionCount':len(approved),'approvedPublicExclusionCount':count,'alreadyPrivateApproved':already_private,'events':pending,'blockers':blockers,'publicPhotoCountBefore':index['archivePublication']['photoCount'],'expectedPublicPhotoCount':index['archivePublication']['photoCount']-count,'readyForPrivateProjection':bool(count) and not blockers,'publicationAuthorized':False,'instructions':'Do not apply from a draft. Covers, cross-gallery scope and empty albums fail closed. Private originals/canonical policy/history are not rewritten. Parent ZIPs must be rebuilt with exact permitted child memberships; no old reachable packages or orphan derivatives may remain.'}
 plan['coverChanges']=list(covers.values());plan['planDigest']=digest(plan);return plan

def prepared_policy(repo,plan):
 """Version2 policy merges approved holds; this function never writes to the repository."""
 if not plan['readyForPrivateProjection']:raise ValueError('Private projection is blocked pending required decisions')
 repo=Path(repo);old=json.loads((repo/'scripts/events-public-exclusions.json').read_text());albums={}
 for hold in baseline_holds(old):
  eid=hold['eventId'];row=albums.setdefault(eid,{k:hold[k] for k in ['eventId','title','albumCoverId','packagePath','retainedPhotos']});row.setdefault('excludedAssets',[]).append({k:hold[k] for k in ['assetId','sourceFilename','knownPublicVariantSha256']})
  if hold.get('directoryCover'):row['directoryCover']=hold['directoryCover']
 for event in plan['events']:
  eid=event['eventId'];full=json.loads((repo/f'data/events/{eid}.json').read_text())['events'][0]
  if digest(full)!=event['sourceEventDigest']:raise ValueError('Source event changed after approval planning')
  row=albums.setdefault(eid,{'eventId':eid,'title':full['title'],'albumCoverId':full['coverId'],'packagePath':full['packages'][0]['url'],'excludedAssets':[]})
  for cover in plan.get('coverChanges',[]):
   if cover['eventId']!=eid:continue
   if cover['role']=='album':row['albumCoverId']=cover['newAssetId']
   else:
    photo=cover['newPhoto'];row['directoryCover']={'photoId':photo['id'],'sourceEventId':eid,'thumbnail':photo['thumbnail'],'width':photo['width'],'height':photo['height'],'sha256':cover['newPublicDisplaySha256']}
  row['retainedPhotos']=[{'id':p['assetId'],'filename':p['filename'],'frameNumber':next(x for x in full['photos'] if x['id']==p['assetId']).get('frameNumber'),'order':next(x for x in full['photos'] if x['id']==p['assetId'])['order'],'sha256':p['sha256']} for p in event['expectedOrderedZIPMembers']]
  for item in event['removedMemberships']:
   photo=next(x for x in full['photos'] if x['id']==item['assetId']);row['excludedAssets'].append({'assetId':item['assetId'],'sourceFilename':item['sourceFilename'],'knownPublicVariantSha256':[sha(repo/photo['display'])]})
 return {'schemaVersion':2,'scope':'Approved Events membership contracts; private records are never included. Baseline Halloween hold retained.','albums':list(albums.values())}

def write_private_projection(repo,case,destination):
 """Only approved, resolved membership changes; omit public derivatives while copying.

 No source/original deletion, repository edit, Git commit, push or publishing operation.
 """
 import subprocess,tarfile,zipfile,re
 repo=Path(repo).resolve();destination=Path(destination).resolve();case=Path(case).resolve()
 if destination.exists() or destination==repo or repo in destination.parents or destination in repo.parents:raise ValueError('Private projection needs a new directory outside the repository')
 plan=prepare_plan(repo,case)
 if not plan['readyForPrivateProjection']:raise ValueError('No approved public changes, or unresolved cover/scope/empty-album decisions')
 if subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=repo).strip():raise ValueError('Source must be committed and clean before projection')
 current=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
 affected=['data/events','our-polaroid-project/events','scripts/events-public-exclusions.json']
 if subprocess.check_output(['git','diff','--name-only',plan['sourceCommit'],current,'--',*affected],cwd=repo).strip():raise ValueError('Reviewed Events source changed; reconcile before projection')
 policy=prepared_policy(repo,plan);destination.mkdir(parents=True)
 index=json.loads((repo/'data/events/index.json').read_text());changed={e['eventId']:e for e in plan['events']};parents={p['id'] for event in plan['events'] for p in index.get('parentEvents',[]) if event['eventId'] in p['childEventIds']}
 denied={p for event in plan['events'] for p in event['deniedPublicPaths']}
 replace_zips={pkg['url'] for event in plan['events'] for pkg in event['packages']}|{f'our-polaroid-project/events/{p}/downloads/{p}.zip' for p in parents}
 archive=case/('projection-source-'+current[:12]+'.tar')
 with archive.open('wb') as f:subprocess.run(['git','archive','--format=tar',current],cwd=repo,stdout=f,check=True)
 with tarfile.open(archive) as t:
  members=[m for m in t.getmembers() if m.name not in denied|replace_zips and not m.name.startswith('.github/')]
  t.extractall(destination,members=members,filter='data')
 details={}
 directory=json.loads((repo/'data/events/portrait-covers.json').read_text()) if any(c['role']=='directory' for c in plan.get('coverChanges',[])) else None
 for cover in plan.get('coverChanges',[]):
  if cover['role']=='directory':
   photo=cover['newPhoto'];directory['covers'][cover['eventId']]={'photoId':photo['id'],'sourceEventId':cover['eventId'],'thumbnail':photo['thumbnail'],'width':photo['width'],'height':photo['height']}
 if directory is not None:(destination/'data/events/portrait-covers.json').write_text(json.dumps(directory,indent=2,ensure_ascii=False)+'\n')
 for summary in index['events']:
  if summary['id'] not in changed:continue
  eid=summary['id'];event=changed[eid];full=json.loads((repo/summary['manifest']).read_text())['events'][0];remove={p['assetId'] for p in event['removedMemberships']};full['photos']=[p for p in full['photos'] if p['id'] not in remove]
  project_summary_photos(summary,remove,plan.get('coverChanges',[]))
  for cover in plan.get('coverChanges',[]):
   if cover['eventId']==eid and cover['role']=='album':full['coverId']=summary['coverId']=cover['newAssetId']
  full['photoCount']=summary['photoCount']=len(full['photos']);terms=set(event['searchTermsToRemove'])|{x['sourceFilename'] for x in event['removedMemberships']}
  full['searchTerms']=[s for s in full['searchTerms'] if s not in terms];summary['searchTerms']=[s for s in summary['searchTerms'] if s not in terms]
  for pkg in full['packages']:
   target=destination/pkg['url'];target.parent.mkdir(parents=True,exist_ok=True)
   with zipfile.ZipFile(repo/pkg['url']) as source,zipfile.ZipFile(target,'w') as output:
    keep={x['filename']:x['sha256'] for x in event['expectedOrderedZIPMembers']}
    for member in source.infolist():
     if member.filename in keep:output.writestr(member,source.read(member.filename))
   with zipfile.ZipFile(target) as verify:
    if verify.testzip() is not None or verify.namelist()!=[p['filename'] for p in event['expectedOrderedZIPMembers']]:raise ValueError('Prepared ZIP member mismatch')
   pkg['bytes']=target.stat().st_size
  summary['packages']=full['packages'];details[eid]=full
  page=destination/f'our-polaroid-project/events/{eid}/index.html';text=page.read_text();text=text.replace(str(event['sourcePhotoCount'])+' photographs',str(event['expectedPhotoCount'])+' photographs');page.write_text(text)
 for parent in index.get('parentEvents',[]):
  if parent['id'] not in parents:continue
  children=[]
  for eid in parent['childEventIds']:
   summary=next(e for e in index['events'] if e['id']==eid);children.append(details.get(eid) or json.loads((repo/summary['manifest']).read_text())['events'][0])
  count=sum(len(e['photos']) for e in children);before=parent['photoCount'];parent['photoCount']=count;allowed={p['originalFilename'] for e in children for p in e['photos']};path=f"our-polaroid-project/events/{parent['id']}/downloads/{parent['id']}.zip";target=destination/path;target.parent.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(repo/path) as source,zipfile.ZipFile(target,'w') as output:
   for member in source.infolist():
    if Path(member.filename).name in allowed:output.writestr(member,source.read(member.filename))
  page=destination/f"our-polaroid-project/events/{parent['id']}/index.html";page.write_text(project_parent_html(page.read_text(),before,count))
 for eid,full in details.items():(destination/f'data/events/{eid}.json').write_text(json.dumps({'schemaVersion':1,'events':[full]},indent=2,ensure_ascii=False)+'\n')
 index['archivePublication']['photoCount']=sum(e.get('photoCount',len(e.get('photos',[]))) for e in index['events']);index['archivePublication']['publishedHistoricalPhotos']=sum(e['photoCount'] for e in index['events'] if e.get('archive'))
 (destination/'data/events/index.json').write_text(json.dumps(index,indent=2,ensure_ascii=False)+'\n');(destination/'scripts/events-public-exclusions.json').write_text(json.dumps(policy,indent=2)+'\n')
 node='node';program="import{pathToFileURL}from'node:url';import{readFileSync}from'node:fs';const m=await import(pathToFileURL(process.argv[2]));console.log(JSON.stringify(m.validateEventsPublicExclusions(process.argv[3],{policy:JSON.parse(readFileSync(process.argv[3]+'/scripts/events-public-exclusions.json'))})));"
 verified=subprocess.run([node,'--input-type=module','-e',program,'private-projection',str(repo/'scripts/events-public-exclusions.mjs'),str(destination)],capture_output=True,text=True)
 if verified.returncode:raise ValueError('Projection guard failed; output remains private for inspection: '+verified.stderr)
 return {'privateOnly':True,'destination':str(destination),'sourceCommit':current,'planDigest':plan['planDigest'],'guard':json.loads(verified.stdout),'publicationAuthorized':False}

if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--repo',required=True);p.add_argument('--case',required=True);p.add_argument('--stage');args=p.parse_args();plan=prepare_plan(args.repo,args.case);out=Path(args.case)/'approved-exclusion-plan.json';out.write_text(json.dumps(plan,indent=2)+'\n');print(json.dumps(write_private_projection(args.repo,args.case,args.stage) if args.stage else {'plan':str(out),'approvedPublicExclusions':plan['approvedPublicExclusionCount'],'ready':plan['readyForPrivateProjection'],'blockers':plan['blockers'],'publicationAuthorized':False}))
