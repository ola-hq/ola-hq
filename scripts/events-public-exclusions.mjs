// Events-only release guard. Private owner receipts and original paths stay outside this repository.
import {readFileSync,readdirSync,existsSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

export const readExclusionPolicy=()=>JSON.parse(readFileSync(new URL('./events-public-exclusions.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error('Events exclusion guard: '+message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function inside(root,name){
 if(typeof name!=='string'||name.includes('\\'))fail('invalid local path');
 const target=resolve(root,name),rel=relative(root,target);
 if(!rel||rel.startsWith('..'+sep)||rel==='..'||resolve(name)===name)fail('path leaves public root');
 return target;
}
function files(folder){
 if(!existsSync(folder))fail('missing folder '+folder);
 return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  const path=join(folder,entry.name);
  if(lstatSync(path).isSymbolicLink())fail('unexpected symbolic link');
  return entry.isDirectory()?files(path):[path];
 });
}
const zipCheck=String.raw`
import hashlib,json,sys,zipfile
from pathlib import Path
root=Path(sys.argv[1]);policy=json.load(sys.stdin);zip_count=0
for path in (root/'our-polaroid-project/events').rglob('*.zip'):
 with zipfile.ZipFile(path) as z:
  if z.testzip() is not None:raise ValueError('ZIP CRC failed: '+str(path))
  names=z.namelist()
  if len(names)!=len(set(names)):raise ValueError('Duplicate ZIP member: '+str(path))
  for name in names:
   if name.endswith('/'):continue
   digest=hashlib.sha256(z.read(name)).hexdigest()
   for hold in policy['holds']:
    if hold['assetId'].lower() in name.lower() or hold['sourceFilename'].lower() in name.lower() or digest in hold['knownPublicVariantSha256']:
     raise ValueError('Excluded image found in ZIP: '+str(path)+' :: '+name)
  for hold in policy['holds']:
   if path==root/hold['packagePath']:
    expected=hold['retainedPhotos']
    if names!=[p['filename'] for p in expected]:raise ValueError('Wrong Halloween ZIP membership/order')
    for photo in expected:
     if hashlib.sha256(z.read(photo['filename'])).hexdigest()!=photo['sha256']:raise ValueError('Changed retained ZIP image: '+photo['id'])
 zip_count+=1
print(json.dumps({'zipFiles':zip_count}))
`;

export function validateEventsPublicExclusions(root='.',{policy=readExclusionPolicy()}={}){
 root=resolve(root);
 if(policy?.schemaVersion!==1||!Array.isArray(policy.holds)||!policy.holds.length)fail('missing or empty approved exclusion policy');
 const seen=new Set();
 for(const hold of policy.holds){
  if(!/^event-[a-f0-9]+$/.test(hold.eventId)||!/^selected-[a-f0-9]+$/.test(hold.assetId)||seen.has(hold.assetId))fail('invalid or duplicate asset binding');
  seen.add(hold.assetId);
  if(hold.state!=='excluded'||!hold.title||!Array.isArray(hold.knownPublicVariantSha256)||!hold.knownPublicVariantSha256.length||!hold.knownPublicVariantSha256.every(s=>/^[a-f0-9]{64}$/.test(s)))fail('invalid exclusion rule');
  if(!Array.isArray(hold.retainedPhotos)||hold.retainedPhotos.length!==29||new Set(hold.retainedPhotos.map(p=>p.id)).size!==29||hold.retainedPhotos.some(p=>p.id===hold.assetId||!/^selected-[a-f0-9]+$/.test(p.id)||p.filename!==p.id+'.jpg'||!/^[a-f0-9]{64}$/.test(p.sha256)))fail('invalid retained photo contract');
  const prefix='our-polaroid-project/events/'+hold.eventId+'/';
  if(hold.packagePath!==prefix+'downloads/'+hold.eventId+'.zip')fail('invalid package path');
 }
 const index=JSON.parse(readFileSync(join(root,'data/events/index.json'),'utf8'));
 for(const hold of policy.holds){
  const summary=index.events.find(e=>e.id===hold.eventId);
  const detail=JSON.parse(readFileSync(join(root,'data/events',hold.eventId+'.json'),'utf8')).events;
  if(detail.length!==1||detail[0].id!==hold.eventId)fail('wrong album manifest');
  const event=detail[0],expected=hold.retainedPhotos;
  if(!summary)fail('missing Halloween summary');
  for(const row of [summary,event]){
   if(row.title!==hold.title||row.gallery?.heading!==hold.title||row.gallery?.coverLabel!==hold.title||row.photoCount!==expected.length)fail('Halloween title/count mismatch');
   if(row.coverId!==hold.albumCoverId)fail('saved album cover changed');
   if(row.packages?.length!==1||row.packages[0].url!==hold.packagePath||row.packages[0].bytes!==lstatSync(inside(root,hold.packagePath)).size)fail('ZIP metadata mismatch');
  }
  if(!equal(event.photos.map(p=>p.id),expected.map(p=>p.id)))fail('retained IDs/order mismatch');
  for(let i=0;i<expected.length;i++){
   const photo=event.photos[i],contract=expected[i];
   if(photo.frameNumber!==contract.frameNumber||photo.order!==contract.order||photo.originalFilename!==contract.filename)fail('frame/order/filename changed');
   for(const kind of ['thumbnail','display','download']){
    if(photo[kind]!==`our-polaroid-project/events/${hold.eventId}/photos/${contract.filename}`||hash(readFileSync(inside(root,photo[kind])))!==contract.sha256)fail('retained '+kind+' bytes/path changed: '+photo.id);
   }
  }
  const actual=files(join(root,'our-polaroid-project/events',hold.eventId,'photos')).map(p=>relative(join(root,'our-polaroid-project/events',hold.eventId,'photos'),p)).sort();
  if(!equal(actual,expected.map(p=>p.filename).sort()))fail('orphan or missing album media');
  const page=readFileSync(join(root,'our-polaroid-project/events',hold.eventId,'index.html'),'utf8');
  if(!page.includes('<title>'+hold.title+' · Our Polaroid Wave</title>')||!page.includes(hold.title+' · October 22, 2022 · 29 photographs.'))fail('album HTML title/description mismatch');
 }
 const totals=index.archivePublication;
 const photoCount=e=>e.photoCount??e.photos?.length??0;
 if(totals.photoCount!==index.events.reduce((n,e)=>n+photoCount(e),0)||totals.publishedHistoricalPhotos!==index.events.filter(e=>e.archive).reduce((n,e)=>n+photoCount(e),0))fail('collection totals disagree with membership');
 let checked=0;
 for(const path of [...files(join(root,'data/events')),...files(join(root,'our-polaroid-project/events'))]){
  const rel=relative(root,path),lower=rel.toLowerCase();
  for(const hold of policy.holds)if(lower.includes(hold.assetId.toLowerCase())||lower.includes(hold.sourceFilename.toLowerCase()))fail('excluded asset path: '+rel);
  if(/\.(json|html|js|css|svg|txt)$/i.test(path)){
   let text=readFileSync(path,'utf8');try{text=decodeURIComponent(text);}catch{}
   text=text.toLowerCase();
   for(const hold of policy.holds)if(text.includes(hold.assetId.toLowerCase())||text.includes(hold.sourceFilename.toLowerCase()))fail('excluded metadata/reference: '+rel);
  }else if(/\.(jpe?g|webp|png|avif|gif|bmp|tiff?)$/i.test(path)){
   const digest=hash(readFileSync(path));
   for(const hold of policy.holds)if(hold.knownPublicVariantSha256.includes(digest))fail('renamed excluded media: '+rel);
  }
  checked++;
 }
 const zips=JSON.parse(execFileSync('python3',['-c',zipCheck,root],{input:JSON.stringify(policy),encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:1024*1024}));
 return {status:'PASS',holds:policy.holds.length,checkedFiles:checked,...zips};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(validateEventsPublicExclusions(process.argv[2]||'.')));
