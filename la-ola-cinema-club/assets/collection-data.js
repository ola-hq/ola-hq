// Shared display and provenance rules. Never infer a watched date from filing order.
export function scoreText(value,places){
 if(typeof value!=='number'||!Number.isFinite(value))return '—';
 return places===undefined?String(value):String(Number(value.toFixed(places)));
}
export function filmDate(film,basis='watched'){
 const date=film.dates?.[basis];
 if(basis==='watched'&&date&&(date.kind==='reservation'||date.kind==='amc-reservation'||date.confirmedAttendance===false))return null;
 if(!date||typeof date.value!=='string'||!/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(date.value))return null;
 const [y,m,d]=date.value.split('-').map(Number);
 if(y<1880||y>2200||(m!==undefined&&(m<1||m>12))||(d!==undefined&&(d<1||d>new Date(Date.UTC(y,m,0)).getUTCDate())))return null;
 return date;
}
export function matchesDate(film,{basis='watched',year='',month=''}={}){
 if(!year&&!month)return true;
 const d=filmDate(film,basis);if(!d)return false;
 return (!year||d.value.slice(0,4)===String(year))&&(!month||d.value.slice(5,7)===String(month).padStart(2,'0'));
}
export function historicalTrends(films,{basis='watched',period='month'}={}){
 const pairs=films.filter(f=>f.currentClubCard&&Number.isFinite(f.brain)&&Number.isFinite(f.heart));
 const groups=new Map();let dated=0;
 for(const f of pairs){const date=filmDate(f,basis);if(!date?.verified||date.value.length<(period==='year'?4:7))continue;dated++;const key=date.value.slice(0,period==='year'?4:7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
 return {total:pairs.length,dated,unknown:pairs.length-dated,groups:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=>{const mean=k=>items.reduce((s,f)=>s+f[k],0)/items.length;return {date,count:items.length,brain:mean('brain'),heart:mean('heart'),combined:mean('clubScore'),equal:mean('brain')===mean('heart'),films:items};})};
}
export function artworkURL(entry,kind='image',base){
 const value=entry?.[kind]||entry?.image;if(!value)return null;
 const url=new URL(value,base);if(!['http:','https:'].includes(url.protocol))return null;
 if(entry.revision)url.searchParams.set('art',entry.revision);return url.href;
}
export function applyArtwork(films,manifest){
 return films.map(f=>{const a=manifest?.films?.[f.id];return a?{...f,image:a.image,thumbnail:a.thumbnail||a.image,artRevision:a.revision}:f});
}
export function distribution(films,key='clubScore'){
 if(!['clubScore','brain','heart'].includes(key))throw new TypeError('Unknown score perspective');
 const items=films.filter(f=>Number.isFinite(f[key])&&(key==='clubScore'||f.currentClubCard&&Number.isFinite(f.brain)&&Number.isFinite(f.heart)));
 return {count:items.length,bins:[...new Set(items.map(f=>f[key]))].sort((a,b)=>a-b).map(score=>({score,films:items.filter(f=>f[key]===score)}))};
}
