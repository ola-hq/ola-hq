
const APP_ID="7a08d6ee-1181-4925-bd3f-1a7a7439aaee";
const GUIDE="https://ola-hq.github.io/ola-hq/la-ola-de-amor/scan/guide/#updates/";
const EVENTS=[{"id":"tacos-ready-2026-10-17","at":"2026-10-17T20:00:00.000Z","heading":{"en":"TACOS READY AT 2 PM! 🌮","es":"¡TACOS LISTOS A LAS 2 PM! 🌮"},"body":{"en":"Tacos are ready at 2 PM! 🌮🌊","es":"¡Los tacos están listos a las 2 PM! 🌮🌊"}}];
const TASK_HASH="b8f53afd09da8f2920b3b23ae8157a002c5ff22d59b2fd486fc547251f6c9d35";
const EXPIRES=Date.parse("2026-10-17T20:10:00Z");
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
async function hash(input:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input)))].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function eventKey(id:string){const hex=await hash(APP_ID+":la-ola-push-v1:"+id);const b=Uint8Array.from(hex.match(/../g)!.map(x=>parseInt(x,16)));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b.slice(0,16)].map(x=>x.toString(16).padStart(2,"0")).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20,32);}
async function rest(path:string,method="GET",body?:unknown){
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const res=await fetch((Deno.env.get("SUPABASE_URL")||"")+"/rest/v1/"+path,{method,headers:{apikey:key,Authorization:"Bearer "+key,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9000)});
 if(!res.ok)throw Error("RECEIPT_DATABASE_ERROR_"+res.status);return res.json();
}
async function provider(path:string,method="GET",body?:unknown){
 const key=Deno.env.get("ONESIGNAL_REST_API_KEY");if(!key)throw Error("PUSH_NOT_CONFIGURED");
 const res=await fetch("https://api.onesignal.com/notifications"+path,{method,headers:{Authorization:"Key "+key,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9000)});
 const data=await res.json();if(!res.ok||!data.id)throw Error("PROVIDER_ERROR_"+res.status);return data;
}
Deno.serve(async req=>{
 // Owner-authorized, fixed taco alert for October 17 at 2 PM Guadalajara time. No arbitrary messages or recipients.
 // A short-lived task credential is required in addition to gateway JWT validation.
 if(req.method!=="POST"||Date.now()>EXPIRES||await hash(req.headers.get("x-tacos-task-token")||"")!==TASK_HASH)return json({error:"NOT_AUTHORIZED"},401);
 let input;try{input=await req.json();}catch{return json({error:"INVALID_JSON"},400);}
 if(!["schedule","verify"].includes(input.action))return json({error:"INVALID_ACTION"},400);
 try{
 const outcomes=[];
 for(const event of EVENTS){
  const rows=await rest("loda_festival_notification_history?id=eq."+event.id+"&select=id,provider_notification_id,published_at");
  let id=rows[0]?.provider_notification_id;
  if(!id){
   if(input.action==="verify")return json({error:"NOT_SCHEDULED",event:event.id},409);
   if(Date.parse(event.at)<=Date.now()+60000)return json({error:"EVENT_TOO_CLOSE"},409);
   const accepted=await provider("","POST",{app_id:APP_ID,target_channel:"push",headings:event.heading,contents:event.body,send_after:event.at,ttl:3600,web_url:GUIDE+event.id,filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],idempotency_key:await eventKey(event.id)});
   id=accepted.id;
   await rest("loda_festival_notification_history?on_conflict=id","POST",{id:event.id,title_en:event.heading.en,title_es:event.heading.es,body_en:event.body.en,body_es:event.body.es,published_at:event.at,kind:"festival",provider_notification_id:id});
  }
  const queued=await provider("/"+id+"?app_id="+APP_ID);
  const sendEpoch=Number(queued.send_after);
  const expected=Date.parse(event.at)/1000;
  if(queued.canceled===true||queued.completed_at||Math.abs(sendEpoch-expected)>1)throw Error("PROVIDER_QUEUE_VERIFICATION_FAILED");
  if(JSON.stringify(queued.headings)!==JSON.stringify(event.heading) && (queued.headings?.en!==event.heading.en||queued.headings?.es!==event.heading.es))throw Error("TITLE_MISMATCH");
  if(queued.contents?.en!==event.body.en||queued.contents?.es!==event.body.es)throw Error("BODY_MISMATCH");
  if(input.action==="schedule")await rest("loda_festival_notification_history?on_conflict=id","POST",{id:event.id,title_en:event.heading.en,title_es:event.heading.es,body_en:event.body.en,body_es:event.body.es,published_at:event.at,kind:"festival",provider_notification_id:id});
  outcomes.push({event:event.id,notificationId:id,scheduledFor:event.at,providerSendAfter:queued.send_after,canceled:queued.canceled??false,completedAt:queued.completed_at??null,filters:queued.filters,webUrl:queued.web_url,verified:true});
 }
 return json({ok:true,results:outcomes});
 }catch(e){return json({error:e instanceof Error?e.message:"TASK_FAILED"},503);}
});
