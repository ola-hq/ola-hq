#!/usr/bin/env python3
"""Render authorized full reviews from canonical film data without changing the archive."""
import argparse,html,json,re
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--site',type=Path,default=Path('la-ola-cinema-club'));site=parser.parse_args().site
films=json.loads((site/'data/films.json').read_text());published=[f for f in films if f.get('reviewPublication',{}).get('status')=='owner-authorized-website']
def escape(value):return html.escape(str(value),quote=True)
def score(value):return f'{value:g}'
for f in published:
 assert f.get('review') and f.get('brainReaction') and f.get('heartReaction'),f['id']
 path=site/'films'/f['slug']/'index.html';text=path.read_text()
 start=text.index('</blockquote>',text.index('<blockquote class="film-quote">'))+len('</blockquote>');end=text.index('<div class="stamp-note">',start)
 paragraphs=[p.strip() for p in re.split(r'\n\s*\n',f['review']) if p.strip()]
 body='<div class="story" data-full-review="'+escape(f['id'])+'">'+''.join('<p>'+escape(p)+'</p>' for p in paragraphs)+'</div>'
 for field,title in [('brainReaction','From the Brain'),('heartReaction','From the Heart')]:body+='<section class="reaction"><h3>'+title+'</h3><p>'+escape(f[field])+'</p></section>'
 text=text[:start]+body+text[end:]
 description=escape(f"{f['title']} — Brain {score(f['brain'])}/5, Heart {score(f['heart'])}/5, Club {score(f['clubScore'])}/10.")
 text=re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*',lambda m:m[1]+description,text)
 path.write_text(text)
index=site/'all-films.html';text=index.read_text()
for f in published:text=re.sub(r'(<a href="films/'+re.escape(f['slug'])+r'/">.*?</a> — )[^<]+',lambda m:m[1]+score(f['clubScore'])+'/10',text)
index.write_text(text)
index=site/'reviews/index.html';text=index.read_text();coverage=f'<p class="muted" data-full-review-count>{len(published)} full Club reviews, with {len(films)} films in the collection.</p>'
if 'data-full-review-count' in text:text=re.sub(r'<p[^>]*data-full-review-count[^>]*>.*?</p>',lambda _:coverage,text)
else:text=text.replace('<div class="actions">',coverage+'<div class="actions">',1)
index.write_text(text)
print('Rendered',len(published),'authorized full reviews; archive records preserved.')
