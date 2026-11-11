"""Local whole-image matching. No face detection, embeddings, identity or network calls."""
from pathlib import Path, PurePosixPath
import hashlib,json,re,stat,zipfile,shutil,unicodedata

def sha(path):
 h=hashlib.sha256()
 with Path(path).open('rb') as stream:
  for block in iter(lambda:stream.read(1024*1024),b''):h.update(block)
 return h.hexdigest()

def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def digest(value):return hashlib.sha256(canonical(value)).hexdigest()
def name_key(value):return re.sub(r'\s*\(\d+\)(?=\.[^.]+$)','',Path(value).name).casefold()

def extract_zip(source,destination):
 """Validate the complete directory before writing; preserve names and original ZIP."""
 source=Path(source);destination=Path(destination)
 if destination.exists() and any(destination.iterdir()):raise ValueError('Extraction destination must be new/empty')
 with zipfile.ZipFile(source) as archive:
  entries=archive.infolist();seen=set();total=0
  if len(entries)>10000:raise ValueError('Too many ZIP entries')
  for entry in entries:
   name=entry.filename;p=PurePosixPath(name)
   if not name or '\\' in name or p.is_absolute() or '..' in p.parts or ':' in p.parts[0] or '\x00' in name:raise ValueError('Unsafe ZIP path')
   if stat.S_ISLNK(entry.external_attr>>16) or entry.flag_bits&1:raise ValueError('Symlink/encrypted ZIP entry refused')
   folded=unicodedata.normalize('NFC','/'.join(p.parts)).casefold()
   if folded in seen:raise ValueError('Colliding ZIP paths')
   seen.add(folded);total+=entry.file_size
   if entry.file_size>2*1024**3 or total>8*1024**3 or entry.file_size>max(1,entry.compress_size)*2000:raise ValueError('ZIP expansion limit exceeded')
  destination.parent.mkdir(parents=True,exist_ok=True)
  if shutil.disk_usage(destination.parent).free<total+100*1024**2:raise ValueError('Insufficient free disk space')
  destination.mkdir(exist_ok=True);records=[]
  for entry in entries:
   target=destination.joinpath(*PurePosixPath(entry.filename).parts)
   if entry.is_dir():target.mkdir(parents=True,exist_ok=True);continue
   target.parent.mkdir(parents=True,exist_ok=True)
   with archive.open(entry) as src,target.open('xb') as dst:shutil.copyfileobj(src,dst,1024*1024)
   records.append({'name':entry.filename,'path':str(target),'bytes':entry.file_size,'sha256':sha(target)})
  # zipfile checks each member CRC during the complete read above.
 return {'zip':str(source),'zipSha256':sha(source),'zipBytes':source.stat().st_size,'memberCount':len(entries),'uncompressedBytes':total,'CRC':'PASS','files':records}

def image_features(path):
 import numpy as np
 from PIL import Image,ImageOps
 with Image.open(path) as opened:
  image=ImageOps.exif_transpose(opened).convert('RGB')
  width,height=image.size;exif=opened.getexif()
  metadata={'width':width,'height':height,'format':opened.format,'dateTimeOriginal':exif.get(36867),'dateTime':exif.get(306)}
  # Pixel hash uses actual decoded dimensions, not a resize: only lossless equivalents group automatically.
  pixels=hashlib.sha256(f'{width}x{height}:RGB:'.encode()+image.tobytes()).hexdigest()
  base=image.copy();base.thumbnail((384,384))
  # Compare the complete photographic rectangle rather than matching white paper margins.
  # This is global border geometry; no face/person detector or semantic region is used.
  array=np.asarray(base,dtype=np.float32);bh,bw=array.shape[:2]
  corners=[array[:max(2,bh//25),:max(2,bw//25)],array[:max(2,bh//25),-max(2,bw//25):],array[-max(2,bh//25):,:max(2,bw//25)],array[-max(2,bh//25):,-max(2,bw//25):]]
  if all(float(c.mean())>225 for c in corners):
   ink=array.mean(axis=2)<222;ys=np.where(ink.mean(axis=1)>.35)[0];xs=np.where(ink.mean(axis=0)>.35)[0]
   if len(xs) and len(ys):
    box=(int(xs[0]),int(ys[0]),int(xs[-1])+1,int(ys[-1])+1)
    if (box[2]-box[0])*(box[3]-box[1])>=bw*bh*.45:base=base.crop(box);metadata['paperTrimBox']=box
  k=np.arange(8)[:,None];n=np.arange(32)[None,:];cos=np.cos(np.pi*(2*n+1)*k/64)
  signatures=[]
  for turns in range(4):
   rotated=base.rotate(90*turns,expand=True)
   for crop in [0,.06,.12]:
    w,h=rotated.size;view=rotated.crop((int(w*crop),int(h*crop),int(w*(1-crop)),int(h*(1-crop))))
    grey=np.asarray(view.convert('L').resize((32,32),Image.Resampling.LANCZOS),dtype=np.float32)
    freq=cos@grey@cos.T;bits=freq>np.median(freq.flatten()[1:]);bits[0,0]=False
    phash=int(''.join('1' if b else '0' for b in bits.flatten()),2)
    rgb=np.asarray(view.resize((24,24),Image.Resampling.BILINEAR),dtype=np.float32)/255
    flat=rgb.mean(axis=2).flatten();flat=(flat-flat.mean())/(flat.std()+1e-6)
    signatures.append({'rotationCCW':turns*90,'borderCrop':crop,'phash':phash,'grey':flat.astype(np.float32),'rgb':rgb.astype(np.float32)})
 return {'metadata':metadata,'pixelSha256':pixels,'signatures':signatures}

def match_images(queries,assets,progress=None):
 """Return ranked whole-image candidates; confidence never creates approval."""
 import numpy as np
 by_hash={};by_name={};by_pixel={};features={};flat=[]
 for key,asset in assets.items():
  for h in asset.get('knownHashes',[]):by_hash.setdefault(h,set()).add(key)
  for name in asset.get('filenames',[]):by_name.setdefault(name_key(name),set()).add(key)
  path=Path(asset['previewPath'])
  try:
   f=image_features(path);features[key]=f;by_pixel.setdefault(f['pixelSha256'],set()).add(key)
   for s in f['signatures']:flat.append((key,s))
  except Exception as error:asset['featureError']=type(error).__name__+': '+str(error)
  if progress and len(features)%300==0:progress('archive features: '+str(len(features)))
 results=[]
 for qi,query in enumerate(queries):
  exact=by_hash.get(query['sha256'],set());names=by_name.get(name_key(query['name']),set())
  original_hashes={assets[k].get('originalSha256') for k in exact if assets[k].get('originalSha256')}
  exact=exact|{k for k,a in assets.items() if a.get('originalSha256') in original_hashes}
  try:qf=image_features(query['path'])
  except Exception as error:
   results.append({'input':query,'status':'UNREADABLE_IMAGE','error':str(error),'candidates':[]});continue
  # Rotate/crop only the complete frame at fixed borders, never isolate faces or infer identity.
  best={}
  for key,s in flat:
   minimum=65;chosen=None
   # Archive variants already include the four orientations; query only needs its three border views.
   for q in qf['signatures'][:3]:
    distance=(q['phash']^s['phash']).bit_count()
    if distance<minimum:minimum=distance;chosen=q
   if key not in best or minimum<best[key][0]:best[key]=(minimum,chosen,s)
  shortlist=set(sorted(best,key=lambda key:best[key][0])[:12])|exact|names|by_pixel.get(qf['pixelSha256'],set())
  scored=[]
  for key in shortlist:
   if key not in best:continue
   dist,q,s=best[key];corr=float(np.mean(q['grey']*s['grey']));mad=float(np.mean(np.abs(q['rgb']-s['rgb'])))
   decoded_equal=qf['pixelSha256']==features[key]['pixelSha256']
   method='EXACT_SHA256' if key in exact else 'EXACT_DECODED_PIXELS' if decoded_equal else 'VERY_CLOSE_WHOLE_IMAGE' if dist<=4 and corr>=.94 and mad<=.10 else 'FILENAME_AND_VISUAL' if key in names and dist<=14 and corr>=.68 else 'NEEDS_JON_REVIEW'
   score=(0 if key in exact else 1 if decoded_equal else 2 if method=='VERY_CLOSE_WHOLE_IMAGE' else 3 if method=='FILENAME_AND_VISUAL' else 4,dist,-corr,mad)
   scored.append((score,{'assetKey':key,'method':method,'phashDistance':dist,'wholeImageCorrelation':round(corr,5),'meanColorDifference':round(mad,5),'filenameMatch':key in names,'suggestedDisplayRotationCCW':s['rotationCCW'],'borderComparisonFraction':s['borderCrop'],'verifiedDuplicate':key in exact or decoded_equal}))
  scored.sort(key=lambda item:item[0]);verified=[c for _,c in scored if c['verifiedDuplicate']]
  near=[{**c,'method':'PERCEPTUAL_NEAR_MATCH_NEEDS_JON_REVIEW'} for _,c in scored if not c['verifiedDuplicate'] and c['phashDistance']<=6 and c['wholeImageCorrelation']>=.96 and c['meanColorDifference']<=.08][:4]
  chosen=verified or near
  results.append({'input':query,'metadata':qf['metadata'],'pixelSha256':qf['pixelSha256'],'status':'VERIFIED_FILE_MATCH' if verified else 'NEEDS_JON_REVIEW' if chosen else 'UNMATCHED','candidates':chosen,'nearestEvidenceNotApproved':[c for _,c in scored[:4]]})
  if progress and (qi+1)%20==0:progress('input matching: '+str(qi+1)+'/'+str(len(queries)))
 return results
