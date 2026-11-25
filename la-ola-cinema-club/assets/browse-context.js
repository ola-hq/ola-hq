const KEY='ola-cinema-browse-v1';
export function orderedReviews(records,ids=[],currentId=''){
 const byId=new Map(records.map(f=>[f.id,f]));const selected=[...new Set(ids)].filter(id=>byId.has(id)).map(id=>byId.get(id));
 return selected.length&&(!currentId||selected.some(f=>f.id===currentId))?selected:[...records].sort((a,b)=>b.order-a.order);
}
export function rememberBrowse(items,base,returnPath=''){
 try{const root=new URL(base),url=new URL(returnPath||'reviews/',root);const safe=url.origin===root.origin&&url.pathname===root.pathname+'reviews/'?url.pathname+url.search:new URL('reviews/',root).pathname;sessionStorage.setItem(KEY,JSON.stringify({ids:items.map(f=>f.id),returnPath:safe}));}catch{}
}
export function readBrowse(records,currentId,base){
 let saved={};try{saved=JSON.parse(sessionStorage.getItem(KEY)||'{}')||{};}catch{}
 const ids=Array.isArray(saved.ids)&&saved.ids.every(x=>typeof x==='string')?saved.ids:[];const films=orderedReviews(records,ids,currentId);const valid=ids.includes(currentId);let back=new URL('reviews/',base);
 if(valid&&typeof saved.returnPath==='string'){try{const u=new URL(saved.returnPath,base);if(u.origin===back.origin&&u.pathname===back.pathname)back=u;}catch{}}
 return {films,returnURL:back.href};
}
export function detailURL(film,base,anchor='review-navigation'){return new URL('films/'+film.slug+'/?details=1#'+anchor,base).href;}
