import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';

const token='test-only-photo-capability';
const source=readFileSync('scripts/supabase/loda-magic-mirror-alert-20261023/sender.ts','utf8').replace(/const TASK_HASH="[a-f0-9]+";/,'const TASK_HASH="'+createHash('sha256').update(token).digest('hex')+'";');
function fixture({expired=false,receiptFailure=false,noAudience=false}={}){
 let handler,history=[],posts=[],unique=new Map(),failedReceipt=false;
 class Clock extends Date {static now(){return Date.parse(expired?'2026-10-23T20:00:00Z':'2026-10-23T18:30:00Z');}constructor(...args){super(...(args.length?args:[Clock.now()]));}}
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 const context={Request,Response,TextEncoder,Uint8Array,crypto:webcrypto,AbortSignal,Date:Clock,Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://test.supabase.co':'test-key'},serve:h=>handler=h},fetch:async(url,options={})=>{
   if(url.includes('/rest/v1/')){
     if(options.method==='POST'){
       if(receiptFailure&&!failedReceipt){failedReceipt=true;return response({},503);}
       history=[JSON.parse(options.body)];return response(history);
     }
     return response(history);
   }
   if(options.method==='POST'){
     const body=JSON.parse(options.body);posts.push(body);
     if(noAudience)return response({id:''});
     if(!unique.has(body.idempotency_key))unique.set(body.idempotency_key,{...body,id:'00000000-1111-4222-8333-444444444444',successful:12,failed:0,remaining:0,completed_at:1792780260});
     return response({id:unique.get(body.idempotency_key).id});
   }
   const sent=[...unique.values()][0];return response({...sent,filters:[{value:'true',relation:'=',key:'loda_festival',field:'tag'}]});
 }};
 vm.runInNewContext(source,context);
 const call=(action='send_now',credential=token,extra={})=>handler(new Request('https://test.supabase.co/functions/v1/photo-task',{method:'POST',headers:{'x-loda-photo-task':credential,'content-type':'application/json'},body:JSON.stringify({action,...extra})}));
 return {call,posts,unique,get history(){return history;}};
}
test('photo push requires its capability and expiry and refuses arbitrary content',async()=>{
 for(const opts of [{},{expired:true}]){
   const f=fixture(opts);assert.equal((await f.call('send_now',opts.expired?token:'bad')).status,401);assert.equal(f.posts.length,0);
 }
 const f=fixture();assert.equal((await f.call('send_now',token,{contents:{en:'unapproved'}})).status,400);assert.equal(f.posts.length,0);
});
test('photo push verification never sends and sending is fixed, bilingual and duplicate-safe',async()=>{
 const f=fixture();assert.equal((await f.call('verify')).status,409);assert.equal(f.posts.length,0);
 const first=await(await f.call()).json();assert.equal(first.ok,true);assert.equal(first.verified,true);
 const body=f.posts[0];assert.equal(body.target_channel,'push');assert.equal(body.ttl,86400);
 assert.deepEqual(body.filters,[{field:'tag',key:'loda_festival',relation:'=',value:'true'}]);
 assert.equal(body.web_url,'https://ola-hq.github.io/ola-hq/la-ola-de-amor/scan/guide/magic-mirror/');
 assert.match(body.contents.en,/Download.*share/);assert.match(body.contents.es,/Descarga.*comparte/);
 assert.equal(f.history[0].id,'magic-mirror-photos-20261023');
 const second=await(await f.call()).json();assert.equal(second.alreadySent,true);assert.equal(f.posts.length,1);
 assert.equal((await(await f.call('verify')).json()).notificationId,first.notificationId);assert.equal(f.posts.length,1);
});
test('a photo push accepted before receipt failure retries the same provider idempotency key',async()=>{
 const f=fixture({receiptFailure:true});assert.equal((await f.call()).status,503);assert.equal(f.history.length,0);
 assert.equal((await(await f.call()).json()).ok,true);assert.equal(f.posts.length,2);assert.equal(f.unique.size,1);
 assert.equal(f.posts[0].idempotency_key,f.posts[1].idempotency_key);
});
test('no matching push audience does not create a false sent receipt',async()=>{
 const f=fixture({noAudience:true});const result=await f.call();assert.equal(result.status,503);assert.equal((await result.json()).error,'NO_MATCHING_SUBSCRIPTIONS');assert.equal(f.history.length,0);
});
test('the default photo sender entrypoint is retired and has no secret or provider access',async()=>{
 let handler;
 const retired=readFileSync('scripts/supabase/loda-magic-mirror-alert-20261023/index.ts','utf8');
 vm.runInNewContext(retired,{Deno:{serve:h=>handler=h},Response});
 assert.equal((await handler()).status,410);assert(!retired.includes('Deno.env'));assert(!retired.includes('fetch('));
});
