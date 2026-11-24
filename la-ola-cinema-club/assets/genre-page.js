import {filterFilms,scoreText} from './club.js';
const root=document.querySelector('[data-genre-shelf]'),base=new URL('../',import.meta.url);
if(root){fetch(new URL('data/films.json',base)).then(r=>{if(!r.ok)throw Error('Unavailable');return r.json()}).then(films=>{
 const matches=filterFilms(films,{genre:root.dataset.genre});root.replaceChildren();
 for(const f of matches){const card=document.createElement('article');card.className='film-card';const a=document.createElement('a');a.className='film-art';a.href=new URL('films/'+f.slug+'/',base);const img=document.createElement('img');img.src=new URL(f.thumbnail||f.image,base);img.alt=f.title+' review card';img.loading='lazy';img.width=400;img.height=600;a.append(img);const h=document.createElement('h3');const title=document.createElement('a');title.href=a.href;title.textContent=f.title;h.append(title);const score=document.createElement('p');score.className='score-chip';score.textContent=scoreText(f.clubScore)+'/10';card.append(a,h,score);root.append(card)}
 if(!matches.length){const p=document.createElement('p');p.textContent='No recorded reviews in this genre yet.';root.append(p)}
}).catch(()=>{root.textContent='The shelf could not load. Please refresh or use Reviews to browse Thriller.'})}
