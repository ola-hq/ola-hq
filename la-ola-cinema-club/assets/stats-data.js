import {filmDate} from './collection-data.js?v=20261125-worlds35';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
// Recorded reviewer ratings belong to the whole collection, independently of artwork edition.
export function perspectiveStats(films,key){
 if(!['brain','heart'].includes(key))throw new TypeError('Unknown reviewer');
 const pairs=films.filter(f=>finite(f.brain)&&finite(f.heart));
 const average=items=>items.length?items.reduce((sum,f)=>sum+f[key],0)/items.length:null;
 const groups=new Map();
 for(const f of pairs){if(f.genre&&f.genre!=='Unmapped'){if(!groups.has(f.genre))groups.set(f.genre,[]);groups.get(f.genre).push(f)}}
 const genres=[...groups].filter(([,items])=>items.length>=3).map(([name,items])=>({name,count:items.length,average:average(items)})).sort((a,b)=>b.average-a.average||b.count-a.count||a.name.localeCompare(b.name));
 const highest=[...pairs].sort((a,b)=>b[key]-a[key]||b.order-a.order);
 return {count:pairs.length,average:average(pairs),high:pairs.filter(f=>f[key]>=4).length,low:pairs.filter(f=>f[key]<=2).length,genres,standout:highest[0]||null};
}
export function collectionStats(films){
 const rated=films.filter(f=>finite(f.clubScore));const current=films.filter(f=>f.currentClubCard);const pairs=films.filter(f=>finite(f.brain)&&finite(f.heart));
 const mean=a=>a.length?a.reduce((a,b)=>a+b,0)/a.length:null;const scores=rated.map(f=>f.clubScore).sort((a,b)=>a-b);const mid=Math.floor(scores.length/2);
 const countBy=(items,key)=>Object.entries(items.reduce((a,f)=>{if(f[key]!==null&&f[key]!==undefined&&f[key]!=='')a[f[key]]=(a[f[key]]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 return {total:films.length,rated:rated.length,current:current.length,average:mean(scores),median:scores.length?(scores.length%2?scores[mid]:(scores[mid-1]+scores[mid])/2):null,perfect:rated.filter(f=>f.clubScore===10),high:rated.filter(f=>f.clubScore>=8).length,distribution:countBy(rated,'clubScore').map(([score,count])=>({score:Number(score),count})).sort((a,b)=>a.score-b.score),top:[...rated].sort((a,b)=>b.clubScore-a.clubScore||b.order-a.order).slice(0,6),pairs:pairs.length,brainMean:mean(pairs.map(f=>f.brain)),heartMean:mean(pairs.map(f=>f.heart)),agree:pairs.filter(f=>f.brain===f.heart).length,brainHigher:pairs.filter(f=>f.brain>f.heart).length,heartHigher:pairs.filter(f=>f.heart>f.brain).length,different:[...pairs].sort((a,b)=>Math.abs(b.brain-b.heart)-Math.abs(a.brain-a.heart)||b.order-a.order).slice(0,3),genres:countBy(current,'genre'),stamps:countBy(current,'stamp')};
}

// Viewing periods require explicit verified attendance dates, never release years,
// artwork editions, legacy filing months or unconfirmed reservations.
export function watchedRecords(films,{year='',month='',genre='',stamp=''}={}){
 return films.filter(f=>{const d=filmDate(f,'watched');return d?.verified===true&&(!year||d.value.slice(0,4)===String(year))&&(!month||(d.value.length>=7&&d.value.slice(5,7)===String(month).padStart(2,'0')))&&(!genre||f.genre===genre)&&(!stamp||f.stamp===stamp);});
}
