import unittest,tempfile,json,hashlib,zipfile,stat
from pathlib import Path
from matching import digest,sha,extract_zip,match_images
from review_core import ReviewStore
from projection import prepare_plan,prepared_policy,project_summary_photos,project_parent_html

class ReviewTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name);self.case=self.root/'case';self.repo=self.root/'repo';self.case.mkdir();(self.repo/'data/events').mkdir(parents=True);(self.repo/'scripts').mkdir()
  self.assets={}
  for key,aid in [('event-demo|selected-aa','selected-aa'),('event-demo|selected-bb','selected-bb')]:
   original=self.root/(aid+'.original');original.write_bytes(('synthetic-'+aid).encode());display=self.repo/f'our-polaroid-project/events/event-demo/photos/{aid}.jpg';display.parent.mkdir(parents=True,exist_ok=True);display.write_bytes(original.read_bytes())
   self.assets[key]={'eventId':'event-demo','assetId':aid,'originalPath':str(original),'originalSha256':sha(original),'public':True,'existingHold':False,'priorOmission':False,'coverReferences':[],'boundary':'EVENTS','filenames':[aid+'-source.jpg']}
  self.write('assets.json',self.assets);m={'batchId':'TEST_ONLY','sourceCommit':'test-source','assetsDigest':digest(self.assets),'rows':[{'assetKey':k} for k in self.assets],'summary':{}};m['manifestDigest']=digest(m);self.manifest=m;self.write('review-manifest.json',m);self.write('draft.json',{'revision':0,'manifestDigest':m['manifestDigest'],'choices':{k:'UNSURE' for k in self.assets}});self.store=ReviewStore(self.case)
  self.event={'id':'event-demo','title':'Demo','photoCount':2,'manifest':'data/events/event-demo.json','packages':[{'url':'our-polaroid-project/events/event-demo/downloads/event-demo.zip'}],'photos':[{'id':a['assetId'],'originalFilename':a['assetId']+'.jpg','caption':a['filenames'][0],'frameNumber':i+1,'order':i+1,'thumbnail':f"our-polaroid-project/events/event-demo/photos/{a['assetId']}.jpg",'display':f"our-polaroid-project/events/event-demo/photos/{a['assetId']}.jpg",'download':f"our-polaroid-project/events/event-demo/photos/{a['assetId']}.jpg"} for i,a in enumerate(self.assets.values())],'coverId':'selected-bb'}
  (self.repo/'data/events/index.json').write_text(json.dumps({'events':[self.event],'parentEvents':[],'archivePublication':{'photoCount':2}}));(self.repo/'data/events/event-demo.json').write_text(json.dumps({'events':[self.event]}));self.baseline={'eventId':'event-old','assetId':'selected-old','sourceFilename':'old.jpg','knownPublicVariantSha256':['f'*64],'title':'Old','albumCoverId':'selected-cover','packagePath':'old.zip','retainedPhotos':[{'id':'selected-cover'}]};(self.repo/'scripts/events-public-exclusions.json').write_text(json.dumps({'schemaVersion':1,'holds':[self.baseline]}))
 def write(self,name,d):(self.case/name).write_text(json.dumps(d))
 def bind_assets(self):
  self.write('assets.json',self.assets);m=self.manifest.copy();m.pop('manifestDigest');m['assetsDigest']=digest(self.assets);m['manifestDigest']=digest(m);self.manifest=m;self.write('review-manifest.json',m);d=self.store.load('draft.json');d['manifestDigest']=m['manifestDigest'];self.write('draft.json',d)
 def exclude_a(self):
  d=self.store.set_draft({'event-demo|selected-aa':'EXCLUDE'},0,self.manifest['manifestDigest']);return self.store.approve(['event-demo|selected-aa'],d['revision'],self.manifest['manifestDigest'],True)
 def test_draft_is_not_approval_and_explicit_owner_confirmation_is_required(self):
  self.store.set_draft({'event-demo|selected-aa':'EXCLUDE'},0,self.manifest['manifestDigest']);self.assertEqual(self.store.effective(),{})
  with self.assertRaises(ValueError):self.store.approve(['event-demo|selected-aa'],1,self.manifest['manifestDigest'],False)
  self.assertEqual(prepare_plan(self.repo,self.case)['approvedPublicExclusionCount'],0)
 def test_exact_approval_is_idempotent_and_private(self):
  first=self.exclude_a();second=self.store.approve(['event-demo|selected-aa'],1,self.manifest['manifestDigest'],True);self.assertEqual(first,second);self.assertEqual(len(self.store.records()),1);self.assertFalse(first['publicationAuthorized'])
 def test_stale_revision_unknown_id_and_unknown_choice_fail(self):
  for choices,rev in [({'wrong':'EXCLUDE'},0),({'event-demo|selected-aa':'PUBLISH'},0),({'event-demo|selected-aa':'KEEP'},10)]:
   with self.assertRaises(ValueError):self.store.set_draft(choices,rev,self.manifest['manifestDigest'])
 def test_changed_original_blocks_new_approval(self):
  d=self.store.set_draft({'event-demo|selected-aa':'EXCLUDE'},0,self.manifest['manifestDigest']);Path(self.assets['event-demo|selected-aa']['originalPath']).write_bytes(b'changed')
  with self.assertRaisesRegex(ValueError,'Original binding'):self.store.approve(['event-demo|selected-aa'],d['revision'],self.manifest['manifestDigest'],True)
 def test_restore_appends_history_and_keep_draft_cannot_restore(self):
  first=self.exclude_a();self.store.set_draft({'event-demo|selected-aa':'KEEP'},1,self.manifest['manifestDigest'])
  with self.assertRaisesRegex(ValueError,'Restore'):self.store.approve(['event-demo|selected-aa'],2,self.manifest['manifestDigest'],True)
  restored=self.store.approve(['event-demo|selected-aa'],2,self.manifest['manifestDigest'],True,restore=True);self.assertEqual(restored['selections'][0]['reversesReceiptId'],first['receiptId']);self.assertEqual(len(self.store.records()),2);self.assertEqual(self.store.effective()['event-demo|selected-aa']['choice'],'KEEP')
 def test_baseline_hold_cannot_be_restored_by_batch(self):
  self.assets['event-demo|selected-aa']['existingHold']=True;self.bind_assets();self.exclude_a()
  with self.assertRaisesRegex(ValueError,'baseline'):self.store.approve(['event-demo|selected-aa'],1,self.manifest['manifestDigest'],True,restore=True)
 def test_journal_tampering_fails_closed(self):
  self.exclude_a();p=self.case/'decisions.jsonl';p.write_text(p.read_text().replace('"EXCLUDE"','"KEEP"'))
  with self.assertRaisesRegex(ValueError,'integrity'):self.store.effective()
 def test_cross_album_import_preserves_saved_owner_choice_and_is_not_approval(self):
  self.exclude_a();result=self.store.import_candidates(['event-demo|selected-bb'],1,self.manifest['manifestDigest'],'Owner-authorized test candidate IDs');self.assertFalse(result['approved']);self.assertEqual(self.store.effective()['event-demo|selected-aa']['choice'],'EXCLUDE');self.assertEqual(len(self.store.records()),1)
  with self.assertRaises(ValueError):self.store.import_candidates(['https://example.test/x'],2,result['manifestDigest'],'test')
 def test_approved_plan_preserves_other_photo_and_existing_hold(self):
  self.exclude_a();plan=prepare_plan(self.repo,self.case);self.assertEqual(plan['approvedPublicExclusionCount'],1);self.assertEqual(plan['expectedPublicPhotoCount'],1);self.assertEqual(plan['events'][0]['expectedOrderedZIPMembers'][0]['assetId'],'selected-bb');policy=prepared_policy(self.repo,plan);self.assertEqual(policy['schemaVersion'],2);self.assertTrue(any(a['eventId']=='event-old' and a['excludedAssets'][0]['assetId']=='selected-old' for a in policy['albums']))
 def test_version_two_baseline_holds_survive_next_batch(self):
  old={k:self.baseline[k] for k in ['eventId','title','albumCoverId','packagePath','retainedPhotos']};old['excludedAssets']=[{k:self.baseline[k] for k in ['assetId','sourceFilename','knownPublicVariantSha256']}];(self.repo/'scripts/events-public-exclusions.json').write_text(json.dumps({'schemaVersion':2,'albums':[old]}));self.exclude_a();plan=prepare_plan(self.repo,self.case);self.assertIn(('event-old','selected-old'),plan['baselineHoldsPreserved']);policy=prepared_policy(self.repo,plan);self.assertEqual(policy['albums'][0]['excludedAssets'][0]['assetId'],'selected-old')
 def test_cover_scope_and_empty_album_fail_closed_without_deleting(self):
  self.assets['event-demo|selected-aa']['coverReferences']=[{'kind':'directory','eventId':'event-demo'}];self.bind_assets();self.exclude_a();plan=prepare_plan(self.repo,self.case);self.assertFalse(plan['readyForPrivateProjection']);self.assertTrue(any(x['reason'].startswith('EXPLICIT_RETAINED_COVER') for x in plan['blockers']));self.assertTrue(Path(self.assets['event-demo|selected-aa']['originalPath']).exists())
 def test_all_photos_selected_requires_an_explicit_withdrawal_plan(self):
  self.store.set_draft({k:'EXCLUDE' for k in self.assets},0,self.manifest['manifestDigest']);self.store.approve(list(self.assets),1,self.manifest['manifestDigest'],True);p=prepare_plan(self.repo,self.case);self.assertFalse(p['readyForPrivateProjection']);self.assertTrue(any(b['reason'].startswith('EMPTIED') for b in p['blockers']))
 def test_new_cross_album_candidate_import_preserves_previous_receipt(self):
  c='event-other|selected-cc';original=self.root/'third.original';original.write_bytes(b'third');self.assets[c]={**self.assets['event-demo|selected-bb'],'eventId':'event-other','assetId':'selected-cc','originalPath':str(original),'originalSha256':sha(original)};self.bind_assets();first=self.exclude_a();response=self.store.import_candidates([c],1,self.manifest['manifestDigest'],'Separately owner-authorized ID list');self.assertEqual(response['added'],[c]);self.assertEqual(self.store.load('draft.json')['choices'][c],'UNSURE');self.assertEqual(self.store.effective()['event-demo|selected-aa']['receiptId'],first['receiptId'])
 def test_a_hash_alias_does_not_authorize_another_gallery_membership(self):
  other={**self.assets['event-demo|selected-aa'],'eventId':'event-other','assetId':'selected-cc'};self.assets['event-other|selected-cc']=other;self.bind_assets();self.exclude_a();p=prepare_plan(self.repo,self.case);self.assertTrue(any(b['reason']=='CROSS_GALLERY_SCOPE_DECISION_REQUIRED' for b in p['blockers']));self.assertNotIn('event-other|selected-cc',self.store.effective())

 def test_reexclude_after_restore_appends_generation_and_retries_are_idempotent(self):
  first=self.exclude_a();key='event-demo|selected-aa';restored=self.store.approve([key],1,self.manifest['manifestDigest'],True,restore=True)
  self.assertEqual(self.store.approve([key],1,self.manifest['manifestDigest'],True,restore=True),restored)
  again=self.store.approve([key],1,self.manifest['manifestDigest'],True);self.assertNotEqual(again['receiptId'],first['receiptId']);self.assertEqual(self.store.effective()[key]['choice'],'EXCLUDE');self.assertEqual(len(self.store.records()),3)
  self.assertEqual(self.store.approve([key],1,self.manifest['manifestDigest'],True),again);self.assertEqual(len(self.store.records()),3)
  self.store.approve([key],1,self.manifest['manifestDigest'],True,restore=True);self.assertEqual(self.store.effective()[key]['choice'],'KEEP');self.assertEqual(len(self.store.records()),4)
 def test_rebound_original_cannot_inherit_old_receipt(self):
  self.exclude_a();key='event-demo|selected-aa';replacement=self.root/'replacement.original';replacement.write_bytes(b'synthetic replacement');self.assets[key]['originalPath']=str(replacement);self.assets[key]['originalSha256']=sha(replacement);self.bind_assets()
  with self.assertRaisesRegex(ValueError,'receipt asset binding'):prepare_plan(self.repo,self.case)
 def test_changed_source_cannot_inherit_old_receipt(self):
  self.exclude_a();self.manifest['sourceCommit']='another-source';self.bind_assets()
  with self.assertRaisesRegex(ValueError,'receipt source binding'):prepare_plan(self.repo,self.case)
 def test_unchanged_approved_binding_survives_candidate_import(self):
  first=self.exclude_a();self.store.import_candidates(['event-demo|selected-bb'],1,self.manifest['manifestDigest'],'Synthetic candidate import');plan=prepare_plan(self.repo,self.case);self.assertEqual(plan['approvedPublicExclusionCount'],1);self.assertEqual(plan['events'][0]['removedMemberships'][0]['receiptId'],first['receiptId'])
 def test_changed_bytes_after_approval_block_projection(self):
  self.exclude_a();Path(self.assets['event-demo|selected-aa']['originalPath']).write_bytes(b'changed after confirmation')
  with self.assertRaisesRegex(ValueError,'original bytes'):prepare_plan(self.repo,self.case)
 def test_review_hold_preserves_drafts_and_blocks_approval_and_plan(self):
  self.write('approval-hold.json',{'reason':'Independent tooling review'});self.store.set_draft({'event-demo|selected-aa':'EXCLUDE'},0,self.manifest['manifestDigest'])
  with self.assertRaisesRegex(ValueError,'on hold'):self.store.approve(['event-demo|selected-aa'],1,self.manifest['manifestDigest'],True)
  with self.assertRaisesRegex(ValueError,'on hold'):prepare_plan(self.repo,self.case)
  self.assertEqual(len(self.store.records()),0);self.assertEqual(self.store.load('draft.json')['choices']['event-demo|selected-aa'],'EXCLUDE')

 def cover_fixture(self):
  key='event-demo|selected-aa';self.assets[key]['coverReferences']=[{'kind':'coverId','eventId':'event-demo'}];self.bind_assets();self.event['coverId']='selected-aa'
  (self.repo/'data/events/index.json').write_text(json.dumps({'events':[self.event],'parentEvents':[],'archivePublication':{'photoCount':2}}));(self.repo/'data/events/event-demo.json').write_text(json.dumps({'events':[self.event]}));parent=self.exclude_a();new=self.assets['event-demo|selected-bb']
  decision={'schemaVersion':1,'type':'OWNER_CONFIRMED_PRIVATE_COVER_DECISIONS','privateOnly':True,'ownerConfirmed':True,'publicationAuthorized':False,'sourceCommit':self.manifest['sourceCommit'],'reviewManifestDigest':self.manifest['manifestDigest'],'assetsDigest':self.manifest['assetsDigest'],'parentDecisionReceiptId':parent['receiptId'],'parentDecisionRecordHash':parent['recordHash'],'selections':[{'eventId':'event-demo','role':'album','oldAssetId':'selected-aa','newAssetId':'selected-bb','newOriginalPath':new['originalPath'],'newOriginalSha256':new['originalSha256'],'newPublicDisplaySha256':sha(self.repo/self.event['photos'][1]['display']),'sourceEventDigest':digest(self.event),'ownerQuestionReply':{'question':'Synthetic private cover decision','answer':'Use retained B'}}]}
  self.save_cover_decision(decision);return decision
 def save_cover_decision(self,decision):
  decision.pop('receiptDigest',None);decision['receiptDigest']=digest(decision);self.write('cover-decisions.json',decision)
 def test_exact_owner_cover_receipt_resolves_only_approved_role(self):
  self.cover_fixture();plan=prepare_plan(self.repo,self.case);self.assertTrue(plan['readyForPrivateProjection']);self.assertEqual(plan['coverChanges'][0]['newAssetId'],'selected-bb');self.assertEqual(prepared_policy(self.repo,plan)['albums'][1]['albumCoverId'],'selected-bb');self.assertEqual(self.store.load('assets.json')['event-demo|selected-aa']['coverReferences'],[{'kind':'coverId','eventId':'event-demo'}])
 def test_unconfirmed_stale_extra_wrong_role_or_excluded_cover_receipts_fail(self):
  decision=self.cover_fixture()
  for change in ['unconfirmed','stale','extra','wrong-role','excluded','wrong-hash','wrong-parent','missing']:
   candidate=json.loads(json.dumps(decision));candidate.pop('receiptDigest',None)
   if change=='unconfirmed':candidate['ownerConfirmed']=False
   elif change=='stale':candidate['sourceCommit']='different-source'
   elif change=='extra':candidate['selections'].append(candidate['selections'][0].copy())
   elif change=='wrong-role':candidate['selections'][0]['role']='directory'
   elif change=='excluded':candidate['selections'][0]['newAssetId']='selected-aa'
   elif change=='wrong-hash':candidate['selections'][0]['newOriginalSha256']='0'*64
   elif change=='wrong-parent':candidate['parentDecisionRecordHash']='0'*64
   else:candidate['selections']=[]
   self.save_cover_decision(candidate)
   with self.subTest(change=change),self.assertRaises(ValueError):prepare_plan(self.repo,self.case)
 def test_cover_receipt_does_not_authorize_changed_replacement_bytes(self):
  self.cover_fixture();Path(self.assets['event-demo|selected-bb']['originalPath']).write_bytes(b'changed retained cover')
  with self.assertRaisesRegex(ValueError,'Cover replacement original/display'):prepare_plan(self.repo,self.case)

 def test_index_cover_preview_cannot_retain_an_excluded_cached_photo(self):
  decision=self.cover_fixture();plan=prepare_plan(self.repo,self.case);summary=json.loads(json.dumps(self.event));project_summary_photos(summary,{'selected-aa'},plan['coverChanges']);self.assertEqual([p['id'] for p in summary['photos']],['selected-bb']);self.assertEqual(summary['photos'][0],self.event['photos'][1])
  summary=json.loads(json.dumps(self.event));project_summary_photos(summary,{'selected-aa'},[]);self.assertEqual([p['id'] for p in summary['photos']],['selected-bb'])

 def test_parent_download_count_and_metadata_follow_final_membership(self):
  text='<meta name="description" content="292 photographs"><a href="downloads/same.zip">Download published days ZIP · 292 JPEGs</a>'
  result=project_parent_html(text,292,279);self.assertIn('279 photographs',result);self.assertIn('279 JPEGs',result);self.assertIn('downloads/same.zip',result);self.assertNotIn('292',result)

class MatchingTests(unittest.TestCase):
 def setUp(self):self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
 def test_zip_traversal_symlink_and_case_collisions_refused(self):
  for index,names in enumerate([['../escape.jpg'],['A.jpg','a.JPG'],['a/../../escape.jpg']]):
   p=self.root/(str(index)+'.zip')
   with zipfile.ZipFile(p,'w') as z:
    for name in names:z.writestr(name,b'bytes')
   with self.assertRaises(ValueError):extract_zip(p,self.root/('out'+str(index)))
  p=self.root/'link.zip'
  with zipfile.ZipFile(p,'w') as z:i=zipfile.ZipInfo('link');i.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(i,'/tmp')
  with self.assertRaises(ValueError):extract_zip(p,self.root/'links')
 def test_zip_validates_crc_preserves_input_and_groups_exact_bytes(self):
  p=self.root/'ok.zip'
  with zipfile.ZipFile(p,'w') as z:z.writestr('one.jpg',b'same');z.writestr('two.jpg',b'same')
  initial=sha(p);record=extract_zip(p,self.root/'out');self.assertEqual(sha(p),initial);self.assertEqual(record['files'][0]['sha256'],record['files'][1]['sha256']);self.assertEqual(record['CRC'],'PASS')
 def test_rotated_resized_recompressed_whole_image_is_candidate_not_approval(self):
  from PIL import Image,ImageDraw
  im=Image.new('RGB',(260,420),'white');d=ImageDraw.Draw(im);d.rectangle((20,25,239,340),fill='#264c73');d.ellipse((40,70,170,220),fill='#e2a32b');d.rectangle((130,210,215,315),fill='#c43b61');src=self.root/'source.png';im.save(src);query=self.root/'renamed.jpg';im.resize((390,630)).rotate(90,expand=True).save(query,quality=85)
  key='event-test|selected-aa';assets={key:{'previewPath':str(src),'filenames':['source.png'],'knownHashes':[sha(src)],'originalSha256':sha(src)}};result=match_images([{'name':'renamed.jpg','path':str(query),'sha256':sha(query)}],assets)[0];self.assertEqual(result['status'],'NEEDS_JON_REVIEW');self.assertEqual(result['candidates'][0]['assetKey'],key);self.assertFalse(result['candidates'][0]['verifiedDuplicate'])
 def test_exact_file_match_across_memberships_is_grouped_without_identity_inference(self):
  from PIL import Image
  p=self.root/'source.png';Image.new('RGB',(100,140),'navy').save(p);h=sha(p);assets={k:{'previewPath':str(p),'filenames':['source.png'],'knownHashes':[h] if i==0 else [],'originalSha256':h} for i,k in enumerate(['event-a|selected-a','event-b|selected-b'])};r=match_images([{'name':'renamed.png','path':str(p),'sha256':h}],assets)[0];self.assertEqual(r['status'],'VERIFIED_FILE_MATCH');self.assertEqual(len(r['candidates']),2);self.assertTrue(all(c['verifiedDuplicate'] for c in r['candidates']))
 def test_all_decoded_pixel_matches_bypass_perceptual_shortlist_limit(self):
  from PIL import Image,ImageDraw,PngImagePlugin
  image=Image.new('RGB',(80,120),'#143e59');draw=ImageDraw.Draw(image);draw.rectangle((4,8,41,91),fill='#e48a24');draw.ellipse((33,29,72,107),fill='#24c49a')
  def save(name,label):
   p=self.root/name;meta=PngImagePlugin.PngInfo();meta.add_text('encoding',label);image.save(p,pnginfo=meta);return p
  q=save('renamed-input.png','query');assets={}
  for i in range(13):
   p=save('archive-'+str(i)+'.png','encoding-'+str(i));assets['event-'+str(i)+'|asset-'+str(i)]={'previewPath':str(p),'filenames':[p.name],'knownHashes':[sha(p)],'originalSha256':sha(p)}
  row=match_images([{'name':q.name,'path':str(q),'sha256':sha(q)}],assets)[0];self.assertEqual(len(row['candidates']),13);self.assertTrue(all(c['verifiedDuplicate'] and c['method']=='EXACT_DECODED_PIXELS' for c in row['candidates']))
if __name__=='__main__':unittest.main(verbosity=2)
