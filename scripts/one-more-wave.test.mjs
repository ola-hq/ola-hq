import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('./supabase/loda-one-more-wave/index.ts',import.meta.url),'utf8');
const id='8bac2ae3-2410-4f93-b105-bad43573f1ba';
function payload(extra={}){return {id,language:'en',website:'',elapsed:9000,moment:'The dance floor!',connection:'',difficulties:'',keep_change:'',missed_details:'',worth_trip:'',guest_name:'',contact:'',future_interest:'',follow_memories:false,follow_gatherings:false,...extra};}
function setup(result='saved'){
 let handler;const calls=[];
 vm.runInNewContext(source,{Deno:{serve:f=>handler=f,env:{get:k=>k==='SUPABASE_URL'?'https://example.invalid':'fake-server-secret'}},Response,Request,TextEncoder,TextDecoder,crypto:webcrypto,AbortSignal,fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(result));}});
 return {calls,invoke:async(p=payload(),method='POST',origin='https://ola-hq.github.io')=>handler(new Request('https://example.invalid',{method,headers:{origin,'content-type':'application/json','x-forwarded-for':'192.0.2.123'},...(method==='POST'?{body:JSON.stringify(p)}:{})}))};
}
test('survey endpoint accepts one optional answer and never returns answers or server credentials',async()=>{
 const s=setup(),r=await s.invoke();assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});assert.equal(r.headers.get('cache-control'),'no-store');
 const saved=JSON.parse(s.calls[0].options.body).p_record;
 assert.equal(saved.moment,'The dance floor!');assert.equal(saved.contact,'');assert.match(saved.ip_bucket,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(saved).includes('192.0.2.123'));assert.equal(saved.id,id);
 assert.equal(s.calls[0].options.headers.Authorization,'Bearer fake-server-secret');
});
test('survey supports Spanish, future-interest-only and permission-specific follow-up',async()=>{
 const s=setup();let r=await s.invoke(payload({language:'es',moment:'',future_interest:'maybe'}));assert.equal(r.status,200);
 r=await s.invoke(payload({contact:'guest@example.test',follow_memories:true}));assert.equal(r.status,200);
 const saved=JSON.parse(s.calls[1].options.body).p_record;assert.equal(saved.follow_gatherings,false);
});
test('survey rejects empty answers, unconsented contact, oversized or malformed values without database access',async()=>{
 for(const update of [{moment:''},{contact:'guest@example.test'},{moment:'a'.repeat(3001)},{id:'not-a-uuid'},{follow_memories:'true'},{future_interest:'yes'},{language:'fr'},{website:'spam.example'},{elapsed:20},{surprise:'extra'},{contact:null}]){
  const s=setup(),r=await s.invoke(payload(update));assert.equal(r.status,400,JSON.stringify(update).slice(0,80));assert.equal(s.calls.length,0);
 }
});
test('survey CORS and methods reject other sites and reads; preflight never reaches database',async()=>{
 const s=setup();assert.equal((await s.invoke(payload(),'POST','https://unrelated.example')).status,403);
 assert.equal((await s.invoke(null,'GET')).status,405);const r=await s.invoke(null,'OPTIONS');assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://ola-hq.github.io');assert.equal(s.calls.length,0);
});
test('survey shows a real failure for rate limits or database errors; retries keep submission ID',async()=>{
 const s=setup('rate_limited');const r=await s.invoke();assert.equal(r.status,429);assert.deepEqual(await r.json(),{error:'PLEASE_TRY_LATER'});
 const broken=setup('unexpected');assert.equal((await broken.invoke()).status,503);
 const retry=setup();await retry.invoke();await retry.invoke();assert.equal(JSON.parse(retry.calls[0].options.body).p_record.id,JSON.parse(retry.calls[1].options.body).p_record.id);
});
