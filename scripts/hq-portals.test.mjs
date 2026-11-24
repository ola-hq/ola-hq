import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');

test('all 14 existing worlds have matching artwork in website and app without losing community', () => {
  const home=read('index.html'), deeper=read('more-waves.html'), app=read('app/index.html');
  assert.equal((home.match(/<section class="rooms world-entrances home-six-waves"[\s\S]*?<\/section>/)[0].match(/<div class="room-copy"><h2>/g)||[]).length,6);
  assert.equal((deeper.match(/<h2(?: id="academy-card-title")?>/g)||[]).length,8);
  assert.equal((app.match(/class="world-card portal-card"/g)||[]).length,14);
  for(const key of ['la-ola','cinema','polaroid','wave26','fpl','simulation','gdb','arsenal','offbrand','willpwr','wu-wei','homebase','capybara']) {
    const path='assets/portals-20261124/'+key+'.jpg';
    assert.ok((home+deeper).includes(path),key+' website art'); assert.ok(app.includes('../'+path),key+' app art');
    assert.ok(existsSync(new URL('../'+path,import.meta.url)),key+' local asset');
  }
  assert.ok(deeper.includes('assets/entrances/arsenal-academy-clubhouse.jpg'));
  assert.ok(app.includes('../assets/entrances/arsenal-academy-clubhouse.jpg'));
  assert.ok(app.includes('data-world="what-wave"'));
  assert.ok(app.includes('Private beta · Pass required · Unofficial'));
});
test('app routes Cinema to the current Club and keeps gated worlds as direct external doors', () => {
  const js=read('app/app.js'), html=read('app/index.html');
  assert.match(js,/blockbuster: \{ name: 'La Ola Cinema Club', path: 'la-ola-cinema-club\/'/);
  assert.ok(js.includes("if (/^la-ola-cinema-club\\//.test(path)) return 'blockbuster';"));
  assert.ok(html.includes('href="https://home-base-purple-angels.jonathanmlizardi.workers.dev/" target="_blank"'));
  assert.ok(html.includes('href="https://ola-hq.github.io/arsenal-academy-worlds/?v=presenter-entry-1" target="_blank"'));
  assert.ok(read('index.html').includes('class="portal-globe-door" href="#waves"'));
  assert.ok(read('index.html').includes('href="app/">Open the app</a>'));
});
function atmosphere(reduced=false) {
  const tasks=[], raf=[], overlays=[]; let moved=0;
  const node=()=>({className:'',classList:{add(){},remove(){}},setAttribute(){},append(){},remove(){moved++}});
  const document={hidden:false,body:{prepend(){},append(n){overlays.push(n)}},createElement(tag){if(tag==='canvas')return {...node(),getContext:()=>null};return node()},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
  const context={document,window:{},matchMedia:()=>({matches:reduced,addEventListener(){}}),innerWidth:1200,innerHeight:800,Math,
    setTimeout(fn){tasks.push(fn);return tasks.length},clearTimeout(){},requestAnimationFrame(fn){raf.push(fn);return raf.length},cancelAnimationFrame(){},addEventListener(){}};
  vm.runInNewContext(read('hq-portals.js'),context);
  return {api:context.window.OLAPortals,tasks,overlays,get removed(){return moved}};
}
test('reduced motion enters immediately and never creates a zoom overlay', () => {
  const a=atmosphere(true);let entries=0;a.api.enter({},()=>entries++);assert.equal(entries,1);assert.equal(a.overlays.length,0);assert.equal(a.tasks.length,0);
});
test('animated entry navigates exactly once despite rapid repeat taps, then resets', () => {
  const a=atmosphere();let entries=0;const card={querySelector:()=>null};
  a.api.enter(card,()=>entries++);a.api.enter(card,()=>entries++);
  assert.equal(entries,0);assert.equal(a.overlays.length,1);a.tasks[0]();assert.equal(entries,1);assert.equal(a.removed,1);
  a.api.enter(card,()=>entries++);assert.equal(a.overlays.length,2);a.tasks[1]();assert.equal(entries,2);
});
