import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readExclusionPolicy,validateEventsPublicExclusions as validatePublic,normalizeExclusionPolicy} from './events-public-exclusions.mjs';
const source=fileURLToPath(new URL('../',import.meta.url)),policy=normalizeExclusionPolicy(readExclusionPolicy()),hold=policy.holds[0];
const album='our-polaroid-project/events/'+hold.eventId+'/';
// Fixtures isolate Halloween; the actual-source check enforces EVERY active membership.
const fixturePolicy={schemaVersion:1,holds:[hold]};
const validateEventsPublicExclusions=(root,options={})=>validatePublic(root,{policy:root===source?policy:fixturePolicy,...options});
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'events-exclusion-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const name of ['data/events/index.json','data/events/'+hold.eventId+'.json',album]){
  mkdirSync(dirname(join(root,name)),{recursive:true});cpSync(join(source,name),join(root,name),{recursive:true});
 }
 return root;
}
const update=(root,name,fn)=>{const p=join(root,name),data=JSON.parse(readFileSync(p));fn(data);writeFileSync(p,JSON.stringify(data));};
test('actual candidate retains exact29 images and rejects the held asset across all Events media and ZIPs',()=>{
 const r=validateEventsPublicExclusions(source);assert.equal(r.status,'PASS');assert.equal(r.holds,policy.holds.length);assert(r.zipFiles>0);
});
test('missing/empty/malformed policy fails closed',t=>{
 const root=fixture(t);
 for(const p of [{},{schemaVersion:1,holds:[]},{schemaVersion:1,holds:[{...hold,state:'draft'}]},{schemaVersion:1,holds:[hold,hold]}])assert.throws(()=>validateEventsPublicExclusions(root,{policy:p}),/guard/);
});
test('a regenerated30-photo manifest cannot restore the excluded ID',t=>{
 const root=fixture(t);update(root,'data/events/'+hold.eventId+'.json',d=>{d.events[0].photos.splice(9,0,{...d.events[0].photos[0],id:hold.assetId});});
 assert.throws(()=>validateEventsPublicExclusions(root),/retained IDs\/order/);
});
test('a missing-frame renumber or changed retained JPEG fails preservation',t=>{
 const root=fixture(t),name='data/events/'+hold.eventId+'.json';
 const original=readFileSync(join(root,name));
 update(root,name,d=>{d.events[0].photos[9].frameNumber=10;});
 assert.throws(()=>validateEventsPublicExclusions(root),/frame\/order/);
 writeFileSync(join(root,name),original);writeFileSync(join(root,album+'photos/'+hold.retainedPhotos[0].filename),'changed');
 assert.throws(()=>validateEventsPublicExclusions(root),/retained thumbnail bytes/);
});
test('a stale searchable filename and old display title are rejected',t=>{
 const root=fixture(t),name='data/events/index.json',original=readFileSync(join(root,name));
 update(root,name,d=>d.events.find(e=>e.id===hold.eventId).searchTerms.push(hold.sourceFilename));
 assert.throws(()=>validateEventsPublicExclusions(root),/excluded metadata/);
 writeFileSync(join(root,name),original);update(root,name,d=>{d.events.find(e=>e.id===hold.eventId).title='Old title';});
 assert.throws(()=>validateEventsPublicExclusions(root),/title\/count/);
});
test('orphan direct JPEG and a renamed known-byte variant cannot resurface',t=>{
 const root=fixture(t),path=join(root,album+'photos/'+hold.assetId+'.jpg');writeFileSync(path,'stale');
 assert.throws(()=>validateEventsPublicExclusions(root),/orphan/);rmSync(path);
 const bytes=Buffer.from('synthetic denied bytes; no excluded photo fixture is stored');
 const p=structuredClone(fixturePolicy);p.holds[0].knownPublicVariantSha256.push(hash(bytes));
 writeFileSync(join(root,'our-polaroid-project/events/renamed.jpg'),bytes);
 assert.throws(()=>validateEventsPublicExclusions(root,{policy:p}),/renamed excluded media/);
});
test('an obsolete ZIP under another name is scanned for denied variant bytes',t=>{
 const root=fixture(t),p=structuredClone(fixturePolicy),body='synthetic forbidden ZIP image';p.holds[0].knownPublicVariantSha256.push(hash(body));
 execFileSync('python3',['-c','import sys,zipfile;z=zipfile.ZipFile(sys.argv[1],"w");z.writestr("renamed.jpg",sys.argv[2]);z.close()',join(root,'our-polaroid-project/events/obsolete.zip'),body]);
 assert.throws(()=>validateEventsPublicExclusions(root,{policy:p}),/ZIP|zip/i);
});
test('a29-member ZIP with changed retained bytes fails its frozen contract',t=>{
 const root=fixture(t),p=join(root,hold.packagePath);
 execFileSync('python3',['-c','import sys,zipfile;from pathlib import Path;p=Path(sys.argv[1]);z=zipfile.ZipFile(p);rows=[(i,z.read(i.filename)) for i in z.infolist()];z.close();z=zipfile.ZipFile(p,"w");[z.writestr(i,b"changed" if n==0 else b) for n,(i,b) in enumerate(rows)];z.close()',p]);
 for(const name of ['data/events/index.json','data/events/'+hold.eventId+'.json'])update(root,name,d=>{d.events.find(e=>e.id===hold.eventId).packages[0].bytes=readFileSync(p).length;});
 assert.throws(()=>validateEventsPublicExclusions(root),/ZIP|zip/i);
});
test('normal build validates both tracked source and exported artifact without changing workflows',()=>{
 const build=readFileSync(join(source,'scripts/build-public-site.mjs'),'utf8');
 assert(build.includes("validateEventsPublicExclusions('.')"));assert(build.includes('validateEventsPublicExclusions(output)'));
 assert.equal(hold.retainedPhotos.length,29);assert(!hold.retainedPhotos.some(p=>p.id===hold.assetId));
});
test('version2 album contract preserves original Halloween hold and rejects an empty policy',()=>{
 const album={eventId:hold.eventId,title:hold.title,albumCoverId:hold.albumCoverId,packagePath:hold.packagePath,retainedPhotos:hold.retainedPhotos,excludedAssets:[{assetId:hold.assetId,sourceFilename:hold.sourceFilename,knownPublicVariantSha256:hold.knownPublicVariantSha256}]};
 assert.deepEqual(normalizeExclusionPolicy({schemaVersion:2,albums:[album]}).holds.map(h=>h.assetId),[hold.assetId]);
 assert.throws(()=>normalizeExclusionPolicy({schemaVersion:2,albums:[{...album,excludedAssets:[]}]}),/empty/);
});
test('version2 enforces multiple holds in an album and exact retained28 ZIP/media contract',t=>{
 const root=fixture(t),removed=hold.retainedPhotos[1],keep=hold.retainedPhotos.filter(p=>p.id!==removed.id),zip=join(root,hold.packagePath);
 execFileSync('python3',['-c','import sys,zipfile;from pathlib import Path;p=Path(sys.argv[1]);z=zipfile.ZipFile(p);rows=[(i,z.read(i.filename)) for i in z.infolist() if i.filename!=sys.argv[2]];z.close();z=zipfile.ZipFile(p,"w");[z.writestr(i,b) for i,b in rows];z.close()',zip,removed.filename]);
 for(const name of ['data/events/index.json','data/events/'+hold.eventId+'.json'])update(root,name,d=>{const event=d.events.find(e=>e.id===hold.eventId);event.photoCount=28;event.packages[0].bytes=readFileSync(zip).length;if(name.includes('index')){d.archivePublication.photoCount--;d.archivePublication.publishedHistoricalPhotos--;}else event.photos=event.photos.filter(p=>p.id!==removed.id);});
 rmSync(join(root,album+'photos/'+removed.filename));const page=join(root,album+'index.html');writeFileSync(page,readFileSync(page,'utf8').replace('29 photographs','28 photographs'));
 const p={schemaVersion:2,albums:[{eventId:hold.eventId,title:hold.title,albumCoverId:hold.albumCoverId,packagePath:hold.packagePath,retainedPhotos:keep,excludedAssets:[{assetId:hold.assetId,sourceFilename:hold.sourceFilename,knownPublicVariantSha256:hold.knownPublicVariantSha256},{assetId:removed.id,sourceFilename:'new-confirmed.jpg',knownPublicVariantSha256:[removed.sha256]}]}]};
 assert.equal(validateEventsPublicExclusions(root,{policy:p}).holds,2);
 writeFileSync(join(root,'our-polaroid-project/events/renamed-restoration.jpg'),readFileSync(join(source,album+'photos/'+removed.filename)));
 assert.throws(()=>validateEventsPublicExclusions(root,{policy:p}),/renamed excluded media/);
});

test('same excluded asset ID is valid in two explicit album memberships; duplicate membership fails',t=>{
 const root=fixture(t),eid='event-synthetic-alias',newAlbum='our-polaroid-project/events/'+eid+'/';
 cpSync(join(root,album),join(root,newAlbum),{recursive:true});
 const oldZip=join(root,newAlbum+'downloads/'+hold.eventId+'.zip'),newZip=join(root,newAlbum+'downloads/'+eid+'.zip');
 writeFileSync(newZip,readFileSync(oldZip));rmSync(oldZip);
 const originalDetail=JSON.parse(readFileSync(join(root,'data/events/'+hold.eventId+'.json')));
 const detail=JSON.parse(JSON.stringify(originalDetail).replaceAll(album,newAlbum));detail.events[0].id=eid;
 detail.events[0].packages[0].url=newAlbum+'downloads/'+eid+'.zip';
 writeFileSync(join(root,'data/events/'+eid+'.json'),JSON.stringify(detail));
 update(root,'data/events/index.json',d=>{const original=d.events.find(e=>e.id===hold.eventId);const added=JSON.parse(JSON.stringify(original).replaceAll(album,newAlbum));added.id=eid;added.manifest='data/events/'+eid+'.json';added.packages[0].url=newAlbum+'downloads/'+eid+'.zip';d.events.push(added);d.archivePublication.photoCount+=29;d.archivePublication.publishedHistoricalPhotos+=29;});
 const contract={eventId:hold.eventId,title:hold.title,albumCoverId:hold.albumCoverId,packagePath:hold.packagePath,retainedPhotos:hold.retainedPhotos,excludedAssets:[{assetId:hold.assetId,sourceFilename:hold.sourceFilename,knownPublicVariantSha256:hold.knownPublicVariantSha256}]};
 const p={schemaVersion:2,albums:[contract,{...contract,eventId:eid,packagePath:newAlbum+'downloads/'+eid+'.zip'}]};
 assert.equal(validateEventsPublicExclusions(root,{policy:p}).holds,2);
 p.albums[1].excludedAssets.push(p.albums[1].excludedAssets[0]);assert.throws(()=>validateEventsPublicExclusions(root,{policy:p}),/duplicate asset binding/);
});

test('approved replacement directory cover is frozen to the retained membership and bytes',t=>{
 const root=fixture(t),photo=hold.retainedPhotos[0];
 const contract={photoId:photo.id,sourceEventId:hold.eventId,thumbnail:album+'photos/'+photo.filename,width:414,height:672};
 writeFileSync(join(root,'data/events/portrait-covers.json'),JSON.stringify({covers:{[hold.eventId]:contract}}));
 const p={schemaVersion:1,holds:[{...hold,directoryCover:{...contract,sha256:photo.sha256}}]};
 assert.equal(validateEventsPublicExclusions(root,{policy:p}).holds,1);
 update(root,'data/events/portrait-covers.json',d=>{d.covers[hold.eventId].photoId=hold.retainedPhotos[1].id;});
 assert.throws(()=>validateEventsPublicExclusions(root,{policy:p}),/directory cover changed/);
});
