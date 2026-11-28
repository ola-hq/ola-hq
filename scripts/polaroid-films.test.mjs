import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,openSync,readSync,closeSync,statSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const base='our-polaroid-project/films/';
const html=readFileSync(base+'index.html','utf8');
test('ten web films have native controls, deferred loading, posters and web MP4 containers',()=>{const videos=[...html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];assert.equal(videos.length,10);for(const [,attrs,body] of videos){assert.match(attrs,/\bcontrols\b/);assert.match(attrs,/\bplaysinline\b/);assert.match(attrs,/preload="none"/);assert.doesNotMatch(attrs,/\bautoplay\b/);const poster=attrs.match(/poster="([^"]+)"/)[1],source=body.match(/<source src="([^"]+)"/)[1];for(const p of [poster,source])assert.ok(existsSync(base+p));const fd=openSync(base+source,'r'),head=Buffer.alloc(32);readSync(fd,head,0,32,0);closeSync(fd);assert.match(head.toString('ascii'),/ftyp/);assert.ok(statSync(base+source).size<90e6)}assert.equal(existsSync(base+'media/the-long-show.mp4'),false,'original uncleared long cut remains private')});
test('event invitations resolve to matching film anchors without replacing galleries',()=>{for(const id of ['lib-2025','lib-2026','martins-bach-party']){const page=readFileSync(`our-polaroid-project/events/${id}/index.html`,'utf8');assert.ok(page.includes(`../../films/#${id}`));assert.ok(html.includes(`id="${id}"`));assert.match(page,/data-photo=/)}assert.ok(readFileSync('our-polaroid-project/index.html','utf8').includes('<a href="films/">Films</a>'))});
test('starting one film pauses the other films, and leaving pauses all without autoplay',()=>{const events={},videos=[{pauseCount:0,pause(){this.pauseCount++}},{pauseCount:0,pause(){this.pauseCount++}}];class Video{}Object.setPrototypeOf(videos[0],Video.prototype);Object.setPrototypeOf(videos[1],Video.prototype);const context={HTMLVideoElement:Video,document:{addEventListener:(n,f)=>events[n]=f,querySelectorAll:()=>videos},addEventListener:(n,f)=>events[n]=f};vm.runInNewContext(readFileSync(base+'films.js','utf8'),context);events.play({target:videos[0]});assert.equal(videos[0].pauseCount,0);assert.equal(videos[1].pauseCount,1);events.pagehide();assert.equal(videos[0].pauseCount,1);assert.equal(videos[1].pauseCount,2)});
test('Dreamstate pairs one event and one film with its exact nineteen web photographs and no orphan media',()=>{
 const id='dreamstate-2023',path=`our-polaroid-project/events/${id}/`,catalog=JSON.parse(readFileSync('data/events/index.json','utf8'));
 const summary=catalog.events.find(e=>e.id===id),event=JSON.parse(readFileSync(summary.manifest,'utf8')).events[0];
 assert.equal(event.id,id);assert.equal(event.photos.length,19);assert.equal(event.photoCount,19);assert.equal(new Set(event.photos.map(p=>p.id)).size,19);
 assert.equal(event.datePrecision,'RANGE');assert.equal(event.dateStart,'2023-11-17');assert.equal(event.dateEnd,'2023-11-18');assert.equal(event.dateLabel.includes('2023-11-21'),false);
 assert.equal(summary.photoCount,event.photoCount);assert.equal(summary.photos.length,1);assert.equal(summary.coverId,event.coverId);assert.ok(event.photos.some(p=>p.id===event.coverId));
 assert.deepEqual(readdirSync(path+'photos').sort(),event.photos.map(p=>p.originalFilename).sort());
 for(const p of event.photos){assert.ok(p.width<=672&&p.height<=672);assert.equal(p.thumbnail,p.display);assert.equal(p.download,p.display);assert.equal(p.display,path+'photos/'+p.originalFilename);const b=readFileSync(p.display);assert.equal(b.readUInt16BE(0),0xffd8);assert.equal(b.includes(Buffer.from('Exif\0\0')),false);}
 assert.equal(event.packages.length,1);assert.equal(event.packages[0].bytes,statSync(event.packages[0].url).size);
 assert.deepEqual(event.gallery.collections,[{href:'our-polaroid-project/films/#dreamstate-2023',label:'Watch the film · 0:18'}]);
 assert.ok(html.includes('href="../events/dreamstate-2023/"'));assert.equal((html.match(/id="dreamstate-2023"/g)||[]).length,1);
 assert.ok(readFileSync(path+'index.html','utf8').includes('<ola-gallery event="dreamstate-2023" brand="polaroid">'));
});

test('paired event films retain distinct galleries and dated years do not fabricate trip days',()=>{
 const catalog=JSON.parse(readFileSync('data/events/index.json','utf8'));
 for(const [film,id] of [['engagement-2024','event-c0bf1edce3a2'],['desert-air-2024','event-31f06b8208a3'],['llannely-freddy-2024','event-72adfa360448']]){const summary=catalog.events.find(e=>e.id===id),event=JSON.parse(readFileSync(summary.manifest,'utf8')).events[0];assert.ok(event.gallery.collections.some(c=>c.href==='our-polaroid-project/films/#'+film));assert.deepEqual(summary.gallery.collections,event.gallery.collections);assert.equal((html.match(new RegExp('id="'+film+'"','g'))||[]).length,1);assert.ok(html.includes('href="../events/'+id+'/"'));assert.ok(event.photos.length>0);}
 for(const [id,year] of [['event-d32df8a80a1a',2021],['event-7275089b9b8a',2024],['event-54b8c286679f',2024]]){const summary=catalog.events.find(e=>e.id===id),event=JSON.parse(readFileSync(summary.manifest,'utf8')).events[0];for(const e of [event,summary]){assert.equal(e.year,year);assert.equal(e.datePrecision,'YEAR');assert.equal(e.date,null);assert.equal(e.dateStart,null);assert.equal(e.dateEnd,null);assert.match(e.dateLabel,/unconfirmed/);}}
 assert.equal(catalog.events.find(e=>e.id==='event-0606c8d3bb97').year,2023);assert.equal(catalog.events.find(e=>e.id==='event-f0da42950bf2').dateLabel,'Labelled 2023 · edition/date unconfirmed');
});
