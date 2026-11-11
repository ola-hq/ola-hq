"""Loopback-only private review. Never publishes or edits an original/public repository."""
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit,unquote
import argparse,json,secrets,threading
from review_core import ReviewStore

def serve(case,port=8388):
 store=ReviewStore(case);token=secrets.token_urlsafe(32);base=f'http://127.0.0.1:{port}';html=Path(__file__).with_name('review.html').read_bytes()
 class Handler(BaseHTTPRequestHandler):
  def send(self,status,data,kind='application/json'):
   if isinstance(data,dict):data=json.dumps(data,ensure_ascii=False).encode()
   self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");self.end_headers();self.wfile.write(data)
  def host_ok(self):return self.headers.get('Host')==f'127.0.0.1:{port}'
  def do_GET(self):
   if not self.host_ok():return self.send(403,{'error':'Host refused'})
   path=urlsplit(self.path).path
   if path=='/':return self.send(200,html,'text/html; charset=utf-8')
   try:
    if path=='/api/state':
     if not (store.case/'review-manifest.json').exists():return self.send(200,{'waitingForInput':True,'message':'Private matching is not complete yet. No approval controls are active.','token':token})
     manifest=store.manifest();assets=store.load('assets.json');matches=store.load('matches.json');rows=[]
     for row in manifest['rows']:
      a=assets[row['assetKey']];safe={k:a.get(k) for k in ['key','eventId','assetId','album','filenames','frameNumber','position','public','existingHold','priorOmission','coverReferences','websiteURL','previewKind','boundary']};rows.append({**safe,**row})
     inputs=[{'id':m['input']['inputGroupId'],'names':m['input']['duplicateInputs'],'status':m['status'],'candidates':m['candidates']} for m in matches]
     for m in inputs:
      for c in m['candidates']:c.pop('preview',None)
     return self.send(200,{'token':token,'summary':manifest['summary'],'manifestDigest':manifest['manifestDigest'],'batchId':manifest['batchId'],'rows':rows,'inputs':inputs,'draft':store.load('draft.json'),'approved':store.effective(),'publicationAuthorized':False,'approvalHold':store.load('approval-hold.json') if (store.case/'approval-hold.json').exists() else None})
    if path.startswith('/media/'):
     kind,key=path[len('/media/'):].split('/',1);key=unquote(key);matches=store.load('matches.json');file=None
     if kind=='input':file=next((m.get('inputPreview') for m in matches if m['input']['inputGroupId']==key),None)
     elif kind=='asset':
      allowed={r['assetKey'] for r in store.manifest()['rows']}
      if key in allowed:
       file=next((c.get('preview') for m in matches for c in m['candidates'] if c['assetKey']==key and c.get('preview')),None)
       if not file:
        from PIL import Image,ImageOps
        from matching import digest
        asset=store.load('assets.json')[key];target=store.case/'previews'/('asset-'+digest(key)[:20]+'.jpg')
        if not target.exists():
         with Image.open(asset['previewPath']) as opened:im=ImageOps.exif_transpose(opened).convert('RGB');im.thumbnail((500,500));im.save(target,'JPEG',quality=86)
        file=str(target)
     if not file:return self.send(404,{'error':'Unknown review image'})
     p=Path(file).resolve();p.relative_to((store.case/'previews').resolve())
     return self.send(200,p.read_bytes(),'image/jpeg')
    return self.send(404,{'error':'Not found'})
   except (ValueError,KeyError,FileNotFoundError,StopIteration) as error:return self.send(409,{'error':str(error)})
  def do_POST(self):
   if not self.host_ok() or self.headers.get('Origin')!=base or not secrets.compare_digest(self.headers.get('X-Review-Token',''),token):return self.send(403,{'error':'Same-origin owner session required'})
   if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.send(415,{'error':'JSON required'})
   try:
    size=int(self.headers.get('Content-Length','0'))
    if size<=0 or size>1024*1024:raise ValueError('Invalid request size')
    data=json.loads(self.rfile.read(size));path=urlsplit(self.path).path
    if path=='/api/draft':result=store.set_draft(data['choices'],data['revision'],data['manifestDigest'])
    elif path=='/api/import-candidates':result=store.import_candidates(data['keys'],data['revision'],data['manifestDigest'],data['provenance'])
    elif path=='/api/plan':
     from projection import prepare_plan
     result=prepare_plan(Path(__file__).resolve().parents[2],store.case);store.atomic('approved-exclusion-plan.json',result)
    elif path in ['/api/approve','/api/restore']:result=store.approve(data['keys'],data['revision'],data['manifestDigest'],data.get('ownerConfirmed'),restore=path=='/api/restore')
    else:return self.send(404,{'error':'Unknown action'})
    return self.send(200,{'ok':True,'result':result,'publicationAuthorized':False})
   except (ValueError,KeyError,TypeError) as error:return self.send(409,{'error':str(error)})
  def log_message(self,fmt,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',port),Handler);print('PRIVATE REVIEW: '+base+' (no publication controls)',flush=True);server.serve_forever()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--case',required=True);p.add_argument('--port',type=int,default=8388);args=p.parse_args();serve(Path(args.case).resolve(),args.port)
