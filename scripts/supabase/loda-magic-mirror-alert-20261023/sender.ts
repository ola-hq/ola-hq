// One-time, owner-authorized photo push. Fixed content, audience and destination.
// Audit source; the deployed index is retired after a verified send.
const APP_ID="7a08d6ee-1181-4925-bd3f-1a7a7439aaee";
const EVENT_ID="magic-mirror-photos-20261023";
const GALLERY="https://ola-hq.github.io/ola-hq/la-ola-de-amor/scan/guide/magic-mirror/";
const HEADING={en:"📸 Your Magic Mirror photos are here!",es:"📸 ¡Ya están las fotos del Espejo Mágico!"};
const PUSH_COPY={en:"Our 40 Magic Mirror keepsakes are ready! Download your favorites or the whole collection, and share the love 💛 — Bri + Jon",es:"¡Ya están los 40 recuerdos del Espejo Mágico! Descarga tus favoritos o la colección completa y comparte la magia 💛 — Bri + Jon"};
const FEED_COPY={en:"A little piece of La Ola to keep 💛 All 40 Magic Mirror keepsakes are now in the app. Go check them out, download your favorites—or the whole collection—and share them with your people! Thank you for making this night so special. — Bri + Jon",es:"Un pedacito de La Ola para guardar 💛 Los 40 recuerdos del Espejo Mágico ya están en la app. ¡Ve a verlos, descarga tus favoritos —o la colección completa— y compártelos con los tuyos! Gracias por hacer esta noche tan especial. — Bri + Jon"};
const TASK_HASH="59a44cecbc95d31c1e28bc62c76792689d77c84c833b18e50a7097076c7034da";
const EXPIRES=Date.parse("2026-10-23T19:15:00Z");
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function eventKey(){const h=await hash(APP_ID+":la-ola-push-v1:"+EVENT_ID+":photo-push-v1");const bytes=Uint8Array.from(h.match(/../g).map(s=>parseInt(s,16)));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes.slice(0,16)].map(b=>b.toString(16).padStart(2,"0")).join("");return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20,32);}
async function rest(path,method="GET",body){
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const response=await fetch((Deno.env.get("SUPABASE_URL")||"")+"/rest/v1/"+path,{method,headers:{apikey:key,Authorization:"Bearer "+key,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error("RECEIPT_DATABASE_ERROR");return response.json();
}
async function provider(path,method="GET",body){
 const key=Deno.env.get("ONESIGNAL_REST_API_KEY");if(!key)throw Error("PUSH_NOT_CONFIGURED");
 const response=await fetch("https://api.onesignal.com/notifications"+path,{method,headers:{Authorization:"Key "+key,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9000)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.id)throw Error(response.ok?"NO_MATCHING_SUBSCRIPTIONS":"PROVIDER_REJECTED_"+response.status);
 return result;
}
Deno.serve(async request=>{
 // Gateway JWT validation stays enabled in addition to this narrow expiring capability.
 if(request.method!=="POST"||Date.now()>EXPIRES||await hash(request.headers.get("x-loda-photo-task")||"")!==TASK_HASH)return json({error:"NOT_AUTHORIZED"},401);
 let input;try{const raw=await request.text();if(raw.length>100)return json({error:"INVALID_INPUT"},400);input=JSON.parse(raw);}catch{return json({error:"INVALID_JSON"},400);}
 if(!input||typeof input!=="object"||Array.isArray(input)||!["send_now","verify"].includes(input.action)||Object.keys(input).some(k=>k!=="action"))return json({error:"INVALID_ACTION"},400);
 try{
  const rows=await rest("loda_festival_notification_history?id=eq."+EVENT_ID+"&select=id,provider_notification_id,published_at");
  let id=rows[0]?.provider_notification_id,acceptedAt=rows[0]?.published_at;
  const alreadySent=Boolean(id);
  if(!id){
   if(input.action==="verify")return json({error:"NOT_SENT"},409);
   const result=await provider("","POST",{app_id:APP_ID,target_channel:"push",headings:HEADING,contents:PUSH_COPY,web_url:GALLERY,ttl:86400,filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],idempotency_key:await eventKey()});
   id=result.id;acceptedAt=new Date().toISOString();
   // A retry after a receipt error reuses the exact same OneSignal idempotency key.
   await rest("loda_festival_notification_history?on_conflict=id","POST",{id:EVENT_ID,title_en:HEADING.en,title_es:HEADING.es,body_en:FEED_COPY.en,body_es:FEED_COPY.es,published_at:acceptedAt,kind:"festival",provider_notification_id:id});
  }
  const receipt=await provider("/"+id+"?app_id="+APP_ID);
  if(receipt.canceled===true)throw Error("PROVIDER_SEND_CANCELED");
  if(receipt.web_url!==GALLERY)throw Error("DESTINATION_MISMATCH");
  if(receipt.headings?.en!==HEADING.en||receipt.headings?.es!==HEADING.es||receipt.contents?.en!==PUSH_COPY.en||receipt.contents?.es!==PUSH_COPY.es)throw Error("COPY_MISMATCH");
  const audience=receipt.filters?.[0];
  if(receipt.filters?.length!==1||audience.field!=="tag"||audience.key!=="loda_festival"||audience.relation!=="="||String(audience.value)!=="true")throw Error("AUDIENCE_MISMATCH");
  return json({ok:true,alreadySent,event:EVENT_ID,notificationId:id,acceptedAt,successful:receipt.successful??0,failed:receipt.failed??0,remaining:receipt.remaining??null,completedAt:receipt.completed_at??null,webUrl:receipt.web_url,filters:receipt.filters,verified:true});
 }catch(error){return json({error:error instanceof Error?error.message:"TASK_FAILED"},503);}
});
