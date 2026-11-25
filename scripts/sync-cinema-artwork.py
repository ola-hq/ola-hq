#!/usr/bin/env python3
"""Project the reviewed registry to film metadata/static pages; never import Canva drafts.
Run after an approved registry change. Promotion requires an approval receipt in that entry.
"""
import json, re, os, hashlib
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--site',type=Path,default=Path('projects/blockbuster-wave/club-site'));args=parser.parse_args();site=args.site
registry=json.loads((site/'data/artwork.json').read_text());films=json.loads((site/'data/films.json').read_text())
assert set(registry['films'])=={f['id'] for f in films},'Registry/film IDs differ'
def score(n):return str(int(n)) if float(n).is_integer() else str(n)
for film in films:
 entry=registry['films'][film['id']]
 assert entry['status'] in ['previously-published','approved'],'Draft artwork cannot be projected'
 if entry['status']=='previously-published':
  assert entry['image']==film['image'] and entry.get('thumbnail',entry['image'])==film.get('thumbnail',film['image']),'A new image requires an approval receipt'
 else:
  assert entry.get('approvalReceipt') and entry.get('sha256'),'New artwork needs approval receipt and checksum'
  for field in ['image','thumbnail']:
   candidate=(site/entry.get(field,entry['image'])).resolve();assert candidate.is_relative_to((site/'assets').resolve()),'Approved art must remain inside this world assets directory'
   digest=hashlib.sha256(candidate.read_bytes()).hexdigest();expected=entry['sha256'] if field=='image' or entry.get(field)==entry['image'] else entry.get('thumbnailSha256')
   assert digest==expected,'Artwork checksum differs from approved receipt'
# About/genre artwork uses the same approved registry and checksum gate as review cards.
for key,entry in registry.get('features',{}).items():
 assert entry.get('status')=='approved' and entry.get('approvalReceipt') and entry.get('sha256'),'Feature artwork needs approved receipt'
 candidate=(site/entry['image']).resolve();assert candidate.is_relative_to((site/'assets').resolve()),'Feature art must remain inside world assets'
 assert hashlib.sha256(candidate.read_bytes()).hexdigest()==entry['sha256'],'Feature artwork checksum differs'
for f in films:
 a=registry['films'][f['id']];assert a['status'] in ['previously-published','approved'],'Draft artwork cannot be projected'
 if a['status']=='approved':assert a.get('approvalReceipt') and a.get('sha256'),'New artwork needs approval receipt and checksum'
 for key in ['image','thumbnail']:
  value=a.get(key,a['image']);assert not re.match(r'^(?:https?:|//|data:|javascript:)',value),'Only reviewed local artwork paths'
  f[key]=value
 path=site/'films'/f['slug']/'index.html'
 if not path.exists():continue
 text=path.read_text();image='../../'+a['image']+'?art='+a['revision']
 text=re.sub(r'(<div class="film-art-column"><a href=")[^"]+(\"><img class="film-main-art" src=")[^"]+',lambda m:m[1]+image+m[2]+image,text)
 if f.get('currentClubCard'):
  ratings='<dl class="ratings">'+''.join('<div class="rating'+(' total' if key=='clubScore' else '')+'"><dt>'+label+'</dt><dd>'+score(f[key])+' <small>/'+str(scale)+'</small></dd></div>' for key,label,scale in [('clubScore','The Club',10),('brain','The Brain',5),('heart','The Heart',5)])+'</dl>'
  text=re.sub(r'<dl class="ratings">.*?</dl>',lambda _:ratings,text,flags=re.S)
 if f.get('artworkNotice') and 'data-edition-notice' not in text:text=text.replace('<p class="muted">La Ola Cinema Club</p>','<p class="muted" data-edition-notice>'+f['artworkNotice']+'</p>')
 text=re.sub(r'(?<![\d.])(\d+)\.0(?=\s*<small>\s*/(?:5|10))',r'\1',text)
 tmp=path.with_suffix('.tmp');tmp.write_text(text);os.replace(tmp,path)
home=site/'index.html'
if home.exists():
 text=home.read_text()
 for f in films:
  entry=registry['films'][f['id']];text=re.sub(r'(<a href="films/'+re.escape(f['slug'])+r'/"><img src=")[^"]+',lambda m:m[1]+entry['image']+'?art='+entry['revision'],text)
 home.write_text(text)
p=site/'data/films.json';tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(films,ensure_ascii=False,separators=(',',':'))+'\n');os.replace(tmp,p)
print('Synchronized',len(films),'registry records and static film pages; no draft artwork imported.')

for page in [site/'about/index.html',site/'favorites/thriller/index.html']:
 if not page.exists():continue
 text=page.read_text()
 for key,entry in registry.get('features',{}).items():
  source=os.path.relpath(site/entry['image'],page.parent).replace(os.sep,'/')+'?art='+entry['revision']
  text=re.sub(r'(<img[^>]*data-artwork-key="'+re.escape(key)+r'"[^>]*src=")[^"]+',lambda m:m[1]+source,text)
 page.write_text(text)
print('Synchronized',len(registry.get('features',{})),'approved identity/genre records.')
