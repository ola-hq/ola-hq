import { createClient } from "npm:@supabase/supabase-js@2";
const SITE = "https://ola-hq.github.io";
const APP_ID = "7a08d6ee-1181-4925-bd3f-1a7a7439aaee";
const GUIDE = "https://ola-hq.github.io/ola-hq/la-ola-de-amor/scan/guide/#updates";
const db = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", {auth:{persistSession:false,autoRefreshToken:false}});
const cors = (origin: string | null) => ({
  "content-type": "application/json; charset=utf-8", "cache-control":"no-store",
  ...(origin===SITE ? {"access-control-allow-origin":SITE}:{}),
  "access-control-allow-methods":"POST,OPTIONS",
  "access-control-allow-headers":"authorization,apikey,content-type,x-loda-moderator-token",
  "vary":"Origin"
});
const reply=(data:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(data),{status,headers:cors(origin)});
async function validHost(req:Request) {
  const token=req.headers.get("x-loda-moderator-token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return false;
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  const {data,error}=await db.from("loda_guest_moderator_keys").select("id").eq("token_hash",hash).eq("is_active",true).limit(1).maybeSingle();
  return !error && Boolean(data);
}
const scheduled=[
  {
    id:"midnight-last-call", at:"2026-10-17T06:00:00.000Z",
    heading:{en:"LAST CALL · 1:00 AM 🍹",es:"ÚLTIMA RONDA · 1:00 AM 🍹"},
    body:{
      en:"La Ola, your one-hour warning: our staffed bar closes at 1:00 AM. Grab your last bartender-made drink, raise a glass, and keep the music going. 🌊",
      es:"¡Atención, La Ola! Queda una hora de servicio en la barra: el equipo termina a la 1:00 AM. Pide tu última bebida preparada, brinda y sigue bailando. 🌊"
    }
  },
  {
    id:"afters-self-serve", at:"2026-10-17T07:00:00.000Z",
    heading:{en:"YOU REALLY THOUGHT THAT WAS LAST CALL? 😂",es:"¿DE VERDAD CREÍSTE QUE ERA LA ÚLTIMA? 😂"},
    body:{
      en:"You really thought that was last call? Our bartenders are off the clock, but the afters just started. Want another drink? Head to the bar and serve yourself. In fact… serve us all one. 🌊",
      es:"¿De verdad creíste que era la última ronda? El equipo de barra ya terminó, ¡pero los afters apenas comienzan! ¿Quieres otro trago? Pásate a la barra y sírvete. Es más… ¡sírvenos uno a todos! 🌊"
    }
  }
] as const;
async function eventKey(id:string) {
  const input=APP_ID+":la-ola-push-v1:"+id;
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input)));
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const h=[...bytes.slice(0,16)].map(b=>b.toString(16).padStart(2,"0")).join("");
  return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20,32);
}
async function deliver(body:Record<string,unknown>) {
  const key=Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!key) return {error:"PUSH_NOT_CONFIGURED",status:503};
  try {
    const res=await fetch("https://api.onesignal.com/notifications",{
      method:"POST",headers:{"content-type":"application/json","Authorization":"Key "+key},
      body:JSON.stringify({app_id:APP_ID,target_channel:"push",web_url:GUIDE,...body}),
      signal:AbortSignal.timeout(9000)
    });
    const payload=await res.json().catch(()=>({}));
    if (!res.ok || !payload?.id) return {error:"PROVIDER_REJECTED",status:502};
    return {id:payload.id,status:200};
  } catch {
    return {error:"PROVIDER_UNAVAILABLE",status:503};
  }
}
Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(origin && origin!==SITE) return reply({error:"ORIGIN_NOT_ALLOWED"},403,origin);
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST" || origin!==SITE) return reply({error:"ORIGIN_REQUIRED"},403,origin);
  if(!await validHost(req)) return reply({error:"NOT_AUTHORIZED"},401,origin);
  if(!(req.headers.get("content-type")||"").includes("application/json")) return reply({error:"JSON_REQUIRED"},415,origin);
  const raw=await req.text(); if(raw.length>1200) return reply({error:"TOO_LARGE"},413,origin);
  let body:Record<string,unknown>;
  try {body=JSON.parse(raw)} catch {return reply({error:"INVALID_JSON"},400,origin)}
  if(!body || typeof body!=="object" || Array.isArray(body)) return reply({error:"INVALID_INPUT"},400,origin);
  if(body.action==="status") {
    const {data,error}=await db.from("loda_push_schedule").select("event_id,provider_notification_id,scheduled_for,created_at").order("scheduled_for");
    return error?reply({error:"STATUS_UNAVAILABLE"},503,origin):reply({scheduled:data||[],configured:Boolean(Deno.env.get("ONESIGNAL_REST_API_KEY"))},200,origin);
  }
  if(body.action==="test") {
    const subscriptionId=body.subscriptionId;
    if(typeof subscriptionId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subscriptionId)) return reply({error:"VALID_SUBSCRIPTION_REQUIRED"},400,origin);
    const result=await deliver({
      include_subscription_ids:[subscriptionId],
      headings:{en:"LA OLA DE AMOR — TEST 🌊",es:"LA OLA DE AMOR — PRUEBA 🌊"},
      contents:{en:"If this reached your lock screen, WE DID IT! 🔔 Welcome to our world.",es:"¡Si esto llegó a tu pantalla, LO LOGRAMOS! 🔔 Bienvenidos a nuestro mundo."},
      idempotency_key:crypto.randomUUID(),ttl:300
    });
    return "error" in result?reply({error:result.error},result.status,origin):reply({ok:true,notificationId:result.id},200,origin);
  }
  if(body.action==="schedule") {
    if(!Deno.env.get("ONESIGNAL_REST_API_KEY")) return reply({error:"PUSH_NOT_CONFIGURED"},503,origin);
    const outcomes=[];
    for(const event of scheduled) {
      if(Date.parse(event.at)<=Date.now()+60000) return reply({error:"EVENT_TOO_CLOSE_OR_PASSED",event:event.id},409,origin);
      const {data:existing,error:lookupError}=await db.from("loda_push_schedule").select("provider_notification_id").eq("event_id",event.id).maybeSingle();
      if(lookupError) return reply({error:"SCHEDULE_UNAVAILABLE"},503,origin);
      if(existing){ outcomes.push({event:event.id,status:"already_scheduled"});continue;}
      const result=await deliver({
        headings:event.heading,contents:event.body,send_after:event.at,ttl:3600,
        filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],
        idempotency_key:await eventKey(event.id)
      });
      if("error" in result) return reply({error:result.error,completed:outcomes},result.status,origin);
      const {error:storeError}=await db.from("loda_push_schedule").insert({event_id:event.id,provider_notification_id:result.id,scheduled_for:event.at});
      if(storeError) return reply({error:"SCHEDULED_BUT_RECEIPT_FAILED",event:event.id,completed:outcomes},503,origin);
      outcomes.push({event:event.id,status:"scheduled",notificationId:result.id});
    }
    return reply({ok:true,results:outcomes},200,origin);
  }
  return reply({error:"UNKNOWN_ACTION"},400,origin);
});
