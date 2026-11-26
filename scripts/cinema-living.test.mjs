import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {scoreText,filmDate,matchesDate,historicalTrends,distribution,applyArtwork,artworkURL} from '../la-ola-cinema-club/assets/collection-data.js';
import {filterFilms} from '../la-ola-cinema-club/assets/club.js';
import {CardViewer,gestureAction,physicalGestureAction,physicalEdgeAction,downwardExit} from '../assets/ola-worlds/card-viewer.js';
const films=JSON.parse(readFileSync('la-ola-cinema-club/data/films.json'));
const manifest=JSON.parse(readFileSync('la-ola-cinema-club/data/artwork.json'));
test('date filters preserve unknowns and distinguish recorded release years from verified watch days',()=>{
 const f={dates:{release:{value:'2026',precision:'year',verified:false},watched:{value:'2026-11-19',precision:'day',verified:true}}};
 assert.equal(matchesDate(f,{basis:'release',year:'2026'}),true);assert.equal(matchesDate(f,{basis:'release',month:'11'}),false);assert.equal(matchesDate(f,{year:'2026',month:'11'}),true);assert.equal(matchesDate({},{}),true);assert.equal(matchesDate({},{year:'2026'}),false);assert.equal(filmDate({dates:{watched:{value:'2026-02-30'}}}),null);
 assert.equal(filterFilms(films,{year:'2026',month:'11'}).length,10);assert.equal(filterFilms(films,{basis:'reviewed',year:'2026'}).length,0);
});
test('historical means expose real equality versus display rounding without losing denominator',()=>{
 const pairs=[{currentClubCard:true,brain:3.0001,heart:3,clubScore:6.0001,dates:{watched:{value:'2026-11-01',verified:true}}},{currentClubCard:true,brain:4,heart:4,clubScore:8}];
 const h=historicalTrends(pairs);assert.equal(h.total,2);assert.equal(h.dated,1);assert.equal(h.unknown,1);assert.equal(h.groups[0].equal,false);assert.equal(scoreText(h.groups[0].brain,2),scoreText(h.groups[0].heart,2));assert.equal(scoreText(0),'0');assert.equal(scoreText(null),'—');assert.equal(scoreText(7.25),'7.25');assert.equal(scoreText(10,2),'10');
});
test('distribution counts and linked shelf filters use the same paired perspective scope',()=>{
 for(const key of ['clubScore','brain','heart']){const d=distribution(films,key);assert.equal(d.count,236);for(const bin of d.bins){const result=filterFilms(films,{score:bin.score,perspective:key});assert.deepEqual(new Set(result.map(f=>f.id)),new Set(bin.films.map(f=>f.id)));}}
 const f=films.find(f=>f.title==='Heart of the Beast');assert.equal(f.brain,1);assert.equal(f.heart,3);assert.equal(f.clubScore,4);assert.equal(manifest.films[f.id].status,'approved');assert.equal(manifest.films[f.id].sourcePage,90);
});
test('one registry replacement propagates through the shared resolver and static film page with cache revision',()=>{
 const f=films[0],a=manifest.films[f.id];const next={...manifest,features:{},films:{...manifest.films,[f.id]:{...a,image:'assets/test-approved.webp',thumbnail:'assets/test-thumb.webp',revision:'new-proof',status:'approved',approvalReceipt:'test fixture approval only',sha256:createHash('sha256').update('fixture').digest('hex'),thumbnailSha256:createHash('sha256').update('thumb').digest('hex')}}};
 const updated=applyArtwork(films,next).find(x=>x.id===f.id);assert.equal(updated.image,'assets/test-approved.webp');assert.equal(updated.thumbnail,'assets/test-thumb.webp');assert.match(artworkURL(next.films[f.id],'image','https://example.org/club/'),/test-approved.webp\?art=new-proof$/);
 const dir=mkdtempSync(join(tmpdir(),'ola-art-sync-'));try{cpSync('la-ola-cinema-club/data',join(dir,'data'),{recursive:true});cpSync('la-ola-cinema-club/films/'+f.slug,join(dir,'films',f.slug),{recursive:true});mkdirSync(join(dir,'assets'));cpSync('la-ola-cinema-club/assets/cards',join(dir,'assets/cards'),{recursive:true});writeFileSync(join(dir,'assets/test-approved.webp'),'fixture');writeFileSync(join(dir,'assets/test-thumb.webp'),'thumb');writeFileSync(join(dir,'data/artwork.json'),JSON.stringify(next));execFileSync('python3',['scripts/sync-cinema-artwork.py','--site',dir]);assert.match(readFileSync(join(dir,'films',f.slug,'index.html'),'utf8'),/test-approved.webp\?art=new-proof/);next.films[f.id].status='draft';writeFileSync(join(dir,'data/artwork.json'),JSON.stringify(next));assert.notEqual(spawnSync('python3',['scripts/sync-cinema-artwork.py','--site',dir]).status,0);}finally{rmSync(dir,{recursive:true,force:true});}
});
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.style={setProperty:(k,v)=>this.style[k]=v};this.clientWidth=400;this.clientHeight=600;this.hidden=false;}
 append(...children){for(const c of children){c.parent=this;this.children.push(c);}} replaceChildren(...children){this.children=[];this.append(...children)} setAttribute(k,v){this.attributes[k]=v} addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)} removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x!==fn)} focus(){globalThis.document.activeElement=this} showModal(){this.open=true} close(){this.open=false;this.emit('close',{})} remove(){this.parent.children=this.parent.children.filter(x=>x!==this)} contains(n){return n===this||this.children.some(c=>c.contains(n))} getClientRects(){return this.hidden?[]:[{}]} matches(s){return s.split(',').includes(this.tagName.toLowerCase())} querySelectorAll(){return this.children.flatMap(c=>[c,...c.querySelectorAll()]).filter(c=>['BUTTON','A','TEXTAREA','INPUT'].includes(c.tagName)||c.tabIndex===0)} getBoundingClientRect(){return {top:0,left:0,width:this.clientWidth,height:this.clientHeight}} setPointerCapture(){} emit(type,e){for(const fn of this.listeners[type]||[])fn({preventDefault(){},stopPropagation(){},...e})}
}
function environment(){const document={body:new Element('body'),head:new Element('head'),documentElement:new Element('html'),createElement:tag=>new Element(tag),querySelector:()=>null};globalThis.document=document;globalThis.matchMedia=()=>({matches:false});return document;}
const pointer=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,preventDefault(){}});
test('shared Cinema/Polaroid viewer supports touch navigation, zoom/drag separation, reset, flip and focus restoration',()=>{
 const d=environment();try{const opener=new Element('button');opener.focus();const v=new CardViewer({theme:'polaroid'});const items=[{src:'a.jpg',title:'First'},{src:'b.jpg',title:'Second'},{src:'c.jpg',title:'Third'}];v.open(items,0,opener);assert.equal(v.dialog.open,true);assert.equal(v.image.src,'a.jpg');assert.equal(d.documentElement.style.overflow,'hidden');
 v.down(pointer(200,200));v.drag(pointer(80,200));v.up(pointer(80,200),true);assert.equal(v.index,1);assert.equal(v.image.src,'b.jpg');
 v.zoom(2);v.down(pointer(200,200));v.drag(pointer(20,200));v.up(pointer(20,200),true);assert.equal(v.index,1);assert.equal(v.scale,2);assert.notEqual(v.panX,0);v.reset();assert.equal(v.scale,1);assert.equal(v.panX,0);
 v.down(pointer(200,200,1));v.down(pointer(220,200,2));v.drag(pointer(300,200,2));v.up(pointer(300,200,2),true);v.up(pointer(0,200,1),true);assert.equal(v.index,1,'pinch must not become a swipe');v.reset();v.flip();assert.equal(v.back.hidden,false);assert.equal(v.front.hidden,true);v.move(1);assert.equal(v.back.hidden,true);assert.equal(v.image.src,'c.jpg');v.move(1);assert.equal(v.index,0);
 v.down(pointer(200,200));v.up(pointer(0,200),false);assert.equal(v.index,0,'cancelled drag must not navigate');
 const input=new Element('textarea');v.dialog.emit('keydown',{key:'ArrowRight',target:input,preventDefault(){}});assert.equal(v.index,0);v.dialog.emit('keydown',{key:'ArrowRight',target:v.closeButton,preventDefault(){}});assert.equal(v.index,1);v.close();assert.equal(d.activeElement,opener);assert.equal(d.documentElement.style.overflow,'');
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('vertical gestures, pinch and zoom never trigger horizontal navigation',()=>{assert.equal(gestureAction({dx:90,dy:100}),'tilt');assert.equal(gestureAction({dx:100,multi:true}),'pan');assert.equal(gestureAction({dx:100,scale:2}),'pan');assert.equal(gestureAction({dx:-100}),'next')});

import {oceanComposition} from '../la-ola-cinema-club/assets/ocean-layout.js';
import {originalOceanComposition} from '../la-ola-cinema-club/assets/ocean-layout.js';
test('inline touch card moves in both directions without opening a modal or trapping page focus',()=>{
 const d=environment();try{const mount=new Element('div'),navigated=[];const v=new CardViewer({mount,onNavigate:item=>navigated.push(item.title)});v.open([{src:'a.jpg',title:'First'},{src:'b.jpg',title:'Second'}]);assert.equal(v.dialog.tagName,'SECTION');assert.notEqual(d.documentElement.style.overflow,'hidden');assert.equal(v.dialog.open,undefined);
 v.down(pointer(200,200));v.drag(pointer(240,280));assert.ok(v.panX>0&&v.panY>0);assert.notEqual(v.rotX,0);v.up(pointer(240,280),true);assert.equal(v.index,0);assert.equal(v.panX,0);assert.equal(v.panY,0);
 let trapped=false;v.dialog.emit('keydown',{key:'Tab',target:v.stage,preventDefault(){trapped=true}});assert.equal(trapped,false);assert.deepEqual(navigated,[]);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('inline next-review navigation needs a deliberate full swipe, never a pinch or cancelled drag',()=>{
 environment();try{const navigated=[],v=new CardViewer({mount:new Element('div'),onNavigate:item=>navigated.push(item.title)});v.open([{src:'a.jpg',title:'First'},{src:'b.jpg',title:'Second'}]);
 v.down(pointer(300,200));v.drag(pointer(210,200));v.up(pointer(210,200),true);assert.equal(v.index,0,'small sideways drags only tilt');
 v.down(pointer(300,200));v.drag(pointer(80,200));v.up(pointer(80,200),false);assert.equal(v.index,0,'cancel must not navigate');
 v.down(pointer(300,200));v.drag(pointer(80,200));v.up(pointer(80,200),true);assert.deepEqual(navigated,['Second']);
 v.zoom(2);v.down(pointer(300,200));v.drag(pointer(40,200));v.up(pointer(40,200),true);assert.equal(v.index,1);assert.equal(navigated.length,1);v.flip();assert.equal(v.back.hidden,false);v.dialog.emit('keydown',{key:'Escape',target:v.stage});assert.equal(v.back.hidden,true);assert.equal(v.scale,1);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('restored original artwork keeps its moon outside navigation and reserves clear mobile sky',()=>{
 for(const width of [320,390,430,834,1100,1440,1920]){const header=width<=700?290:180;const s=originalOceanComposition(width,900,header);assert.ok(s.moonY-s.radius>=header+31);assert.ok(s.moonX-s.radius>=0);assert.ok(s.moonX+s.radius<=width);assert.equal(s.skyGap>0,width<=1100);assert.ok(Math.abs((s.left+s.mediaWidth*.684)-s.moonX)<.001);assert.ok(Math.abs((s.top+s.mediaHeight*82/667)-s.moonY)<.001);}
});
test('complete ocean frame keeps its one moon below navigation and within desktop/mobile bounds',()=>{
 for(const width of [390,430,834,1440,1920]){const headerBottom=width<700?270:180;const scene=oceanComposition(width,headerBottom);assert.ok(scene.moonY-scene.radius>=headerBottom+30);assert.ok(scene.moonX-scene.radius>=0);assert.ok(scene.moonX+scene.radius<=width);assert.equal(scene.portrait,width<=700);assert.equal(scene.skyGap>0,width<=1100);if(width<=1100)assert.ok(scene.skyGap>scene.radius*2);}
});
test('AMC reservations are separate from confirmed watched dates and never become historical totals',()=>{
 const reservation={currentClubCard:true,brain:4,heart:5,clubScore:9,amcReservationDate:'2026-11-24',dates:{watched:{value:'2026-11-24',verified:true,kind:'amc-reservation',confirmedAttendance:false}}};assert.equal(filmDate(reservation),null);assert.equal(matchesDate(reservation,{year:'2026',month:'11'}),false);assert.equal(historicalTrends([reservation]).dated,0);assert.equal(historicalTrends([reservation]).unknown,1);
});
test('homepage retains its approved composition while showing the latest three owner-approved reviews',()=>{
 const html=readFileSync('la-ola-cinema-club/index.html','utf8'),old=execFileSync('git',['show','b87fea47:la-ola-cinema-club/index.html'],{encoding:'utf8'});
 const hero=s=>s.match(/<section class="hero hero-world">.*?<\/section>/s)[0];
 const normalize=s=>hero(s).replace(/\d+ films on the shelves\./,'COUNT').replace(/<div class="stage-cards"[^>]*>.*?<div class="stage-footer">.*?<\/div>/s,'DYNAMIC LATEST THREE');
 assert.equal(normalize(html),normalize(old),'headline, phone structure and all unrelated hero content remain intact');
 for(const cls of ['home-sky-window','home-ocean-stats','home-ocean-fresh','home-ocean-lanes'])assert.ok(html.includes(cls));
 const stack=html.match(/<div class="stage-cards"[^>]*>(.*?)<div class="stage-footer">/s)[1];
 const ids=[...stack.matchAll(/data-film-id="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,filterFilms(films).slice(0,3).reverse().map(f=>f.id));assert.match(html,/Our latest three reviews/);assert.match(stack,/datetime="2026-11-25"/);
});

test('immersive flicks animate exactly one card and activation targets the selected review',async()=>{
 environment();try{const activated=[],v=new CardViewer({immersive:true,onActivate:item=>activated.push(item.title)});v.open([{src:'a.jpg',title:'First'},{src:'b.jpg',title:'Second'}]);assert.equal(v.dialog.open,true);assert.equal(v.source.hidden,true);const frames=[];v.card.animate=(f)=>{frames.push(f);return{finished:Promise.resolve()}};
 const first=v.toss(1);v.toss(1);await first;assert.equal(v.index,1,'rapid duplicate navigation must be ignored');assert.equal(frames.length,2);assert.match(frames[0][1].transform,/rotateZ\(-26deg\)/);assert.equal(v.turning,false);v.activate();assert.deepEqual(activated,['Second']);assert.equal(v.dialog.open,false);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('immersive cancellation cannot advance a card after the viewer closes',async()=>{
 environment();try{const v=new CardViewer({immersive:true});v.open([{src:'a.jpg'},{src:'b.jpg'}]);let finish;v.card.animate=()=>({finished:new Promise(resolve=>finish=resolve)});const pending=v.toss(1);v.close();finish();await pending;assert.equal(v.index,0);assert.equal(v.turning,false);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('flick velocity never turns pinch, vertical or negligible movement into navigation',()=>{
 assert.equal(gestureAction({dx:-80,dy:0,threshold:150,velocity:-.8}),'next');assert.equal(gestureAction({dx:50,velocity:2,threshold:150}),'tilt');assert.equal(gestureAction({dx:-80,dy:90,velocity:2,threshold:150}),'tilt');assert.equal(gestureAction({dx:-80,multi:true,velocity:2,threshold:150}),'pan');assert.equal(gestureAction({dx:-80,scale:2,velocity:2,threshold:150}),'pan');
});

test('native two-finger rotation remains visible and retained at constant scale, even with reduced motion',()=>{
 environment();try{const v=new CardViewer({immersive:true});v.open([{src:'a.jpg'},{src:'b.jpg'}]);v.reduced.matches=true;
 const event=points=>({changedTouches:points.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY})),preventDefault(){}});
 v.stage.emit('touchstart',event([[1,150,200],[2,250,200]]));v.stage.emit('touchmove',event([[1,200,150],[2,200,250]]));assert.ok(Math.abs(v.rotZ-90)<.001);assert.match(v.card.style.transform,/rotateZ\(90deg\)/);assert.equal(v.scale,1);v.stage.emit('touchend',event([[1,200,150],[2,200,250]]));assert.ok(Math.abs(v.rotZ-90)<.001);assert.equal(v.index,0);assert.equal(v.dialog.open,true);v.reset();assert.equal(v.rotZ,0);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('immersive downward dismissal animates off screen then opens the selected review, while back opens the full review',async()=>{
 environment();try{const activated=[],v=new CardViewer({immersive:true,onActivate:item=>activated.push(item.title)});v.open([{src:'a.jpg',title:'First'},{src:'b.jpg',title:'Second'}]);const animations=[];v.card.animate=f=>{animations.push(f);return{finished:Promise.resolve()}};await v.dismiss();assert.equal(v.dialog.open,false);assert.deepEqual(activated,['First']);assert.match(animations[0][1].transform,/780px/);v.open(v.items,1);v.flip();assert.equal(v.dialog.open,false);assert.deepEqual(activated,['First','Second']);assert.equal(v.sound,true);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('all owner-final review, identity and genre exports match registry receipts and current source pages',()=>{
 const current=films.filter(f=>f.currentClubCard&&!f.sourceDesign);assert.equal(current.length,88);assert.deepEqual(current.map(f=>f.sourcePage).sort((a,b)=>a-b),Array.from({length:88},(_,i)=>i+14));
 for(const f of current){const a=manifest.films[f.id];assert.equal(a.status,'approved');assert.equal(a.sourcePage,f.sourcePage);assert.equal(a.sourceDesign,'DAHAZmy7qts');assert.equal(a.pendingRefresh,false);assert.equal(createHash('sha256').update(readFileSync('la-ola-cinema-club/'+a.image)).digest('hex'),a.sha256);assert.match(readFileSync('la-ola-cinema-club/films/'+f.slug+'/index.html','utf8'),new RegExp('art='+a.revision));}
 const about=readFileSync('la-ola-cinema-club/about/index.html','utf8');assert.equal(Object.keys(manifest.features).length,13);for(const [key,a]of Object.entries(manifest.features)){assert.equal(a.status,'approved');assert.ok(a.approvalReceipt);assert.equal(createHash('sha256').update(readFileSync('la-ola-cinema-club/'+a.image)).digest('hex'),a.sha256);assert.ok(about.includes('data-artwork-key="'+key+'"'));assert.ok(about.includes(a.image+'?art='+a.revision));}
});

test('downward exit requires a long pull AND release near the bottom, excluding mid-screen drops, pinch and sideways motion',()=>{
 const stage={stageTop:20,stageHeight:800};
 assert.equal(downwardExit({...stage,dy:400,releaseY:600}),false,'even a long pull released in the middle must stay');
 assert.equal(downwardExit({...stage,dy:200,releaseY:800}),false,'a short pull near the bottom must stay');
 assert.equal(downwardExit({...stage,dy:400,releaseY:780}),true);
 assert.equal(downwardExit({...stage,dy:400,releaseY:780,multi:true}),false);
 assert.equal(downwardExit({...stage,dy:400,releaseY:780,scale:2}),false);
 assert.equal(downwardExit({...stage,dx:400,dy:400,releaseY:780}),false);
 assert.equal(downwardExit({...stage,dy:-400,releaseY:780}),false);
});

test('coalesced native drag never becomes a tap when no intermediate touchmove arrives',()=>{
 environment();try{const activated=[],v=new CardViewer({immersive:true,onActivate:()=>activated.push(true)});v.open([{src:'a.jpg'}]);const point=(x,y)=>({...pointer(x,y),pointerType:'native-touch',target:v.image});v.down(point(200,100));v.up(point(200,440),true);assert.equal(v.dialog.open,true,'release above bottom stays open');assert.deepEqual(activated,[]);assert.equal(v.travel,340);v.down(point(200,440));v.up(point(200,580),true);assert.equal(v.dialog.open,true,'short near-bottom pull stays open');assert.deepEqual(activated,[]);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('soft paper sound is a bounded short non-looped recording',()=>{
 const wav=readFileSync('assets/ola-worlds/audio/paper-card-v32.wav');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt16LE(34),16);assert.ok(wav.length<100000);let peak=0,sum=0;for(let i=44;i<wav.length;i+=2){const n=wav.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(n));sum+=n*n;}const rms=Math.sqrt(sum/((wav.length-44)/2));assert.ok(peak<.7&&peak>.1);assert.ok(rms>.005&&rms<.15);assert.ok((wav.length-44)/48000<.5);assert.match(readFileSync('assets/ola-worlds/audio/CARD-SOUND-CREDITS.txt','utf8'),/Joseph SARDIN/);
 const sound=readFileSync('assets/ola-worlds/card-sound.js','utf8');assert.doesNotMatch(sound,/createOscillator|projectorSamples|Math\.random|playbackRate/);assert.match(sound,/decodeAudioData/);
});
test('Cinema forward-button flourish returns the next card once while ordinary swipes remain quick',async()=>{
 environment();try{const v=new CardViewer({forwardFlourish:true,sound:true});v.open([{src:'a.jpg'},{src:'b.jpg'}]);const animations=[];v.card.animate=(frames,options)=>{animations.push({frames,options});return {finished:Promise.resolve()}};await v.forward();assert.equal(v.index,1);assert.deepEqual(animations.map(a=>a.options.duration),[850,950]);assert.match(animations[0].frames[1].transform,/rotateY\(210deg\)/);assert.equal(v.turning,false);v.destroy();const generic=new CardViewer({theme:'polaroid'});assert.equal(generic.forwardFlourish,false);assert.equal(generic.sound,false);generic.destroy();}finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('reduced motion skips the long forward flourish',async()=>{
 environment();try{const v=new CardViewer({forwardFlourish:true});v.reduced.matches=true;v.open([{src:'a.jpg'},{src:'b.jpg'}]);let animated=false;v.card.animate=()=>{animated=true};await v.forward();assert.equal(animated,false);assert.equal(v.index,1);assert.equal(v.turning,false);v.destroy();}finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('contact sheet uses resolved collection artwork and preserves full review destinations',()=>{
 const source=readFileSync('la-ola-cinema-club/assets/contact-sheet.js','utf8');assert.match(source,/club-collection/);assert.match(source,/new CinemaCardViewer/);assert.match(source,/details=1#review-details/);assert.match(source,/touchmove.*passive:true/);assert.match(source,/im.loading='lazy'/);assert.doesNotMatch(source,/canva.com|innerHTML|preventDefault\(\).*touchmove/);
 const intro=readFileSync('la-ola-cinema-club/assets/living-world.js','utf8');assert.match(intro,/entrance-ribbon.svg/);assert.match(intro,/la-ola-emblem-v2.webp/);assert.match(intro,/setTimeout\(finish,3200\)/);
});

test('opening a sound-enabled card warms the recording before its first navigation',()=>{
 environment();try{const v=new CardViewer({sound:true});let warmed=0;v.unlockAudio=()=>warmed++;v.open([{src:'a.jpg'}]);assert.equal(warmed,1);v.sound=false;v.open([{src:'a.jpg'}]);assert.equal(warmed,1);v.destroy();}finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('review order preserves selected filters and never defaults from the newest card into the oldest archive',async()=>{
 const {orderedReviews}=await import('../la-ola-cinema-club/assets/browse-context.js');const f=[{id:'old',order:1},{id:'new',order:3},{id:'middle',order:2}];assert.deepEqual(orderedReviews(f,[],'new').map(f=>f.id),['new','middle','old']);assert.deepEqual(orderedReviews(f,['middle','new','new','bad'],'new').map(f=>f.id),['middle','new']);assert.deepEqual(orderedReviews(f,['middle'],'new').map(f=>f.id),['new','middle','old']);
});
test('expanded-detail swipes reject vertical scrolling, small drags and pinch gestures',async()=>{
 const {detailSwipe}=await import('../la-ola-cinema-club/assets/review-navigation.js');assert.equal(detailSwipe({dx:-140,dy:10}),1);assert.equal(detailSwipe({dx:140,dy:10}),-1);assert.equal(detailSwipe({dx:-40}),0);assert.equal(detailSwipe({dx:-140,dy:110}),0);assert.equal(detailSwipe({dx:-140,multi:true}),0);assert.equal(detailSwipe({dx:-140,scroll:50}),0);
});
test('browse context permits only known films and a same-origin review return path',async()=>{
 const {rememberBrowse,readBrowse}=await import('../la-ola-cinema-club/assets/browse-context.js');let saved='';globalThis.sessionStorage={setItem:(k,v)=>saved=v,getItem:()=>saved};try{const base='https://ola-hq.github.io/ola-hq/la-ola-cinema-club/',records=[{id:'a',order:2},{id:'b',order:1}];rememberBrowse(records,base,base+'reviews/?genre=Drama');assert.match(readBrowse(records,'a',base).returnURL,/genre=Drama/);rememberBrowse(records,base,'https://bad.example/');assert.equal(readBrowse(records,'a',base).returnURL,base+'reviews/');saved='{broken';assert.equal(readBrowse(records,'a',base).films.length,2);}finally{delete globalThis.sessionStorage;}
});
test('poll tally stays distinct from movie scores and rejects inconsistent aggregates',async()=>{
 const {tallyText}=await import('../la-ola-cinema-club/assets/community.js');assert.match(tallyText({yes:2,no:1,total:3}),/2 yes/);assert.match(tallyText({yes:0,no:0,total:0}),/No responses/);assert.throws(()=>tallyText({yes:2,no:1,total:4}));assert.throws(()=>tallyText({yes:-1,no:1,total:0}));
});

test('paper sound resumes an interrupted context before the first audible swipe, with no mute toggle',async()=>{
 const {CardFlickSound}=await import('../assets/ola-worlds/card-sound.js');const previous={AudioContext:globalThis.AudioContext,fetch:globalThis.fetch};let resume,played=0,primes=0;const buffer={duration:.38};class Audio{constructor(){this.state='interrupted';this.currentTime=0;this.sampleRate=24000;}resume(){return new Promise(r=>resume=()=>{this.state='running';r()});}createBuffer(){return{silent:true}}createBufferSource(){return{connect(){},disconnect(){},start(){if(this.buffer?.silent)primes++;else played++;},stop(){this.onended?.()}}}createGain(){return{connect(){},disconnect(){},gain:{value:0,setTargetAtTime(){}}}}decodeAudioData(){return Promise.resolve(buffer)}close(){return Promise.resolve()}}
 globalThis.AudioContext=Audio;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)});const s=new CardFlickSound();try{s.burst();await s.ready;assert.equal(played,0);assert.equal(primes,1);resume();await new Promise(r=>setTimeout(r,0));assert.equal(played,1);s.stop();s.burst();s.stop();await new Promise(r=>setTimeout(r,0));assert.equal(played,1,'mute/stop cancels a queued start');}finally{s.destroy();for(const [k,v] of Object.entries(previous)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('hiding immersive controls releases focus so focus-within cannot pin the tray open',()=>{
 environment();try{const v=new CardViewer({immersive:true});v.open([{src:'a'}]);v.tools.contains=target=>target===v.soundButton||target===v.prev;v.prev.focus();v.setControls(true);v.setControls(false);assert.equal(v.dialog.dataset.controls,'false');assert.equal(document.activeElement,v.stage);let unlocked=0;v.unlockAudio=()=>unlocked++;v.dialog.emit('touchend',{});assert.equal(unlocked,1);v.destroy();}finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('extended review layout reserves navigation before module startup, preserving art data',()=>{for(const f of films){const h=readFileSync('la-ola-cinema-club/films/'+f.slug+'/index.html','utf8');assert.match(h,/dataset.reviewFocus='true'/);assert.match(h,/review-navigation-slot/);}assert.match(readFileSync('la-ola-cinema-club/assets/club.css','utf8'),/html\[data-review-focus=true\] \.site-header/);});
test('visitor feedback only accepts sane public response shapes and is plain-text rendered',async()=>{const {validFeedback}=await import('../la-ola-cinema-club/assets/film-feedback.js');assert.ok(validFeedback({likes:1,dislikes:0,reviewCount:1,reviews:[{name:'Visitor',review:'<script>alert(1)</script>'}]}));assert.equal(validFeedback({likes:-1,dislikes:0,reviewCount:0,reviews:[]}),false);const s=readFileSync('la-ola-cinema-club/assets/film-feedback.js','utf8');assert.doesNotMatch(s,/innerHTML|insertAdjacentHTML/);assert.match(s,/film_remove_review/);assert.match(s,/Browser storage is needed/);});




// Approved Polaroid adapter regressions; current Cinema cases above are retained.
import vm from 'node:vm';
import {publicMemoryItems,publicMemoryTitle} from '../our-polaroid-project/memory-viewer.js';
test('Polaroid public memory keeps canonical IDs, source order and unavailable positions without mutating records',()=>{
 const photos=Object.freeze([Object.freeze({sourceId:'photo-a',src:'a.jpg',alt:'Instant film photograph'}),Object.freeze({sourceId:'missing',alt:'unavailable'}),Object.freeze({sourceId:'photo-b',src:'b.jpg',alt:'img20221228_18260763'})]);
 const items=publicMemoryItems(photos,{collection:'Through My Lens'});
 assert.deepEqual(items.map(x=>[x.id,x.src,x.position]),[['photo-a','a.jpg',0],['photo-b','b.jpg',2]]);
 assert.equal(items[1].title,'Through My Lens · Frame 3');assert.equal(photos.length,3);
});
test('Polaroid memory exposes only explicit published date/location/story, never private fields or filename dates',()=>{
 const [item]=publicMemoryItems([{sourceId:'img20261016',src:'public.jpg',alt:'A recorded caption',date:'October 16, 2026',location:'Guadalajara',story:'Recorded public story',privateMemory:'PRIVATE',ownerNotes:'PRIVATE',captionDraft:'PRIVATE'}]);
 assert.deepEqual(item.fields,{date:'October 16, 2026',location:'Guadalajara',story:'Recorded public story'});
 assert.equal(item.title,'A recorded caption');assert.ok(!JSON.stringify(item).includes('PRIVATE'));
 const [undated]=publicMemoryItems([{sourceId:'img20261016',src:'undated.jpg',date:2026,location:null,story:'  '}]);assert.deepEqual(undated.fields,{});
});
test('Polaroid filtered results remain the exact supplied collection including repeated assets in separate positions',()=>{
 const selected=[{sourceId:'same',src:'same.jpg',collection:'After Dark'},{sourceId:'other',src:'other.jpg',collection:'Framed Faces'},{sourceId:'same',src:'same.jpg',collection:'Through My Lens'}];
 const items=publicMemoryItems(selected);
 assert.deepEqual(items.map(x=>[x.id,x.position,x.collection]),[['same',0,'After Dark'],['other',1,'Framed Faces'],['same',2,'Through My Lens']]);
 assert.ok(items.every(x=>x.fields&&Object.keys(x.fields).length===0));assert.equal(items[1].title,'Framed Faces · Frame 2');
});
test('Polaroid original public captions are retained and technical scan names stay descriptive frame labels',()=>{
 assert.equal(publicMemoryTitle({alt:'The dance floor'},5,'After Dark'),'The dance floor');
 for(const alt of ['img20221228_18260763','DSC_1234.jpg','PXL-20261016.jpg','Instant film photograph',''])assert.equal(publicMemoryTitle({alt},5,'After Dark'),'After Dark · Frame 6');
});
test('HQ app stage messages are limited to the selected Cinema or Polaroid frame and exact origin/type/boolean',()=>{
 const app=readFileSync('app/app.js','utf8');
 const start=app.indexOf("window.addEventListener('message', event => {");
 const end=app.indexOf("frame.addEventListener('load'",start);
 const frameWindow={},changes=[],scope={location:{origin:'https://example.test'},frame:{contentWindow:frameWindow},current:{world:'polaroid'},document:{body:{classList:{toggle:(...args)=>changes.push(args)}}},window:{addEventListener:(name,fn)=>{scope.handler=fn;}}};
 vm.runInNewContext(app.slice(start,end),scope);
 const valid={origin:scope.location.origin,source:frameWindow,data:{type:'ola-cinema-card-stage',active:true}};
 for(const world of ['polaroid','blockbuster']){scope.current.world=world;scope.handler(valid);assert.deepEqual(changes.pop(),['cinema-card-stage',true]);scope.handler({...valid,data:{...valid.data,active:false}});assert.deepEqual(changes.pop(),['cinema-card-stage',false]);}
 for(const change of [{origin:'https://untrusted.test'},{source:{}},{data:{type:'different',active:true}}])scope.handler({...valid,...change});assert.equal(changes.length,0);
 for(const world of ['fpl','arsenal','love',undefined]){scope.current.world=world;scope.handler(valid);}assert.equal(changes.length,0);
 scope.current.world='polaroid';scope.handler({...valid,data:{...valid.data,active:'true'}});assert.deepEqual(changes.pop(),['cinema-card-stage',false]);
});


test('Events memory projection retains canonical IDs and separate original/download contracts',async()=>{
 const {eventMemoryPhotos}=await import('../our-polaroid-project/events/memory-gallery.js');
 const resolve=value=>new URL(value,'https://example.test/ola-hq/').href;
 const photos=Object.freeze([Object.freeze({id:'approved-asset',caption:'Real public caption',display:'display/a.webp',download:'download/a.jpg',originalFilename:'source-scan.jpg',date:'Recorded date',privateStory:'NEVER COPY'}),Object.freeze({id:'unavailable',displayAvailable:false,downloadAvailable:false})]);
 const rows=eventMemoryPhotos(photos,resolve),items=publicMemoryItems(rows,{collection:'Event'});
 assert.deepEqual(items.map(x=>[x.id,x.position]),[['approved-asset',0]]);
 assert.equal(items[0].src,'https://example.test/ola-hq/display/a.webp');
 assert.equal(items[0].download,'https://example.test/ola-hq/download/a.jpg');
 assert.equal(items[0].inline,'https://example.test/ola-hq/download/a.jpg?inline=1');assert.equal(items[0].filename,'source-scan.jpg');assert.equal(items[0].title,'Real public caption');
 assert.deepEqual(items[0].fields,{date:'Recorded date'});assert.equal(rows[1].src,'');assert.equal(rows[1].downloadAvailable,false);
 assert.doesNotMatch(JSON.stringify(items),/NEVER COPY/);
});

test('Polaroid paper audio plays a finite source and cancels delayed activation on mute or destroy',async()=>{
 const {PaperSound}=await import('../our-polaroid-project/paper-sound.js');
 const oldAudio=globalThis.AudioContext,oldFetch=globalThis.fetch;let requested,started=0,stopped=0,closed=0,decoded=0;
 class Audio {constructor(){this.state='running';this.destination={};} resume(){return Promise.resolve();} decodeAudioData(){decoded++;return Promise.resolve({duration:.24});} createGain(){return {gain:{value:0},connect(){},disconnect(){}};} createBufferSource(){return {loop:null,connect(){},disconnect(){},start(){started++;},stop(){stopped++;}};} close(){closed++;this.state='closed';return Promise.resolve();}}
 globalThis.AudioContext=Audio;globalThis.fetch=()=>new Promise(resolve=>requested=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));
 try{
  const a=new PaperSound();assert.equal(a.ctx,undefined);a.burst();a.stop();requested();await a.ready;await Promise.resolve();assert.equal(started,0,'mute cancels pending decode');
  a.burst();assert.equal(started,1);assert.equal(a.source.loop,false);assert.equal(a.gain.gain.value,1);
  a.burst();assert.equal(started,2);assert.equal(stopped,1,'replacement retains one source');
  a.source.onended();assert.equal(a.source,null,'finite source releases after playback');
  a.burst();a.destroy();assert.equal(a.source,null);assert.equal(a.ctx,null);assert.equal(closed,1);assert.equal(decoded,1);
 }finally{if(oldAudio===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=oldAudio;globalThis.fetch=oldFetch;}
});

test('Polaroid paper sample is short quiet PCM with smooth silent endpoints',()=>{
 const wav=readFileSync('our-polaroid-project/audio/paper-floop-v33.wav');
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),24000);
 const samples=[];for(let i=44;i<wav.length;i+=2)samples.push(wav.readInt16LE(i));
 assert.equal(samples.length/24000,.51);assert.equal(samples[0],0);assert.equal(samples.at(-1),0);assert.ok(Math.max(...samples.map(Math.abs))<5000);
});


test('Polaroid Portfolio loops while Event cards stop at both album boundaries',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');
 environment();try{
  const items=[{src:'a.jpg',title:'First'},{src:'b.jpg',title:'Last'}];
  const event=new PolaroidCardViewer({immersive:true,loop:false,sound:false});event.reduced.matches=true;event.open(items);
  assert.equal(event.prev.disabled,true);assert.equal(event.next.disabled,false);await event.toss(-1);assert.equal(event.index,0);assert.equal(event.turning,false);
  await event.toss(1);assert.equal(event.index,1);assert.equal(event.next.disabled,true);assert.equal(event.prev.disabled,false);await event.toss(1);assert.equal(event.index,1);event.destroy();
  const portfolio=new PolaroidCardViewer({immersive:true,sound:false});portfolio.reduced.matches=true;portfolio.open(items);assert.equal(portfolio.prev.disabled,false);await portfolio.toss(-1);assert.equal(portfolio.index,1);await portfolio.toss(1);assert.equal(portfolio.index,0);portfolio.destroy();
  const single=new PolaroidCardViewer({immersive:true,loop:false,sound:false});single.open([items[0]]);assert.equal(single.prev.disabled,true);assert.equal(single.next.disabled,true);single.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('all 234 recorded Brain and Heart scores survive artwork-edition filtering in stats and shelf links',async()=>{const {collectionStats,perspectiveStats}=await import('../la-ola-cinema-club/assets/stats-data.js');const s=collectionStats(films);assert.equal(s.pairs,236);assert.equal(distribution(films,'brain').count,236);assert.equal(distribution(films,'heart').count,236);assert.ok(Math.abs(s.brainMean-3.1514830508474576)<1e-12);assert.ok(Math.abs(s.heartMean-3.469279661016949)<1e-12);assert.equal(perspectiveStats(films,'brain').count,236);assert.equal(historicalTrends(films).unknown,30);const bad=films.filter(f=>Math.abs(f.brain+f.heart-f.clubScore)>1e-8);assert.deepEqual(bad.map(f=>f.title),['The Dutchman']);assert.match(bad[0].ratingAuthority,/printed review card is authoritative/);});
test('reading position follows the visible section rather than resetting every swipe to artwork',async()=>{const {readingPosition}=await import('../la-ola-cinema-club/assets/review-navigation.js');const anchors=[{id:'review-card',top:100,height:600},{id:'review-overview',top:740,height:1100},{id:'review-reactions',top:1200,height:400},{id:'community-feedback',top:1660,height:600}];assert.equal(readingPosition(anchors,80).section,'review-card');assert.equal(readingPosition(anchors,900).section,'review-overview');const p=readingPosition(anchors,1400);assert.equal(p.section,'review-reactions');assert.equal(p.fraction,.5);assert.equal(readingPosition(anchors,1900).section,'community-feedback');});
// Owner's live iPhone refinements: opt-in, one shared gesture engine, no media edits.
test('physical paper flip is an opt-in true reverse, keeping Cinema activation unchanged',()=>{
 environment();try{
  let cinemaDetails=0,photoDetails=0;
  const cinema=new CardViewer({immersive:true,sound:false,onActivate:()=>cinemaDetails++});cinema.open([{src:'cinema.jpg'}]);
  assert.equal(cinema.physicalCard,false);assert.equal(cinema.reverse,undefined);cinema.flip();assert.equal(cinemaDetails,1);assert.equal(cinema.dialog.open,false);
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onActivate:()=>photoDetails++});v.open([{id:'stable',src:'scan.jpg'}]);
  v.flip();assert.equal(v.faceY,180);assert.match(v.card.style.transform,/rotateY\(180deg\)/);assert.equal(v.front.hidden,false,'front retains intrinsic sizing, its back face is culled in CSS');assert.equal(v.front.attributes['aria-hidden'],'true');assert.equal(v.reverse.attributes['aria-hidden'],'false');assert.equal(v.reverse.children.length,0,'no fabricated number/story or actual back scan');assert.equal(v.back.hidden,true);assert.equal(photoDetails,0);assert.equal(v.dialog.open,true);
  v.reduced.matches=true;v.flip();assert.match(v.card.style.transform,/rotateY\(0deg\)/);v.flip();assert.match(v.card.style.transform,/rotateY\(180deg\)/,'reduced motion still selects the reverse');
  assert.equal(v.image.src,'scan.jpg');v.activate();assert.equal(photoDetails,1);v.destroy();cinema.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical rotation controls contain the whole portrait and leave its canonical asset untouched',()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.open([{id:'same',src:'source.jpg'}]);v.card.offsetWidth=360;v.card.offsetHeight=600;v.stage.clientWidth=390;v.stage.clientHeight=844;
  v.rotate(90);assert.equal(v.orientation,90);let fit=Number(v.card.style.transform.match(/scale\(([^)]+)\)/)[1]);assert.ok(fit*600<=390*.94+.001);assert.match(v.card.style.transform,/rotateZ\(90deg\)/);
  v.rotate(-90);assert.equal(v.orientation,0);v.rotate(-90);assert.equal(v.orientation,270);v.reset();assert.equal(v.orientation,0);assert.equal(v.items[0].id,'same');assert.equal(v.image.src,'source.jpg');v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('two-finger paper sweep turns only on release; pinch/twist and cancellation never flip or browse',()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.open([{src:'a.jpg'},{src:'b.jpg'}]);
  const event=points=>({changedTouches:points.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY,target:v.image})),preventDefault(){}});
  v.stage.emit('touchstart',event([[1,80,250],[2,180,250]]));v.stage.emit('touchmove',event([[1,210,250],[2,310,250]]));assert.equal(v.faceY,0);assert.ok(v.turnPreview>=90);v.stage.emit('touchend',event([[1,210,250],[2,310,250]]));assert.equal(v.faceY,180);assert.equal(v.index,0);assert.equal(v.dialog.open,true);
  v.reset();v.stage.emit('touchstart',event([[1,80,250],[2,180,250]]));v.stage.emit('touchend',event([[1,210,250],[2,310,250]]));assert.equal(v.faceY,180,'native release coordinates can complete a turn without touchmove');
  v.reset();v.stage.emit('touchstart',event([[1,80,250],[2,180,250]]));v.stage.emit('touchmove',event([[1,210,250],[2,310,250]]));v.stage.emit('touchcancel',event([[1,210,250],[2,310,250]]));assert.equal(v.faceY,0);
  v.reset();v.stage.emit('touchstart',event([[1,100,250],[2,200,250]]));v.stage.emit('touchmove',event([[1,200,180],[2,350,340]]));v.stage.emit('touchend',event([[1,200,180],[2,350,340]]));assert.equal(v.faceY,0);assert.ok(v.scale>2);assert.ok(v.rotZ>40);assert.equal(v.index,0);
  v.reset();v.stage.emit('touchstart',event([[1,100,250],[2,200,250]]));v.stage.emit('touchmove',event([[1,110,250],[2,210,250]]));v.stage.emit('touchend',event([[1,110,250],[2,210,250]]));assert.equal(v.faceY,0);assert.equal(v.index,0);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('upward physical toss returns the SAME item without navigation or activation and cancels on close/reset',async()=>{
 const d=environment();try{
  let navigated=0,activated=0,finish,cancelled=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:()=>navigated++,onActivate:()=>activated++});v.open([{id:'same',src:'a.jpg'},{id:'other',src:'b.jpg'}]);
  const captured=[];v.card.animate=(frames)=>{captured.push(frames);return{finished:new Promise(resolve=>finish=resolve),cancel(){cancelled++;finish();}}};
  const home=v.card.style.transform,pending=v.loft();await v.loft();assert.equal(captured.length,1,'rapid repeated toss does not create another animation');assert.equal(v.index,0);assert.equal(v.turning,true);finish();await pending;assert.equal(v.items[v.index].id,'same');assert.equal(v.card.style.transform,home);assert.equal(v.turning,false);assert.equal(navigated,0);assert.equal(activated,0);
  const opener=new Element('button');v.opener=opener;const closed=v.loft();v.close();await closed;assert.equal(cancelled,1);assert.equal(d.activeElement,opener);assert.equal(v.turning,false);assert.equal(v.index,0);
  v.open(v.items);const reset=v.loft();v.reset();await reset;assert.equal(cancelled,2);assert.equal(v.turning,false);
  v.reduced.matches=true;const before=captured.length;await v.loft();assert.equal(captured.length,before);assert.equal(v.index,0);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical top/bottom quarters trigger during held movement after twist and zoom; release cannot repeat',async()=>{
 const d=environment();try{
  let exit=0,details=0,loft=0,nav=0;const opener=new Element('button');const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onDismiss:()=>exit++,onActivate:()=>details++,onNavigate:()=>nav++});v.reduced.matches=true;
  const actual=v.loft.bind(v);v.loft=()=>{loft++;return actual()};const point=(x,y,timeStamp=1000)=>({...pointer(x,y),timeStamp,pointerType:'native-touch',target:v.image});
  for(const rot of [0,90,180,270])for(const scale of [1,1.2,2]){
   v.open([{src:'a.jpg'},{src:'b.jpg'}],0,opener);v.rotZ=rot;v.zoom(scale);v.down(point(200,320));v.drag(point(200,151,1200));const before=loft;v.drag(point(200,140,1300));await Promise.resolve();assert.equal(loft,before+1,'held top-quarter entry triggers at any pose');assert.equal(v.index,0);assert.equal(v.panX,0);assert.equal(v.scale,1);v.up(point(200,100,1500),true);assert.equal(loft,before+1);
   v.open(v.items,0,opener);v.rotZ=rot;v.zoom(scale);v.down(point(200,320));v.drag(point(200,449,1200));const exits=exit;assert.equal(v.dialog.open,true);v.drag(point(200,460,1300));await Promise.resolve();assert.equal(exit,exits+1,'held bottom-quarter entry exits even after zoom/twist');assert.equal(v.dialog.open,false);v.up(point(200,580,1400),true);assert.equal(exit,exits+1);assert.equal(d.activeElement,opener);
  }
  assert.equal(nav,0);assert.equal(details,0);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical keyboard controls and one visibility state reveal and release every control area',()=>{
 const d=environment();try{
  let exit=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onDismiss:()=>exit++});v.open([{src:'a.jpg'}]);
  assert.equal(v.dialog.dataset.controls,'false');v.dialog.emit('keydown',{key:'Tab',target:v.stage});assert.equal(v.dialog.dataset.controls,'true');const top=new Element('button');v.dialog.append(top);top.focus();v.setControls(false);assert.equal(d.activeElement,v.stage);assert.equal(v.dialog.dataset.controls,'false');
  v.stage.emit('click',{target:v.stage});assert.equal(v.dialog.dataset.controls,'true');v.stage.emit('click',{target:v.stage});assert.equal(v.dialog.dataset.controls,'false');
  v.dialog.emit('keydown',{key:'f',target:v.stage});assert.equal(v.faceY,180);v.dialog.emit('keydown',{key:'R',shiftKey:true,target:v.stage});assert.equal(v.orientation,270);v.dialog.emit('keydown',{key:'Escape',target:v.stage});assert.equal(exit,1);assert.equal(v.dialog.open,false);v.destroy();
  const css=readFileSync('our-polaroid-project/memory-viewer.css','utf8');assert.doesNotMatch(css,/focus-visible\s+\.ola-physical-card\s*\{outline/);assert.match(css,/data-controls=true.*polaroid-stage-return/);assert.match(css,/button:focus-visible\{outline:3px/);
  const shared=readFileSync('assets/ola-worlds/card-viewer.css','utf8');assert.match(shared,/data-physical=true.*ola-card-front\{backface-visibility:hidden/);assert.match(shared,/ola-card-paper-reverse.*rotateY\(180deg\)/);
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical two-finger angle wraparound retains simultaneous pan and zoom, never a flip or toss',()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.open([{src:'a.jpg'},{src:'b.jpg'}]);
  const event=points=>({changedTouches:points.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY,target:v.image})),preventDefault(){}});
  const points=(angle,length,cx=200,cy=250)=>{const x=Math.cos(angle*Math.PI/180)*length/2,y=Math.sin(angle*Math.PI/180)*length/2;return [[1,cx-x,cy-y],[2,cx+x,cy+y]]};
  v.stage.emit('touchstart',event(points(170,100)));v.stage.emit('touchmove',event(points(-170,150,230,280)));
  assert.ok(Math.abs(v.rotZ-20)<.001,'angle delta crosses the wrap rather than jumping 340 degrees');assert.ok(Math.abs(v.scale-1.5)<.001);assert.ok(Math.abs(v.panX-30)<.001);assert.ok(Math.abs(v.panY-30)<.001);assert.equal(v.turnPreview,0);
  v.stage.emit('touchend',event(points(-170,150,230,280)));assert.equal(v.faceY,0);assert.equal(v.index,0);assert.equal(v.dialog.open,true);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical Event endpoints stay bounded even when reversed; Portfolio still wraps',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');environment();try{
  const items=[{id:'first',src:'a.jpg'},{id:'last',src:'b.jpg'}];const e=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false,loop:false});e.reduced.matches=true;e.open(items);e.flip();await e.toss(-1);assert.equal(e.index,0);assert.equal(e.faceY,180);assert.equal(e.prev.disabled,true);await e.toss(1);assert.equal(e.index,1);assert.equal(e.next.disabled,true);assert.equal(e.faceY,0);await e.toss(1);assert.equal(e.index,1);await e.loft();assert.equal(e.index,1);e.destroy();
  const p=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false});p.reduced.matches=true;p.open(items);await p.toss(-1);assert.equal(p.index,1);await p.toss(1);assert.equal(p.index,0);p.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('Polaroid factory keeps actual details/downloads distinct from paper reverse and returns downward to the grid',async()=>{
 const {createPolaroidMemoryViewer}=await import('../our-polaroid-project/memory-viewer.js');const d=environment(),oldObserver=globalThis.MutationObserver,oldLocation=globalThis.location;
 const create=d.createElement;d.createElement=tag=>{const n=create(tag);if(tag==='link')n.sheet={};n.removeAttribute=k=>delete n.attributes[k];return n;};d.querySelector=selector=>selector==='link[data-ola-viewer]'?d.head.children.find(n=>'olaViewer' in n.dataset):null;
 globalThis.MutationObserver=class{observe(){}disconnect(){}};globalThis.location={href:'https://example.test/album/#photo=owner-approved'};
 try{
  let closed=0,navigated=0;const controller=await createPolaroidMemoryViewer({loop:false,onClose:()=>closed++,onNavigate:()=>navigated++});const opener=new Element('button');opener.isConnected=true;
  const photo={sourceId:'owner-approved',src:'display.jpg',download:'original.jpg',inline:'original.jpg?inline=1',filename:'original-scan.jpg',alt:'Recorded memory',story:'Public story',privateMemory:'NEVER SHOW'};
  assert.equal(controller.open([photo],0,opener,{collection:'Approved event'}),true);
  const dialog=d.body.children.find(n=>n.className.includes('ola-card-immersive')),details=d.body.children.find(n=>n.className==='polaroid-memory-dialog');const tools=dialog.children.find(n=>n.className==='ola-card-tools'),stage=dialog.children.find(n=>n.className==='ola-card-stage');
  assert.equal(dialog.dataset.controls,'false');assert.equal(dialog.dataset.physical,'true');assert.equal(details.open,undefined);
  const backControl=tools.children.find(n=>n.dataset.world==='card-read-the-back'),soundControl=tools.children.find(n=>n.dataset.world==='card-sound-on');assert.equal(backControl.hidden,true);assert.equal(backControl.disabled,true);assert.equal(soundControl.hidden,false);assert.equal(Boolean(soundControl.disabled),false);assert.equal(soundControl.attributes['aria-pressed'],'true');assert.equal(soundControl.textContent,'Photo sound on');
  tools.children.find(n=>n.textContent==='Turn card over').onclick();assert.equal(details.open,undefined,'physical back does not pretend to be memory details');
  tools.children.find(n=>n.textContent==='Memory details').onclick();assert.equal(details.open,true);assert.equal(dialog.open,false);assert.equal(details.dataset.photoId,'owner-approved');
  const link=details.children.find(n=>n.className==='memory-original');assert.equal(link.href,'original.jpg');assert.equal(link.download,'original-scan.jpg');assert.equal(details.children.find(n=>n.className==='memory-inline').href,'original.jpg?inline=1');
  details.children.find(n=>n.className==='memory-toolbar').children[0].emit('click',{});assert.equal(dialog.open,true);assert.equal(details.open,false);
  const tap=t=>{const point={identifier:7,clientX:200,clientY:300,target:stage.children[0]};stage.emit('touchstart',{timeStamp:t,changedTouches:[point]});stage.emit('touchend',{timeStamp:t+30,changedTouches:[point]});};
  tap(2000);assert.equal(details.open,false,'factory single photo tap stays on photograph');tap(2350);assert.equal(details.open,true,'factory double tap opens the existing details menu');assert.equal(details.dataset.photoId,'owner-approved');details.children.find(n=>n.className==='memory-toolbar').children[0].emit('click',{});assert.equal(dialog.open,true);
  stage.emit('touchstart',{changedTouches:[{identifier:1,clientX:200,clientY:100,target:stage.children[0]}]});stage.emit('touchend',{changedTouches:[{identifier:1,clientX:200,clientY:580,target:stage.children[0]}]});await new Promise(resolve=>setTimeout(resolve,280));
  assert.equal(dialog.open,false);assert.equal(details.open,false);assert.equal(closed,1);assert.equal(navigated,0);assert.equal(d.activeElement,opener);controller.destroy();
 }finally{if(oldObserver===undefined)delete globalThis.MutationObserver;else globalThis.MutationObserver=oldObserver;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;delete globalThis.document;delete globalThis.matchMedia;}
});


test('physical flick intent is screen-relative and rejects slow positioning, diagonal and multi gestures',()=>{
 for(const dx of [-180,180])assert.equal(physicalGestureAction({dx,velocityX:dx/100}),dx<0?'next':'previous');
 assert.equal(physicalGestureAction({dy:-180,velocityY:-1.8}),'return');
 for(const input of [{dx:-180,velocityX:-.1},{dy:-180,velocityY:-.1},{dx:-180,dy:170,velocityX:-2},{dx:-180,velocityX:-2,multi:true},{dy:-180,velocityY:-2,multi:true}])assert.equal(physicalGestureAction(input),'pose');
});

test('physical slow drags preserve each released pose at every orientation and modest zoom; reset is explicit',()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.open([{src:'a.jpg'},{src:'b.jpg'}]);
  const point=(x,y,timeStamp)=>({...pointer(x,y),timeStamp,target:v.image});
  for(const rot of [0,90,180,270])for(const scale of [1,1.15]){
   v.reset();v.rotZ=rot;v.panX=12;v.panY=-9;v.zoom(scale,{keepPan:true});
   v.down(point(180,260,1000));v.drag(point(240,300,1600));const released=v.physicalPose();v.up(point(240,300,1800),true);
   assert.deepEqual(v.physicalPose(),released);assert.equal(v.index,0);assert.ok(Math.abs(v.rotZ-rot)<4);assert.ok(v.panX>12);assert.ok(v.panY>-9);
   v.down(point(240,300,2000));v.drag(point(220,320,2600));const cancelled=v.physicalPose();v.up(point(220,320,2800),false);assert.deepEqual(v.physicalPose(),cancelled);
  }
  v.reset();assert.deepEqual(v.physicalPose(),{panX:0,panY:0,rotX:0,rotY:0,rotZ:0,orientation:0,faceY:0,scale:1});v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical coalesced native releases browse in screen directions at 90/180/270 degrees and modest zoom',async()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.reduced.matches=true;
  let pending;v.move=delta=>{pending=v.toss(delta)};const event=(x,timeStamp)=>({timeStamp,changedTouches:[{identifier:1,clientX:x,clientY:300,target:v.image}]});
  for(const rot of [90,180,270])for(const scale of [1,1.2])for(const sign of [-1,1]){
   v.open([{id:'first',src:'a.jpg'},{id:'middle',src:'b.jpg'},{id:'last',src:'c.jpg'}],1);v.rotZ=rot;v.zoom(scale);v.paint();
   v.stage.emit('touchstart',event(200,1000));v.stage.emit('touchend',event(200+sign*150,1100));await pending;
   assert.equal(v.index,sign<0?2:0);assert.equal(v.pointers.size,0);assert.equal(v.dialog.dataset.dragging,'false');assert.equal(v.suppressTap,true);
  }v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('batched and staggered native two-finger releases cannot browse, dismiss or launch a boomerang',()=>{
 environment();try{
  let dismissed=0,activated=0,loft=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onDismiss:()=>dismissed++,onActivate:()=>activated++});
  const event=(points,timeStamp)=>({timeStamp,changedTouches:points.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY,target:v.image}))});v.loft=()=>loft++;
  for(const staggered of [false,true])for(const delta of [[-180,0],[180,0],[0,-250],[0,480]]){
   v.open([{src:'a.jpg'},{src:'b.jpg'}]);v.stage.emit('touchstart',event([[1,100,100],[2,200,100]],1000));
   const moved=[[1,100+delta[0],100+delta[1]],[2,200+delta[0],100+delta[1]]];
   if(staggered){v.stage.emit('touchend',event([moved[0]],1100));v.stage.emit('touchend',event([[2,moved[1][1]-180,moved[1][2]+100]],1150));}
   else v.stage.emit('touchend',event(moved,1100));
   assert.equal(v.index,0);assert.equal(v.dialog.open,true);assert.equal(v.pointers.size,0);assert.equal(dismissed,0);assert.equal(activated,0);assert.equal(loft,0);
  }v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('top-zone boomerang visibly spins offscreen and returns same photo centered/full-fit without changing hash',async()=>{
 environment();const oldLocation=globalThis.location;globalThis.location={hash:'#photo=same'};try{
  let navigation=0,resolve,frames;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:()=>navigation++});v.open([{id:'same',src:'a.jpg'},{id:'other',src:'b.jpg'}]);const centered=v.card.style.transform;v.rotZ=135;v.orientation=90;v.panX=22;v.panY=31;v.scale=1.2;v.paint();
  v.card.animate=f=>{frames=f;return{finished:new Promise(r=>resolve=r),cancel(){resolve()}}};
  const point=(y,timeStamp)=>({...pointer(200,y),timeStamp,pointerType:'native-touch',target:v.image});v.down(point(400,1000));v.drag(point(100,1400));
  assert.equal(v.returning,true);assert.match(frames[1].transform,/rotateX\(75deg\).*rotateY\(0deg\)/);assert.equal(frames.at(-1).transform,centered.replace('rotateX(0deg)','rotateX(360deg)'));assert.ok(frames.every(f=>f.opacity===undefined),'natural viewport departure, not a fade');assert.ok(Number(frames[2].transform.match(/,-([\d.]+)px/)[1])>v.stage.clientHeight+v.card.clientHeight);
  v.up(point(100,1500),true);resolve();await Promise.resolve();assert.deepEqual(v.physicalPose(),{panX:0,panY:0,rotX:0,rotY:0,rotZ:0,orientation:0,faceY:0,scale:1});assert.equal(v.card.style.transform,centered);assert.equal(v.items[v.index].id,'same');assert.equal(v.image.src,'a.jpg');assert.equal(globalThis.location.hash,'#photo=same');assert.equal(navigation,0);v.destroy();
 }finally{if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;delete globalThis.document;delete globalThis.matchMedia;}
});

test('boomerang completion never resurrects a new item or destroyed viewer',async()=>{
 environment();try{
  for(const action of ['show','destroy']){let resolve,cancelled=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.open([{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}]);v.card.animate=()=>({finished:new Promise(r=>resolve=r),cancel(){cancelled++;resolve()}});const pending=v.loft();
   if(action==='show'){v.index=1;v.show();}else v.destroy();await pending;assert.equal(cancelled,1);assert.equal(v.returning,false);assert.equal(v.turning,false);if(action==='show'){assert.equal(v.image.src,'b.jpg');assert.equal(v.rotZ,0);v.destroy();}else assert.equal(v.dialog.open,false);
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

import {watchedRecords,collectionStats} from '../la-ola-cinema-club/assets/stats-data.js';
const datedFilmFixture=(id,date,extra={})=>({id,dates:{watched:date},...extra});
test('watched stats require verified dates and reject reservation/attendance conflicts',()=>{
 const source=[datedFilmFixture('confirmed',{value:'2026-11-01',verified:true}),datedFilmFixture('reservation',{value:'2026-11-01',verified:true,kind:'amc-reservation'}),datedFilmFixture('not-attended',{value:'2026-11-01',verified:true,confirmedAttendance:false}),datedFilmFixture('unverified',{value:'2026-11-01',verified:false}),datedFilmFixture('invalid',{value:'2026-02-30',verified:true}),{id:'legacy',watchMonth:'2026-11',year:2026,currentClubCard:true}];
 assert.deepEqual(watchedRecords(source,{year:'2026'}).map(f=>f.id),['confirmed']);
});
test('year/month scopes use watched dates independently of edition/release year',()=>{
 const source=[datedFilmFixture('archive',{value:'2026-11-01',verified:true},{currentClubCard:false,year:2025,genre:'Drama',stamp:'Hits Home'}),datedFilmFixture('older-year',{value:'2025-11-01',verified:true},{currentClubCard:true,year:2026,genre:'Drama'}),datedFilmFixture('other-month',{value:'2026-10-01',verified:true},{genre:'Horror'}),datedFilmFixture('year-only',{value:'2026',verified:true})];
 assert.equal(watchedRecords(source,{year:2026}).length,3);
 assert.deepEqual(watchedRecords(source,{year:2026,month:11,genre:'Drama',stamp:'Hits Home'}).map(f=>f.id),['archive']);
 assert.deepEqual(watchedRecords(source,{year:2025}).map(f=>f.id),['older-year']);
 assert.equal(watchedRecords(source,{year:2026,month:12}).length,0);
});
test('review-backed AMC reconciliation populates viewing years without changing the November sample',()=>{
 const source=JSON.parse(readFileSync('la-ola-cinema-club/data/films.json'));const year=watchedRecords(source,{year:'2026'}),nov=watchedRecords(source,{year:'2026',month:'11'});
 assert.equal(source.length,236);assert.equal(year.length,81);assert.equal(source.length-watchedRecords(source).length,27);assert.equal(nov.length,10);assert.equal(collectionStats(source).pairs,236);assert.ok(Math.abs(collectionStats(nov).average-7.65)<1e-10);
});


test('physical edge zones use stage offsets, deliberate travel and vertical dominance, never edge taps',()=>{
 for(const input of [{dy:50,y:590},{dy:-30,y:20},{dy:100,dx:100,y:590},{dy:-120,y:30,multi:true},{dy:140,y:480,multi:true}])assert.equal(physicalEdgeAction({stageHeight:600,...input}),'pose');
 assert.equal(physicalEdgeAction({dy:100,y:550,stageTop:100,stageHeight:600}),'exit');assert.equal(physicalEdgeAction({dy:-100,y:250,stageTop:100,stageHeight:600}),'return');
 assert.equal(physicalEdgeAction({dy:100,y:549,stageTop:100,stageHeight:600}),'pose');assert.equal(physicalEdgeAction({dy:-100,y:251,stageTop:100,stageHeight:600}),'pose');
});

test('a consumed held gesture cannot restart or navigate when a second finger arrives or release is delayed',async()=>{
 environment();try{
  let resolve,nav=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:()=>nav++});v.open([{src:'a.jpg'},{src:'b.jpg'}]);v.card.animate=()=>({finished:new Promise(r=>resolve=r),cancel(){resolve()}});
  const p=(x,y,id=1)=>({...pointer(x,y,id),timeStamp:1000,target:v.image});v.down(p(200,350));v.drag(p(200,100));assert.equal(v.returning,true);assert.equal(v.pointers.size,0);v.down(p(100,200,2));assert.equal(v.pointers.size,0);assert.equal(v.consumedPointers.size,2);resolve();await Promise.resolve();
  v.drag(p(0,100));v.up(p(0,100),true);assert.equal(v.index,0);v.up(p(380,590,2),false);assert.equal(v.consumedPointers.size,0);assert.equal(nav,0);assert.equal(v.dialog.open,true);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('mid-screen upward positioning stays put; short edge pulls and edge-start taps do not trigger',()=>{
 environment();try{
  let loft=0,exit=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onDismiss:()=>exit++});v.open([{src:'a.jpg'},{src:'b.jpg'}]);v.loft=()=>loft++;
  const p=(y,t)=>({...pointer(200,y),timeStamp:t,target:v.image});
  for(const [from,to] of [[400,230],[550,590],[80,25]]){v.down(p(from,1000));v.drag(p(to,1800));const pose=v.physicalPose();v.up(p(to,2000),true);assert.deepEqual(v.physicalPose(),pose);assert.equal(loft,0);assert.equal(exit,0);assert.equal(v.dialog.open,true);}
  v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('Polaroid controls use a low safe-area inset and stage-only mark that cannot cover or intercept the scan',()=>{
 const css=readFileSync('our-polaroid-project/memory-viewer.css','utf8'),source=readFileSync('our-polaroid-project/memory-viewer.js','utf8');assert.match(css,/inset:auto 8px max\(4px,env\(safe-area-inset-bottom\)\)/);assert.match(css,/polaroid-stage-mark\{[^}]*pointer-events:none/);assert.match(css,/data-controls=true\]>.polaroid-stage-mark\{visibility:hidden/);assert.match(source,/stageMark.setAttribute\('aria-hidden', 'true'\)/);assert.match(source,/viewer.dialog.append\(stageMark, toGrid, controls\)/);
});

test('closing, resetting or destroying a held-edge return consumes its late releases without reopening or navigation',async()=>{
 environment();try{
  for(const action of ['close','reset','destroy']){
   let resolve,nav=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:()=>nav++});v.open([{src:'a.jpg'},{src:'b.jpg'}]);v.card.animate=()=>({finished:new Promise(r=>resolve=r),cancel(){resolve()}});
   const p=(y,id=1)=>({...pointer(200,y,id),timeStamp:1000,target:v.image});v.down(p(350));v.drag(p(100));assert.equal(v.returning,true);v[action]();assert.equal(v.returning,false);assert.equal(v.pointers.size,0);
   if(action==='reset'){v.down(p(400,2));assert.equal(v.pointers.size,0,'old held gesture prevents a new gesture during reset');v.up(p(400,2),false);}
   v.up(p(580),true);await Promise.resolve();assert.equal(v.consumedPointers.size,0);assert.equal(v.index,0);assert.equal(nav,0);assert.equal(v.turning,false);assert.equal(v.dialog.open,action==='reset');if(action!=='destroy')v.destroy();
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('shared reviewer distribution aligns exact grades and keeps zero counts on one common scale',async()=>{
 const {comparisonDistribution}=await import('../la-ola-cinema-club/assets/stats-data.js');
 const data=comparisonDistribution([{brain:3.25,heart:4},{brain:4,heart:4},{brain:3.25,heart:5},{brain:5,heart:null}]);
 assert.deepEqual(data.rows.map(r=>r.score),[3.25,4,5]);assert.equal(data.brainCount,3);assert.equal(data.heartCount,3);assert.equal(data.maxCount,2);
 assert.deepEqual(data.rows.map(r=>[r.brain.length,r.heart.length]),[[2,0],[1,2],[0,1]]);
 const full=comparisonDistribution(films);assert.equal(full.brainCount,236);assert.equal(full.heartCount,236);assert.equal(full.rows.reduce((n,r)=>n+r.brain.length,0),236);assert.equal(full.rows.reduce((n,r)=>n+r.heart.length,0),236);
});


test('explicit Toss and return plays once with reduced motion while automatic top-edge motion stays reduced',async()=>{
 environment();try{
  let finish,animations=0,frames,nav=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:()=>nav++});v.reduced.matches=true;v.open([{id:'same',src:'a.jpg'},{id:'other',src:'b.jpg'}]);v.card.animate=f=>{animations++;frames=f;return{finished:new Promise(r=>finish=r),cancel(){finish()}}};
  v.rotZ=90;v.panX=20;v.scale=1.2;v.paint();await v.loft();assert.equal(animations,0,'automatic reduced-motion path still recenters without a flourish');
  assert.match(v.returnButton.title,/Play the full/);const pending=v.returnButton.onclick();assert.equal(animations,1,'explicit button requests one playback, without changing the preference');assert.equal(v.reduced.matches,true);assert.equal(v.turning,true);assert.match(frames[1].transform,/rotateX\(75deg\)/);assert.match(frames[2].transform,/rotateX\(180deg\)/);finish();await pending;assert.equal(v.turning,false);assert.equal(v.items[v.index].id,'same');assert.equal(nav,0);assert.equal(v.scale,1);assert.equal(v.panX,0);
  v.dialog.emit('keydown',{key:'ArrowUp',target:v.stage});assert.equal(animations,2,'explicit keyboard alternative also requests playback');v.close();await Promise.resolve();assert.equal(v.turning,false);assert.equal(v.reduced.matches,true);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('explicit motion choice does not enable automatic edge animations or affect default Cinema',async()=>{
 environment();try{
  let plays=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.reduced.matches=true;v.open([{src:'a.jpg'}]);v.card.animate=()=>{plays++;return{finished:Promise.resolve(),cancel(){}}};await v.loft({playMotion:true});assert.equal(plays,1);
  const p=(y,t)=>({...pointer(200,y),timeStamp:t,target:v.image});v.down(p(350,1000));v.drag(p(100,1400));v.up(p(100,1500),true);await Promise.resolve();assert.equal(plays,1,'a later gesture still respects the unchanged system preference');assert.equal(v.reduced.matches,true);v.destroy();
  const cinema=new CardViewer({immersive:true,sound:false});cinema.reduced.matches=true;cinema.open([{src:'cinema.jpg'}]);cinema.card.animate=()=>{throw Error('default Cinema must not run the Polaroid effect')};assert.equal(cinema.returnButton,undefined);await cinema.loft({playMotion:true});assert.equal(cinema.turning,false);cinema.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('explicit toss keeps existing cancellation and safe missing-animation fallback',async()=>{
 environment();try{
  for(const action of ['close','reset','show','destroy']){
   let finish,cancelled=0;const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.reduced.matches=true;v.open([{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}]);v.card.animate=()=>({finished:new Promise(r=>finish=r),cancel(){cancelled++;finish()}});const pending=v.returnButton.onclick();assert.equal(v.returning,true);
   if(action==='show'){v.index=1;v.show();}else v[action]();await pending;assert.equal(cancelled,1);assert.equal(v.turning,false);assert.equal(v.returning,false);assert.equal(v.reduced.matches,true);assert.equal(v.index,action==='show'?1:0);if(action!=='destroy')v.destroy();
  }
  const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.reduced.matches=true;v.open([{id:'same',src:'a.jpg'}]);v.panX=90;v.card.animate=undefined;await v.returnButton.onclick();assert.equal(v.turning,false);assert.equal(v.panX,0);assert.equal(v.items[v.index].id,'same');assert.equal(v.reduced.matches,true);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});


test('gentle physical return makes one monotonic pitch turn, keeps yaw zero and lands without overscale',async()=>{
 environment();try{
  let frames,options,finish;const v=new CardViewer({immersive:true,physicalCard:true,sound:false});v.open([{id:'same',src:'source.jpg'}]);v.card.offsetWidth=360;v.card.offsetHeight=600;v.stage.clientWidth=390;v.stage.clientHeight=844;v.paint();
  const fit=Number(v.card.style.transform.match(/scale\(([^)]+)\)/)[1]);v.card.animate=(f,o)=>{frames=f;options=o;return{finished:new Promise(r=>finish=r),cancel(){finish()}}};const p=v.loft({playMotion:true});
  const pitches=frames.slice(1).map(f=>Number(f.transform.match(/rotateX\(([^)]+)deg\)/)[1]));assert.deepEqual(pitches,[75,180,245,355,360]);assert.ok(frames.slice(1).every(f=>/rotateY\(0deg\)/.test(f.transform)));assert.ok(frames.slice(1).every(f=>Number(f.transform.match(/scale\(([^)]+)\)/)[1])<=fit));assert.equal(options.duration,1150);assert.match(frames.at(-1).transform,/translate\(0px,0px\)/);finish();await p;assert.equal(v.index,0);assert.equal(v.image.src,'source.jpg');assert.match(v.card.style.transform,/rotateX\(0deg\)/);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});


test('front-only physical mode disables button, F and two-finger paper sweep while keeping twist and pan',()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,paperBack:false,sound:false});v.open([{src:'a.jpg'},{src:'b.jpg'}]);assert.equal(v.flipButton.hidden,true);assert.equal(v.flipButton.disabled,true);v.flip();assert.equal(v.faceY,0);v.dialog.emit('keydown',{key:'f',target:v.stage});assert.equal(v.faceY,0);
  const ev=(points,t)=>({timeStamp:t,changedTouches:points.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY,target:v.image}))});
  v.stage.emit('touchstart',ev([[1,80,250],[2,180,250]],1000));v.stage.emit('touchmove',ev([[1,210,250],[2,310,250]],1400));assert.equal(v.turnPreview,0);assert.equal(v.panX,130);v.stage.emit('touchend',ev([[1,210,250],[2,310,250]],1500));assert.equal(v.faceY,0);assert.equal(v.index,0);
  v.reset();v.stage.emit('touchstart',ev([[1,100,200],[2,200,200]],2000));v.stage.emit('touchmove',ev([[1,150,150],[2,150,300]],2400));v.stage.emit('touchend',ev([[1,150,150],[2,150,300]],2500));assert.ok(v.scale>1);assert.ok(v.rotZ>80);assert.equal(v.faceY,0);assert.equal(v.index,0);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('fresh background swipes recover held offscreen photos at slow speeds and after pauses without changing card posing',async()=>{
 environment();try{
  const v=new CardViewer({immersive:true,physicalCard:true,paperBack:false,backgroundNavigation:true,sound:false});v.reduced.matches=true;const items=[{id:'first',src:'a.jpg'},{id:'middle',src:'b.jpg'},{id:'last',src:'c.jpg'}];const p=(x,y,t,target)=>({...pointer(x,y),timeStamp:t,target});
  for(const side of [-1,1])for(const scale of [1,1.3])for(const edge of [100,300]){
   v.open(items,1);v.rotZ=side*90;v.zoom(scale);v.down(p(200,300,1000,v.image));v.drag(p(200+side*800,300,2500,v.image));v.up(p(200+side*800,300,2800,v.image),true);assert.equal(v.index,1);assert.ok(Math.abs(v.panX)>=v.stage.clientWidth*.6);
   v.down(p(edge,300,3500,v.stage));v.drag(p(edge-side*150,300,4300,v.stage));v.up(p(edge-side*150,300,4700,v.stage),true);await new Promise(r=>setImmediate(r));assert.equal(v.index,side>0?2:0);assert.equal(v.panX,0);assert.equal(v.scale,1);
  }
  v.open(items,1);v.down(p(200,300,1000,v.stage));v.drag(p(150,300,1500,v.stage));v.up(p(150,300,1800,v.stage),true);assert.equal(v.index,1,'short background pose does not navigate');
  v.down(p(200,300,2000,v.image));v.drag(p(50,300,3000,v.image));v.up(p(50,300,3300,v.image),true);assert.equal(v.index,1,'slow card-start drag still retains its pose');v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('background recovery never converts multi-touch or vertical gestures into horizontal navigation',async()=>{
 environment();try{
  let dismissed=0;const v=new CardViewer({immersive:true,physicalCard:true,backgroundNavigation:true,paperBack:false,sound:false,onDismiss:()=>dismissed++});v.reduced.matches=true;v.open([{src:'a.jpg'},{src:'b.jpg'}]);const p=(x,y,t,id=1)=>({...pointer(x,y,id),timeStamp:t,target:v.stage});
  v.down(p(200,300,1000));v.down(p(250,300,1000,2));v.drag(p(0,300,1500));v.up(p(0,300,1700),true);v.up(p(100,300,1800,2),true);assert.equal(v.index,0);assert.equal(v.dialog.open,true);
  v.down(p(200,300,2000));v.drag(p(100,400,2400));v.up(p(100,400,2700),true);assert.equal(v.index,0);v.down(p(200,200,3000));v.drag(p(200,560,3500));await Promise.resolve();assert.equal(dismissed,1);assert.equal(v.dialog.open,false);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('current Polaroid camera audio is the exact owner-selected recording and finite quiet PCM',()=>{
 const wav=readFileSync('our-polaroid-project/audio/polaroid-650-eject-v42.wav');assert.equal(createHash('sha256').update(wav).digest('hex'),'c5d2c58c20451b4bd5a63cbc693977811c6732d2fc679dbebcf1a3ec47d8ffdf');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),24000);assert.ok((wav.length-44)/48000>.5&&(wav.length-44)/48000<.7);
 const source=readFileSync('our-polaroid-project/paper-sound.js','utf8');assert.match(source,/audio\/polaroid-650-eject-v42.wav/);assert.match(source,/audio\/paper-floop-v33.wav/);const credits=readFileSync('our-polaroid-project/audio/POLAROID-650-EJECT-v42.txt','utf8');assert.match(credits,/larspriebe/);assert.match(credits,/CC0/);
});

test('owner diary corrections retain delayed Letterboxd provenance and separate researched Unseen dates',()=>{
 const emily=films.find(f=>f.id==='club-finding-emily'),paris=films.find(f=>f.id==='cinema2026-26'),dracula=films.find(f=>f.id==='cinema2026-30');
 assert.equal(filmDate(emily).value,'2026-09-04');assert.equal(emily.dateHistory[0].superseded.value,'2026-11-06');assert.equal(filmDate(paris).value,'2026-01-29');assert.equal(filmDate(dracula).value,'2026-11-06');
 const revealed=films.filter(f=>f.dates?.watched?.verificationMethod==='corroborated_unseen_reconciliation');assert.equal(revealed.length,12);assert.ok(revealed.every(f=>f.dates.watched.source.includes('AMC Unseen booking + historical reveal + existing reviewed card/order')));
 const bank=films.find(f=>f.id==='club-how-to-rob-a-bank');assert.equal(bank.brain,3);assert.equal(bank.heart,4.25);assert.equal(filmDate(bank).value,'2026-11-11');
});

test('Polaroid upward fling animates from held edge and released flick even with reduced motion, then returns same photo',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');
 environment();try{
  for(const reduced of [false,true])for(const input of ['held','flick']){
   let frames,finish,plays=0;const sounds=[],navigated=[];const v=new PolaroidCardViewer({immersive:true,physicalCard:true,paperBack:false,sound:false,onNavigate:item=>navigated.push(item.id)});v.reduced.matches=reduced;v.open([{id:'same',src:'a.jpg'},{id:'other',src:'b.jpg'}]);v.rotZ=90;v.zoom(1.2);v.paint();v.reelSound=kind=>sounds.push(kind);
   v.card.animate=f=>{plays++;frames=f;return{finished:new Promise(r=>finish=r),cancel(){finish()}}};
   const p=(y,t)=>({...pointer(200,y),pointerType:'native-touch',timeStamp:t,target:v.image});v.down(p(450,1000));v.drag(p(input==='held'?140:330,input==='held'?1600:1100));if(input==='flick')v.up(p(330,1100),true);
   assert.equal(plays,1,input+' must play a real animation, not only recenter');assert.equal(v.returning,true);assert.deepEqual(sounds,['return']);assert.equal(v.index,0);assert.equal(v.items[v.index].id,'same');assert.ok(frames.some(f=>/translate\(0px,-/.test(f.transform)));
   v.up(p(100,1800),true);assert.equal(plays,1,'release cannot repeat the consumed fling');finish();await new Promise(r=>setImmediate(r));assert.equal(v.turning,false);assert.equal(v.returning,false);assert.equal(v.panX,0);assert.equal(v.panY,0);assert.equal(v.scale,1);assert.equal(v.rotZ,0);assert.equal(v.image.src,'a.jpg');assert.deepEqual(navigated,[]);assert.equal(v.reduced.matches,reduced);v.destroy();
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('camera changes and return swoosh share one audio source and mute/destroy cancel either pending sound',async()=>{
 const {PaperSound}=await import('../our-polaroid-project/paper-sound.js');const oldAudio=globalThis.AudioContext,oldFetch=globalThis.fetch;const requests=new Map(),started=[];let stopped=0,closed=0;
 class Audio{constructor(){this.state='running';this.destination={}}resume(){return Promise.resolve()}decodeAudioData(bytes){return Promise.resolve({file:new TextDecoder().decode(bytes)})}createGain(){return{gain:{value:0},connect(){},disconnect(){}}}createBufferSource(){return{loop:null,connect(){},disconnect(){},start(){started.push(this.buffer.file)},stop(){stopped++}}}close(){closed++;this.state='closed';return Promise.resolve()}}
 globalThis.AudioContext=Audio;globalThis.fetch=url=>new Promise(resolve=>requests.set(String(url),()=>resolve({ok:true,arrayBuffer:async()=>new TextEncoder().encode(String(url)).buffer})));const flush=()=>new Promise(r=>setImmediate(r));
 try{
  const a=new PaperSound();a.burst();for(const release of requests.values())release();await flush();assert.equal(started.length,1);assert.match(started[0],/polaroid-650-eject-v42.wav/);
  a.burst('return');for(const release of requests.values())release();await flush();assert.equal(started.length,2);assert.match(started[1],/paper-floop-v33.wav/);assert.equal(stopped,1);assert.equal(a.source.loop,false);assert.equal(a.gain.gain.value,1);
  a.burst();assert.equal(started.length,3);assert.match(started[2],/polaroid-650-eject-v42.wav/);assert.equal(stopped,2);a.stop();assert.equal(a.source,null);a.destroy();assert.equal(closed,1);
  for(const action of ['stop','destroy']){requests.clear();const b=new PaperSound();b.burst('return');b[action]();for(const release of requests.values())release();await flush();assert.equal(started.length,3,'pending swoosh must not start after '+action);if(action==='stop')b.destroy();}
 }finally{if(oldAudio===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=oldAudio;globalThis.fetch=oldFetch;}
});

test('opt-in photo double tap ignores singles and native compatibility clicks, preserving keyboard and Cinema activation',()=>{
 environment();try{
  let activated=0;const v=new CardViewer({immersive:true,physicalCard:true,doubleTapDetails:true,sound:false,onActivate:()=>activated++});const items=[{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}];const p=(t,y=300)=>({...pointer(200,y),timeStamp:t,pointerType:'native-touch',target:v.image});
  v.open(items);v.down(p(1000));v.up(p(1040),true);assert.equal(activated,0);assert.equal(v.dialog.open,true);v.stage.emit('click',{target:v.image,timeStamp:1050,clientX:200,clientY:300});assert.equal(activated,0,'compatibility click is not another tap');v.down(p(1300));v.up(p(1340),true);assert.equal(activated,1);assert.equal(v.dialog.open,false);v.stage.emit('click',{target:v.image,timeStamp:1350});assert.equal(activated,1);
  v.open(items);v.dialog.emit('keydown',{key:'Enter',target:v.stage});assert.equal(activated,2,'explicit keyboard details stays accessible');v.open(items);v.closeButton.onclick();assert.equal(activated,3,'explicit details control remains immediate');v.destroy();
  const cinema=new CardViewer({immersive:true,sound:false,onActivate:()=>activated++});cinema.open(items);cinema.stage.emit('click',{target:cinema.image,timeStamp:2000});assert.equal(activated,4,'default Cinema single click unchanged');cinema.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('photo double tap uses a bounded nearby window and is cleared by background, pose, cancellation and lifecycle',()=>{
 environment();try{
  const items=[{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}];const click=(v,t,x=200)=>v.stage.emit('click',{target:v.image,timeStamp:t,clientX:x,clientY:300});
  let activated=0;const v=new CardViewer({immersive:true,physicalCard:true,doubleTapDetails:true,sound:false,onActivate:()=>activated++});v.open(items);click(v,1000);click(v,1700);assert.equal(activated,0,'expired first tap never opens later');click(v,1900,300);assert.equal(activated,0,'distant second tap is separate');click(v,2100,305);assert.equal(activated,1);v.destroy();
  for(const action of ['background','drag','pinch','cancel','reset','rotate','zoom','show','close']){
   const c=new CardViewer({immersive:true,physicalCard:true,doubleTapDetails:true,sound:false,onActivate:()=>activated++});c.open(items);click(c,3000);const count=activated;const p=(x,y,t,id=1)=>({...pointer(x,y,id),timeStamp:t,target:c.image});
   if(action==='background')c.stage.emit('click',{target:c.stage,timeStamp:3100});
   if(action==='drag'){c.down(p(200,300,3100));c.drag(p(220,320,3200));c.up(p(220,320,3250),true);}
   if(action==='pinch'){c.down(p(180,300,3100));c.down(p(240,300,3100,2));c.up(p(180,300,3150),false);c.up(p(240,300,3150,2),false);}
   if(action==='cancel'){c.down(p(200,300,3100));c.up(p(200,300,3150),false);}
   if(action==='reset')c.reset();if(action==='rotate')c.rotate(90);if(action==='zoom')c.zoom(1.2);if(action==='show'){c.index=1;c.show();}if(action==='close'){c.close();c.open(items);}
   c.suppressTap=false;click(c,3350);assert.equal(activated,count,action+' cancels previous tap');c.destroy();
  }
  const long=new CardViewer({immersive:true,physicalCard:true,doubleTapDetails:true,sound:false,onActivate:()=>activated++});long.open(items);const p=t=>({...pointer(200,300),pointerType:'native-touch',timeStamp:t,target:long.image});const count=activated;long.down(p(4000));long.up(p(4800),true);long.down(p(4900));long.up(p(4940),true);assert.equal(activated,count,'holding is not the first half of a double tap');long.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('exit audio is distinct, finite and quiet while camera and return recordings stay exact',async()=>{
 const file=readFileSync('our-polaroid-project/audio/paper-exit-v44.wav');assert.equal(createHash('sha256').update(file).digest('hex'),'bef31cda903618a9bb22aa6d5724f70d3e22f695438439ddd23575da2d677f3e');assert.equal(file.readUInt32LE(24),24000);assert.equal((file.length-44)/48000,.24);assert.equal(file.readInt16LE(44),0);assert.equal(file.readInt16LE(file.length-2),0);assert.equal(createHash('sha256').update(readFileSync('our-polaroid-project/audio/paper-floop-v33.wav')).digest('hex'),'48f3accdbfddca47aebd4edf58e1324d9bed5c93009ea4b21a96f07468f11934');
 const {PaperSound}=await import('../our-polaroid-project/paper-sound.js');const oldAudio=globalThis.AudioContext,oldFetch=globalThis.fetch;const requests=new Map(),started=[];let stopped=0;
 class Audio{constructor(){this.state='running';this.destination={}}resume(){return Promise.resolve()}decodeAudioData(bytes){return Promise.resolve({file:new TextDecoder().decode(bytes)})}createGain(){return{gain:{value:0},connect(){},disconnect(){}}}createBufferSource(){return{connect(){},disconnect(){},start(){started.push(this.buffer.file)},stop(){stopped++}}}close(){this.state='closed';return Promise.resolve()}}
 globalThis.AudioContext=Audio;globalThis.fetch=url=>new Promise(resolve=>requests.set(String(url),()=>resolve({ok:true,arrayBuffer:async()=>new TextEncoder().encode(String(url)).buffer})));const flush=()=>new Promise(r=>setImmediate(r));
 try{
  const a=new PaperSound();a.prepareExit();for(const release of requests.values())release();await flush();assert.equal(started.length,0,'preparing audio never plays it');a.burst('exit');assert.match(started[0],/paper-exit-v44.wav/);assert.equal(a.source.loop,false);a.burst();assert.match(started[1],/polaroid-650-eject-v42.wav/);assert.equal(stopped,1);a.burst('return');for(const release of requests.values())release();await flush();assert.match(started[2],/paper-floop-v33.wav/);assert.equal(stopped,2);a.stop();assert.equal(a.source,null);a.destroy();
  for(const action of ['stop','destroy']){requests.clear();const b=new PaperSound();b.burst('exit');b[action]();for(const release of requests.values())release();await flush();assert.equal(started.length,3,'cancel pending exit on '+action);if(action==='stop')b.destroy();}
 }finally{if(oldAudio===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=oldAudio;globalThis.fetch=oldFetch;}
});

test('Polaroid reduced-motion exit allows its short sound without movement and cannot close a reset or new viewer',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');environment();try{
  for(const action of ['finish','close','reset','show','destroy']){
   let exited=0,stopped=0;const sounds=[];const v=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false,onDismiss:()=>exited++});v.reduced.matches=true;v.open([{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}]);v.sound=true;v.projector={stop(){stopped++},destroy(){stopped++}};v.reelSound=kind=>sounds.push(kind);v.card.animate=()=>{throw Error('reduced exit must not animate')};const pending=v.dismiss();assert.deepEqual(sounds,['exit']);assert.equal(v.dialog.open,true);assert.equal(v.exitWaiting,true);
   if(action==='close')v.close();if(action==='reset')v.reset();if(action==='show'){v.index=1;v.show();}if(action==='destroy')v.destroy();await pending;
   assert.equal(exited,action==='finish'?1:0);assert.equal(v.dialog.open,['reset','show'].includes(action));if(action==='show')assert.equal(v.items[v.index].id,'b');assert.equal(v.reduced.matches,true);if(action!=='destroy')v.destroy();
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('Polaroid sideways flips depart from any pose and bring the adjacent photo in mirrored and fully fitted',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');environment();try{
  for(const delta of [-1,1])for(const rotation of [0,90,180,270])for(const scale of [1,1.3])for(const reduced of [false,true]){
   const frames=[],options=[],navigated=[],sounds=[];let cancelled=0;const v=new PolaroidCardViewer({immersive:true,physicalCard:true,paperBack:false,sound:false,onNavigate:item=>navigated.push(item.id)});v.reduced.matches=reduced;v.stage.clientWidth=390;v.stage.clientHeight=844;v.card.offsetWidth=360;v.card.offsetHeight=600;const items=[{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'},{id:'c',src:'c.jpg'}];v.open(items,1);v.rotZ=rotation;v.panX=160;v.panY=-45;v.zoom(scale,{keepPan:true});const departure=v.card.style.transform;v.reelSound=action=>sounds.push(action);
   v.card.animate=(f,o)=>{frames.push(f);options.push(o);return{finished:Promise.resolve(),cancel(){cancelled++}}};v.image.decode=async()=>{v.card.offsetWidth=600;v.card.offsetHeight=360;};await v.toss(delta);
   const sign=delta>0?-1:1;assert.equal(frames.length,2);assert.equal(frames[0][0].transform,departure);assert.match(frames[0].at(-1).transform,new RegExp('rotateY\\('+sign*180+'deg\\)'));assert.match(frames[1][0].transform,new RegExp('rotateY\\('+-sign*180+'deg\\)'));assert.equal(Math.sign(Number(frames[0].at(-1).transform.match(/translate\(([^p]+)px/)[1])),sign);assert.equal(Math.sign(Number(frames[1][0].transform.match(/translate\(([^p]+)px/)[1])),-sign);
   assert.ok(Math.abs(Number(frames[0].at(-1).transform.match(/translate\(([^p]+)px/)[1]))>v.stage.clientWidth);assert.deepEqual(options.map(o=>o.duration),[420,520]);assert.ok(options.every(o=>o.fill==='both'));assert.equal(cancelled,2,'outgoing hold and incoming animation are both released');assert.equal(frames[1].at(-1).transform,v.card.style.transform);const fit=Number(v.card.style.transform.match(/scale\(([^)]+)\)/)[1]);assert.ok(fit>0&&fit<=1);assert.ok(frames[1].every(f=>Number(f.transform.match(/scale\(([^)]+)\)/)[1])<=fit));assert.equal(v.index,1+delta);assert.equal(v.image.src,items[1+delta].src);assert.deepEqual(navigated,[items[1+delta].id]);assert.deepEqual(sounds,[undefined],'sideways retains its camera sound');assert.equal(v.panX,0);assert.equal(v.panY,0);assert.equal(v.scale,1);assert.equal(v.turning,false);assert.equal(v.browsing,false);assert.equal(v.browseAnimation,null);assert.equal(v.browseDecodeCancel,null);assert.equal(v.reduced.matches,reduced);v.destroy();
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('native sideways swipe and buttons share the physical flip, retaining Events bounds and Portfolio wrap',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');environment();try{
  const items=[{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}];let pending,plays=0,navigated=0;const v=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false,loop:false,onNavigate:()=>navigated++});v.reduced.matches=true;v.card.animate=()=>{plays++;return{finished:Promise.resolve(),cancel(){}}};const toss=v.toss.bind(v);v.toss=(...args)=>(pending=toss(...args));v.open(items);v.rotZ=180;
  const e=(x,t)=>({timeStamp:t,changedTouches:[{identifier:1,clientX:x,clientY:300,target:v.image}]});v.stage.emit('touchstart',e(260,1000));v.stage.emit('touchmove',e(100,1100));v.stage.emit('touchend',e(100,1120));await pending;assert.equal(plays,2);assert.equal(v.index,1);assert.equal(navigated,1);assert.equal(v.next.disabled,true);await v.toss(1);assert.equal(plays,2);assert.equal(navigated,1);v.prev.onclick();await pending;assert.equal(v.index,0);assert.equal(plays,4);assert.equal(v.prev.disabled,true);await v.toss(-1);assert.equal(plays,4);v.open([items[0]]);await v.toss(1);assert.equal(plays,4);v.destroy();
  const p=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false});p.reduced.matches=true;p.card.animate=()=>({finished:Promise.resolve(),cancel(){}});p.open(items,1);await p.toss(1);assert.equal(p.index,0);await p.toss(-1);assert.equal(p.index,1);p.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('sideways flip cancellation cannot navigate twice or resurrect a closed, reset, replaced or destroyed viewer',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');environment();try{
  for(const phase of ['outgoing','decode','incoming'])for(const action of ['close','reset','show','open','destroy','escape']){
   const animations=[],navigated=[];const items=[{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'},{id:'c',src:'c.jpg'}];const v=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:item=>navigated.push(item.id)});v.open(items);v.card.animate=()=>{let finish;const a={finished:new Promise(r=>finish=r),cancel(){finish()},finish:()=>finish()};animations.push(a);return a;};if(phase==='decode')v.image.decode=()=>new Promise(()=>{});
   const pending=v.toss(1);await v.toss(1);assert.equal(animations.length,1,'repeat input is ignored');if(phase!=='outgoing'){animations[0].finish();await new Promise(r=>setImmediate(r));assert.equal(navigated.length,1);if(phase==='decode')assert.equal(typeof v.browseDecodeCancel,'function');else assert.equal(animations.length,2);}
   if(action==='show'){v.index=2;v.show();}else if(action==='open')v.open(items,2);else if(action==='escape')v.dialog.emit('keydown',{key:'Escape',target:v.stage});else v[action]();await pending;
   assert.equal(navigated.length,phase==='outgoing'?0:1);assert.equal(v.index,['show','open'].includes(action)?2:phase==='outgoing'?0:1);assert.equal(v.dialog.open,!['close','destroy','escape'].includes(action));assert.equal(v.browsing,false);assert.equal(v.turning,false);assert.equal(v.browseAnimation,null);assert.equal(v.browseDecodeCancel,null);if(action!=='destroy')v.destroy();
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

test('physical flip has safe missing-animation and decode fallbacks; navigation callback may close it without incoming motion',async()=>{
 const {PolaroidCardViewer}=await import('../our-polaroid-project/memory-viewer.js');environment();try{
  for(const mode of ['missing','decode-reject','decode-throw','callback-close']){
   let count=0;const nav=[];const v=new PolaroidCardViewer({immersive:true,physicalCard:true,sound:false,onNavigate:item=>{nav.push(item.id);if(mode==='callback-close')v.close();}});v.open([{id:'a',src:'a.jpg'},{id:'b',src:'b.jpg'}]);if(mode!=='missing')v.card.animate=()=>{count++;return{finished:Promise.resolve(),cancel(){}}};if(mode==='decode-reject')v.image.decode=()=>Promise.reject(Error('not decoded'));if(mode==='decode-throw')v.image.decode=()=>{throw Error('not decoded')};await v.toss(1);assert.equal(count,mode==='missing'?0:mode==='callback-close'?1:2);assert.deepEqual(nav,['b']);assert.equal(v.index,1);assert.equal(v.turning,false);assert.equal(v.browsing,false);v.destroy();
  }
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});

// Owner-authorized review/AMC reconciliation: preserve the precision of the evidence.
test('review-backed dates retain ambiguous days and partial-viewing exclusions',()=>{
 const source=JSON.parse(readFileSync('la-ola-cinema-club/data/films.json'));
 const f=title=>source.find(x=>x.title===title);
 assert.equal(watchedRecords(source).length,209);
 assert.deepEqual(['2024','2025','2026'].map(year=>watchedRecords(source,{year}).length),[7,121,81]);
 assert.equal(filmDate(f('Opus')).value,'2025-03');
 assert.equal(filmDate(f('F1')).value,'2025');
 assert.equal(filmDate(f('The Devil Wears Prada 2')).value,'2026');
 assert.equal(matchesDate(f('The Devil Wears Prada 2'),{year:'2026',month:'05'}),false);
 assert.equal(filmDate(f('Nosferatu')),null);
 assert.equal(filmDate(f('Anora')),null);
 const added=source.filter(x=>filmDate(x)?.kind==='review-corroborated-amc');
 assert.equal(added.length,168);
 assert.ok(added.every(x=>filmDate(x).source.includes('existing reviewed film')));
 assert.ok(added.every(x=>!('confirmedAttendance' in filmDate(x))));
});

import {CinemaCardViewer} from '../la-ola-cinema-club/assets/cinema-card-viewer.js';
test('Cinema opts into physical parity while review details remain the real card back',()=>{
 environment();try{
  const opened=[];const v=new CinemaCardViewer({sound:false,onActivate:item=>opened.push(item.id)});
  v.open([{id:'review',src:'review.webp',title:'A review'}]);
  assert.equal(v.physicalCard,true);assert.equal(v.backgroundNavigation,true);assert.equal(v.doubleTapDetails,true);assert.equal(v.paperBack,false);
  assert.equal(v.reverse.hidden,true);assert.equal(v.flipButton.hidden,false);assert.equal(v.flipButton.textContent,'Read the back');
  v.photoTap({timeStamp:100,clientX:20,clientY:20});assert.equal(v.dialog.open,true);
  v.photoTap({timeStamp:250,clientX:20,clientY:20});assert.deepEqual(opened,['review']);assert.equal(v.dialog.open,false);
  v.open([{id:'review',src:'review.webp'}]);v.flip();assert.deepEqual(opened,['review','review']);
  v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('Cinema sideways flip starts at the retained pose and returns the next review centered',async()=>{
 environment();try{
  const v=new CinemaCardViewer({sound:false});v.open([{id:'a',src:'a.webp'},{id:'b',src:'b.webp'}]);
  v.panX=120;v.panY=60;v.rotZ=25;v.orientation=90;v.scale=1.3;v.paint();const departure=v.card.style.transform,frames=[];
  v.card.animate=(f,o)=>{frames.push({f,o});return{finished:Promise.resolve(),cancel(){}}};
  await v.toss(1);assert.equal(v.index,1);assert.equal(frames.length,2);assert.equal(frames[0].f[0].transform,departure);assert.equal(frames[0].o.duration,420);assert.equal(frames[1].o.duration,520);
  assert.equal(v.panX,0);assert.equal(v.panY,0);assert.equal(v.orientation,0);assert.equal(v.turning,false);v.destroy();
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});
test('Cinema retains its sound backend with separate browse return and exit trigger slots',()=>{
 environment();try{
  const v=new CinemaCardViewer({sound:false});const actions=[];v.sound=true;v.projector={burst:action=>actions.push(action),stop(){},destroy(){}};
  v.reelSound();v.reelSound('return');v.reelSound('exit');assert.deepEqual(actions,['browse','return','exit']);v.destroy();
  const source=readFileSync('la-ola-cinema-club/assets/cinema-card-viewer.js','utf8');assert.match(source,/CardFlickSound/);assert.ok(!source.includes('paper-sound.js'));assert.ok(!source.includes('PaperSound'));
 }finally{delete globalThis.document;delete globalThis.matchMedia;}
});


test('two new approved reviews retain exact owner ratings, watched days, art approval and chronology',()=>{
 for(const [id,b,h,date] of [['club-focker-in-law',3.5,4.25,'2026-11-25'],['club-how-to-rob-a-bank',3,4.25,'2026-11-11']]){
 const f=films.find(f=>f.id===id),a=manifest.films[id];assert.equal(f.brain,b);assert.equal(f.heart,h);assert.equal(f.clubScore,b+h);assert.equal(filmDate(f).value,date);assert.equal(a.status,'approved');assert.equal(a.pendingRefresh,false);assert.deepEqual(a.dimensions,[1000,1500]);assert.equal(a.sourceDesign,'DAHAZmy7qts');assert.equal(a.sourcePage,id==='club-focker-in-law'?103:98);assert.equal(a.masterTransferVerified,true);assert.equal(createHash('sha256').update(readFileSync('la-ola-cinema-club/'+a.image)).digest('hex'),a.sha256);
 const page=readFileSync('la-ola-cinema-club/films/'+f.slug+'/index.html','utf8');assert.ok(page.includes(f.title));assert.ok(page.includes(date));assert.ok(!page.includes('Brain 5/5, Heart 5/5, Club 10/10.'));
 }
 const bank=films.find(f=>f.id==='club-how-to-rob-a-bank');assert.ok(bank.order>films.find(f=>f.id==='club-wicker').order);assert.ok(bank.order<films.find(f=>f.id==='club-ebenezer').order);assert.equal(filterFilms(films)[0].id,'club-focker-in-law');
 const original=JSON.parse(execFileSync('git',['show','b87fea47:la-ola-cinema-club/data/films.json'],{encoding:'utf8'}));for(const f of original)assert.deepEqual(films.find(x=>x.id===f.id),f,'existing film data unchanged: '+f.id);
});
