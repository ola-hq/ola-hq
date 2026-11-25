import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {scoreText,filmDate,matchesDate,historicalTrends,distribution,applyArtwork,artworkURL} from '../la-ola-cinema-club/assets/collection-data.js';
import {filterFilms} from '../la-ola-cinema-club/assets/club.js';
import {CardViewer,gestureAction} from '../assets/ola-worlds/card-viewer.js';
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
 for(const key of ['clubScore','brain','heart']){const d=distribution(films,key);assert.equal(d.count,key==='clubScore'?234:88);for(const bin of d.bins){const result=filterFilms(films,{score:bin.score,perspective:key});assert.deepEqual(new Set(result.map(f=>f.id)),new Set(bin.films.map(f=>f.id)));}}
 const f=films.find(f=>f.title==='Heart of the Beast');assert.equal(f.brain,1);assert.equal(f.heart,3);assert.equal(f.clubScore,4);assert.ok(f.artworkNotice);
});
test('one registry replacement propagates through the shared resolver and static film page with cache revision',()=>{
 const f=films[0],a=manifest.films[f.id];const next={...manifest,films:{...manifest.films,[f.id]:{...a,image:'assets/test-approved.webp',thumbnail:'assets/test-thumb.webp',revision:'new-proof',status:'approved',approvalReceipt:'test fixture approval only',sha256:createHash('sha256').update('fixture').digest('hex'),thumbnailSha256:createHash('sha256').update('thumb').digest('hex')}}};
 const updated=applyArtwork(films,next).find(x=>x.id===f.id);assert.equal(updated.image,'assets/test-approved.webp');assert.equal(updated.thumbnail,'assets/test-thumb.webp');assert.match(artworkURL(next.films[f.id],'image','https://example.org/club/'),/test-approved.webp\?art=new-proof$/);
 const dir=mkdtempSync(join(tmpdir(),'ola-art-sync-'));try{cpSync('la-ola-cinema-club/data',join(dir,'data'),{recursive:true});cpSync('la-ola-cinema-club/films/'+f.slug,join(dir,'films',f.slug),{recursive:true});mkdirSync(join(dir,'assets'));writeFileSync(join(dir,'assets/test-approved.webp'),'fixture');writeFileSync(join(dir,'assets/test-thumb.webp'),'thumb');writeFileSync(join(dir,'data/artwork.json'),JSON.stringify(next));execFileSync('python3',['scripts/sync-cinema-artwork.py','--site',dir]);assert.match(readFileSync(join(dir,'films',f.slug,'index.html'),'utf8'),/test-approved.webp\?art=new-proof/);next.films[f.id].status='draft';writeFileSync(join(dir,'data/artwork.json'),JSON.stringify(next));assert.notEqual(spawnSync('python3',['scripts/sync-cinema-artwork.py','--site',dir]).status,0);}finally{rmSync(dir,{recursive:true,force:true});}
});
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.style={setProperty:(k,v)=>this.style[k]=v};this.clientWidth=400;this.clientHeight=600;this.hidden=false;}
 append(...children){for(const c of children){c.parent=this;this.children.push(c);}} replaceChildren(...children){this.children=[];this.append(...children)} setAttribute(k,v){this.attributes[k]=v} addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)} focus(){globalThis.document.activeElement=this} showModal(){this.open=true} close(){this.open=false;this.emit('close',{})} remove(){this.parent.children=this.parent.children.filter(x=>x!==this)} getClientRects(){return this.hidden?[]:[{}]} matches(s){return s.split(',').includes(this.tagName.toLowerCase())} querySelectorAll(){return this.children.flatMap(c=>[c,...c.querySelectorAll()]).filter(c=>['BUTTON','A','TEXTAREA','INPUT'].includes(c.tagName)||c.tabIndex===0)} setPointerCapture(){} emit(type,e){for(const fn of this.listeners[type]||[])fn(e)}
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
 const html=readFileSync('la-ola-cinema-club/index.html','utf8');const hero=html.match(/<section class="hero hero-world">.*?<\/section>/s)[0];assert.equal(createHash('sha256').update(hero).digest('hex'),'44393f9520bd0adedb52ce9d412295e9b6192052fde6dba4bb923eba25e29d14');for(const cls of ['home-sky-window','home-ocean-stats','home-ocean-fresh','home-ocean-lanes'])assert.ok(html.includes(cls));assert.equal((html.match(/class="stage-cards"/g)||[]).length,1);
});
