import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {scoreText,filmDate,matchesDate,historicalTrends,distribution,applyArtwork,artworkURL} from '../la-ola-cinema-club/assets/collection-data.js';
import {filterFilms} from '../la-ola-cinema-club/assets/club.js';
import {CardViewer,gestureAction,downwardExit} from '../assets/ola-worlds/card-viewer.js';
const films=JSON.parse(readFileSync('la-ola-cinema-club/data/films.json'));
const manifest=JSON.parse(readFileSync('la-ola-cinema-club/data/artwork.json'));
test('date filters preserve unknowns and distinguish recorded release years from verified watch days',()=>{
 const f={dates:{release:{value:'2026',precision:'year',verified:false},watched:{value:'2026-11-19',precision:'day',verified:true}}};
 assert.equal(matchesDate(f,{basis:'release',year:'2026'}),true);assert.equal(matchesDate(f,{basis:'release',month:'11'}),false);assert.equal(matchesDate(f,{year:'2026',month:'11'}),true);assert.equal(matchesDate({},{}),true);assert.equal(matchesDate({},{year:'2026'}),false);assert.equal(filmDate({dates:{watched:{value:'2026-02-30'}}}),null);
 assert.equal(filterFilms(films,{year:'2026',month:'11'}).length,9);assert.equal(filterFilms(films,{basis:'reviewed',year:'2026'}).length,0);
});
test('historical means expose real equality versus display rounding without losing denominator',()=>{
 const pairs=[{currentClubCard:true,brain:3.0001,heart:3,clubScore:6.0001,dates:{watched:{value:'2026-11-01',verified:true}}},{currentClubCard:true,brain:4,heart:4,clubScore:8}];
 const h=historicalTrends(pairs);assert.equal(h.total,2);assert.equal(h.dated,1);assert.equal(h.unknown,1);assert.equal(h.groups[0].equal,false);assert.equal(scoreText(h.groups[0].brain,2),scoreText(h.groups[0].heart,2));assert.equal(scoreText(0),'0');assert.equal(scoreText(null),'—');assert.equal(scoreText(7.25),'7.25');assert.equal(scoreText(10,2),'10');
});
test('distribution counts and linked shelf filters use the same paired perspective scope',()=>{
 for(const key of ['clubScore','brain','heart']){const d=distribution(films,key);assert.equal(d.count,234);for(const bin of d.bins){const result=filterFilms(films,{score:bin.score,perspective:key});assert.deepEqual(new Set(result.map(f=>f.id)),new Set(bin.films.map(f=>f.id)));}}
 const f=films.find(f=>f.title==='Heart of the Beast');assert.equal(f.brain,1);assert.equal(f.heart,3);assert.equal(f.clubScore,4);assert.equal(manifest.films[f.id].status,'approved');assert.equal(manifest.films[f.id].sourcePage,90);
});
test('one registry replacement propagates through the shared resolver and static film page with cache revision',()=>{
 const f=films[0],a=manifest.films[f.id];const next={...manifest,features:{},films:{...manifest.films,[f.id]:{...a,image:'assets/test-approved.webp',thumbnail:'assets/test-thumb.webp',revision:'new-proof',status:'approved',approvalReceipt:'test fixture approval only',sha256:createHash('sha256').update('fixture').digest('hex'),thumbnailSha256:createHash('sha256').update('thumb').digest('hex')}}};
 const updated=applyArtwork(films,next).find(x=>x.id===f.id);assert.equal(updated.image,'assets/test-approved.webp');assert.equal(updated.thumbnail,'assets/test-thumb.webp');assert.match(artworkURL(next.films[f.id],'image','https://example.org/club/'),/test-approved.webp\?art=new-proof$/);
 const dir=mkdtempSync(join(tmpdir(),'ola-art-sync-'));try{cpSync('la-ola-cinema-club/data',join(dir,'data'),{recursive:true});cpSync('la-ola-cinema-club/films/'+f.slug,join(dir,'films',f.slug),{recursive:true});mkdirSync(join(dir,'assets'));cpSync('la-ola-cinema-club/assets/cards',join(dir,'assets/cards'),{recursive:true});writeFileSync(join(dir,'assets/test-approved.webp'),'fixture');writeFileSync(join(dir,'assets/test-thumb.webp'),'thumb');writeFileSync(join(dir,'data/artwork.json'),JSON.stringify(next));execFileSync('python3',['scripts/sync-cinema-artwork.py','--site',dir]);assert.match(readFileSync(join(dir,'films',f.slug,'index.html'),'utf8'),/test-approved.webp\?art=new-proof/);next.films[f.id].status='draft';writeFileSync(join(dir,'data/artwork.json'),JSON.stringify(next));assert.notEqual(spawnSync('python3',['scripts/sync-cinema-artwork.py','--site',dir]).status,0);}finally{rmSync(dir,{recursive:true,force:true});}
});
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.style={setProperty:(k,v)=>this.style[k]=v};this.clientWidth=400;this.clientHeight=600;this.hidden=false;}
 append(...children){for(const c of children){c.parent=this;this.children.push(c);}} replaceChildren(...children){this.children=[];this.append(...children)} setAttribute(k,v){this.attributes[k]=v} addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)} focus(){globalThis.document.activeElement=this} showModal(){this.open=true} close(){this.open=false;this.emit('close',{})} remove(){this.parent.children=this.parent.children.filter(x=>x!==this)} getClientRects(){return this.hidden?[]:[{}]} matches(s){return s.split(',').includes(this.tagName.toLowerCase())} querySelectorAll(){return this.children.flatMap(c=>[c,...c.querySelectorAll()]).filter(c=>['BUTTON','A','TEXTAREA','INPUT'].includes(c.tagName)||c.tabIndex===0)} getBoundingClientRect(){return {top:0,left:0,width:this.clientWidth,height:this.clientHeight}} setPointerCapture(){} emit(type,e){for(const fn of this.listeners[type]||[])fn({preventDefault(){},stopPropagation(){},...e})}
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
test('homepage hero retains the approved headline, phone, filmstrip source and stacked original cards',()=>{
 const html=readFileSync('la-ola-cinema-club/index.html','utf8');const hero=html.match(/<section class="hero hero-world">.*?<\/section>/s)[0];assert.equal(createHash('sha256').update(hero.replace(/\?art=[a-f0-9]+/g,'?art=approved')).digest('hex'),'354f26ccebe3d76f85ded7de096ee3c04e9638b314078766a6da364a5711c42b');for(const cls of ['home-sky-window','home-ocean-stats','home-ocean-fresh','home-ocean-lanes'])assert.ok(html.includes(cls));assert.equal((html.match(/class="stage-cards"/g)||[]).length,1);
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
 const current=films.filter(f=>f.currentClubCard);assert.equal(current.length,88);assert.deepEqual(current.map(f=>f.sourcePage).sort((a,b)=>a-b),Array.from({length:88},(_,i)=>i+14));
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
 const source=readFileSync('la-ola-cinema-club/assets/contact-sheet.js','utf8');assert.match(source,/club-collection/);assert.match(source,/new CardViewer/);assert.match(source,/details=1#review-details/);assert.match(source,/touchmove.*passive:true/);assert.match(source,/im.loading='lazy'/);assert.doesNotMatch(source,/canva.com|innerHTML|preventDefault\(\).*touchmove/);
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

test('all 234 recorded Brain and Heart scores survive artwork-edition filtering in stats and shelf links',async()=>{const {collectionStats,perspectiveStats}=await import('../la-ola-cinema-club/assets/stats-data.js');const s=collectionStats(films);assert.equal(s.pairs,234);assert.equal(distribution(films,'brain').count,234);assert.equal(distribution(films,'heart').count,234);assert.ok(Math.abs(s.brainMean-3.1506410256410255)<1e-12);assert.ok(Math.abs(s.heartMean-3.4626068376068377)<1e-12);assert.equal(perspectiveStats(films,'brain').count,234);assert.equal(historicalTrends(films).unknown,208);const bad=films.filter(f=>Math.abs(f.brain+f.heart-f.clubScore)>1e-8);assert.deepEqual(bad.map(f=>f.title),['The Dutchman']);assert.match(bad[0].sourceConflict,/confirmation is pending/);});
test('reading position follows the visible section rather than resetting every swipe to artwork',async()=>{const {readingPosition}=await import('../la-ola-cinema-club/assets/review-navigation.js');const anchors=[{id:'review-card',top:100,height:600},{id:'review-overview',top:740,height:1100},{id:'review-reactions',top:1200,height:400},{id:'community-feedback',top:1660,height:600}];assert.equal(readingPosition(anchors,80).section,'review-card');assert.equal(readingPosition(anchors,900).section,'review-overview');const p=readingPosition(anchors,1400);assert.equal(p.section,'review-reactions');assert.equal(p.fraction,.5);assert.equal(readingPosition(anchors,1900).section,'community-feedback');});
