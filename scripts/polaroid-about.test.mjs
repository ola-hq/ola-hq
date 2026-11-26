import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('About renders with the owner photo and working routes even when the optional viewer cannot load',async()=>{
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',open:false,focus(){},close(){this.open=false},addEventListener(){}});return elements.get(id)};
 const context=vm.createContext({portfolioData:{collections:[]},journalPosts:[],location:{hash:'#about',href:'https://example.test/our-polaroid-project/#about'},document:{getElementById:element,querySelectorAll:()=>[],title:''},window:{scrollTo(){},addEventListener(){}},console});
 const script=new vm.Script(readFileSync('our-polaroid-project/portfolio.js','utf8'),{importModuleDynamically:()=>Promise.reject(Error('optional viewer unavailable in fixture'))});script.runInContext(context);await new Promise(resolve=>setImmediate(resolve));
 const html=element('main').innerHTML;assert.match(html,/<h1>A little film\.<br>A whole lot of life\.<\/h1>/);assert.match(html,/src="assets\/about\/one-frame-a-whole-life-20261125.jpg"/);assert.match(html,/width="539" height="672"/);assert.match(html,/alt="[^"]+"/);
 for(const href of ['#portfolio','#journal','#journal/where-the-camera-went','events/','#contact','../'])assert.ok(html.includes('href="'+href+'"'),href);
 assert.equal((html.match(/<h1>/g)||[]).length,1);assert.doesNotMatch(html,/privateMemory|ownerNotes|NEEDS_JON_REVIEW/);assert.equal(context.document.title,'Our Polaroid Wave · OLA HQ');
});
