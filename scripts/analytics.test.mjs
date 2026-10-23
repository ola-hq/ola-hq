import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto, createHash } from 'node:crypto';

function browser({saved={},dnt='0',standalone=false,online=true}={}){
 const storage=new Map(Object.entries(saved)),events={},requests=[];
 class Element{constructor(tag='A',href='/ola-hq/la-ola-de-amor/scan/guide/?secret=nope#music'){this.tagName=tag;this.href=href;this.id='music-link';this.dataset={}}closest(selector){return selector==='a,button,[role="button"],summary'?this:this.private?this:null}getAttribute(){return this.href}}
 const context={crypto:webcrypto,URL,URLSearchParams,Element,Date,Set,JSON,Math,location:new URL('https://ola-hq.github.io/ola-hq/la-ola-de-amor/#/home?private=hello'),navigator:{doNotTrack:dnt,onLine:online,standalone},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{referrer:'https://example.com/private?email=person',documentElement:{lang:'en'},addEventListener:(k,fn)=>events[k]=fn},setInterval:()=>{},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true}}};
 context.window=context;context.top=context;context.addEventListener=(k,fn)=>events[k]=fn;
 runInNewContext(readFileSync('analytics.js','utf8'),context);
 return {context,events,requests,storage,Element};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('page views omit queries, preserve browser ID and count standalone mode',async()=>{
 const b=browser({standalone:true});await tick();const e=b.requests[0].events[0];
 assert.equal(e.path,'/ola-hq/la-ola-de-amor/');assert.equal(e.referrer_host,'example.com');assert.equal(e.mode,'standalone');
 const saved=Object.fromEntries(b.storage),again=browser({saved});await tick();assert.equal(again.requests[0].events[0].visitor_id,e.visitor_id);assert.equal(again.requests[0].events[0].session_id,e.session_id);
});
test('hash navigation and clicks track paths without secret query strings',async()=>{
 const b=browser();await tick();b.context.location.hash='#/chapter/paris';b.events.hashchange();await tick();b.events.click({target:new b.Element()});await tick();
 assert.equal(b.requests[1].events[0].path,'/ola-hq/la-ola-de-amor/#/chapter/paris');assert.equal(b.requests[2].events[0].target,'/ola-hq/la-ola-de-amor/scan/guide/#music');assert(!JSON.stringify(b.requests).includes('nope'));
});
test('forms, guest messages, opt-outs and Do Not Track are excluded',async()=>{
 const b=browser();await tick();const el=new b.Element('BUTTON');el.private=true;b.events.click({target:el});await tick();assert.equal(b.requests.length,1);
 assert.equal(browser({dnt:'1'}).requests.length,0);assert.equal(browser({saved:{olaAnalyticsDisabled:'true'}}).requests.length,0);
});
test('offline events replay once with their original IDs and expire sessions',async()=>{
 const b=browser({online:false,saved:{olaAnalyticsSession:JSON.stringify({id:webcrypto.randomUUID(),at:0})}});assert.equal(b.requests.length,0);
 const q=JSON.parse(b.storage.get('olaAnalyticsQueue'));b.context.navigator.onLine=true;b.events.online();await tick();assert.equal(b.requests[0].events[0].id,q[0].id);assert.equal(JSON.parse(b.storage.get('olaAnalyticsQueue')).length,0);
});

function server(){
 let handler;const inserted=[],reports=[],acceptedHash=createHash('sha256').update('a'.repeat(64)).digest('hex');
 const db={from:()=>{const filters={};return {select(){return this},eq(k,v){filters[k]=v;return this},gte(){return this},then(resolve){return Promise.resolve({count:0,error:null}).then(resolve)},async maybeSingle(){return {data:filters.token_hash===acceptedHash?{id:'owner'}:null}},async upsert(rows){inserted.push(...rows);return {error:null}}}},async rpc(name,args){reports.push({name,args});return {data:{summary:{visitors:0}},error:null}}};
 const code=stripTypeScriptTypes(readFileSync('scripts/supabase/ola-analytics/index.ts','utf8').replace(/^import[^\n]+\n/,''));
 runInNewContext(code,{createClient:()=>db,Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://example.supabase.co':'test-server-secret'},serve:fn=>handler=fn},Response,Date,JSON,Array,Number,crypto:webcrypto,TextEncoder});
 const request=(body,extra={})=>handler(new Request('https://example.com',{method:'POST',headers:{origin:'https://ola-hq.github.io','content-type':'application/json','user-agent':'OLA verification',...extra},body:JSON.stringify(body)}));
 return {request,inserted,reports};
}
const sample=()=>({id:webcrypto.randomUUID(),visitor_id:webcrypto.randomUUID(),session_id:webcrypto.randomUUID(),event_name:'page_view',path:'/ola-hq/la-ola-de-amor/scan/guide/#music',mode:'standalone',occurred_at:new Date().toISOString()});
test('collector validates input, derives app surface and never stores raw IP',async()=>{
 const s=server(),event=sample();assert.equal((await s.request({action:'collect',events:[event]},{'x-forwarded-for':'192.0.2.4'})).status,200);
 assert.equal(s.inserted[0].surface,'loda_app');assert.match(s.inserted[0].source_hash,/^[a-f0-9]{64}$/);assert(!JSON.stringify(s.inserted).includes('192.0.2.4'));
 assert.equal((await s.request({action:'collect',events:[{...event,path:event.path+'?password=oops'}]})).status,400);
 assert.equal((await s.request({action:'collect',events:[{...event,event_name:'anything'}]})).status,400);
 assert.equal((await s.request({action:'collect',events:[{...event,target:'https://x.com/?secret=x'}]})).status,400);
});
test('report requires an active host token and rejects foreign origins',async()=>{
 const s=server();assert.equal((await s.request({action:'report'})).status,401);
 assert.equal((await s.request({action:'report'},{'x-loda-moderator-token':'b'.repeat(64)})).status,401);
 assert.equal((await s.request({action:'report',days:7,scope:'loda'},{'x-loda-moderator-token':'a'.repeat(64)})).status,200);
 assert.equal(s.reports[0].args.report_days,7);assert.equal((await s.request({action:'report'},{origin:'https://untrusted.example'})).status,403);
});
