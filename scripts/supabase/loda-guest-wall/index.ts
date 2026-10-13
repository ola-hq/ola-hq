import { createClient } from "npm:@supabase/supabase-js@2";
const SITE="https://ola-hq.github.io";
const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
const headers=(origin:string|null)=>({"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin",...(origin===SITE?{"access-control-allow-origin":SITE}:{}),"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"apikey,authorization,content-type,x-client-info,x-loda-moderator-token"});
const reply=(data:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(data),{status,headers:headers(origin)});
const digest=async(s:string)=>{const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return [...new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("")};
// Optional, private-server-side OneSignal delivery. Guest note content is never put in push notifications.
async function notifyNewGuestNote() {
 const key=Deno.env.get("ONESIGNAL_REST_API_KEY");
 if(!key)return;
 try {
  const {data:claimed,error:throttleError}=await db.rpc("loda_claim_push_slot",{topic_name:"platica",cooldown_seconds:300});
  if(throttleError||!claimed)return;
  await fetch("https://api.onesignal.com/notifications",{
    method:"POST",
    headers:{"content-type":"application/json","Authorization":"Key "+key},
    body:JSON.stringify({
      app_id:"7a08d6ee-1181-4925-bd3f-1a7a7439aaee",
      target_channel:"push",
      filters:[{field:"tag",key:"loda_platica",relation:"=",value:"true"}],
      headings:{en:"A NEW NOTE IN LA PLÁTICA 💌",es:"NUEVO MENSAJE EN LA PLÁTICA 💌"},
      contents:{en:"Someone left a little love in our guestbook. Tap to read it. 🌊",es:"Alguien dejó un mensajito en nuestro libro de visitas. ¡Ven a leerlo! 🌊"},
      web_url:"https://ola-hq.github.io/ola-hq/la-ola-de-amor/scan/guide/#updates",
      idempotency_key:crypto.randomUUID(),
      ttl:900
    }),
    signal:AbortSignal.timeout(4000)
  });
 }catch{ /* Notifications are optional; never fail the guestbook post. */ }
}

Deno.serve(async(req)=>{
 const origin=req.headers.get("origin");if(origin&&origin!==SITE)return reply({error:"ORIGIN_NOT_ALLOWED"},403,origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(req.method==="GET"){
 const {data,error}=await db.from("loda_guest_wall").select("id,guest_name,message,created_at").eq("status","visible").order("created_at",{ascending:false}).limit(100);
 return error?reply({error:"WALL_UNAVAILABLE"},503,origin):reply({messages:data||[]},200,origin);
 }
 if(req.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405,origin);
 if(origin!==SITE)return reply({error:"ORIGIN_REQUIRED"},403,origin);
 if(!(req.headers.get("content-type")||"").includes("application/json"))return reply({error:"JSON_REQUIRED"},415,origin);
 const raw=await req.text();if(raw.length>1800)return reply({error:"TOO_LARGE"},413,origin);
 let body:Record<string,unknown>;try{body=JSON.parse(raw)}catch{return reply({error:"INVALID_JSON"},400,origin)}
 if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"INVALID_INPUT"},400,origin);
 if(body.action==="moderate"||body.action==="auth"){
 const token=req.headers.get("x-loda-moderator-token")||"";
 if(!/^[a-f0-9]{64}$/i.test(token))return reply({error:"NOT_AUTHORIZED"},401,origin);
 const rawKey=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 const tokenHash=[...new Uint8Array(rawKey)].map(x=>x.toString(16).padStart(2,"0")).join("");
 const {data:owner}=await db.from("loda_guest_moderator_keys").select("id").eq("token_hash",tokenHash).eq("is_active",true).maybeSingle();
 if(!owner)return reply({error:"NOT_AUTHORIZED"},401,origin);
 if(body.action==="auth")return reply({ok:true},200,origin);
 if(typeof body.id!=="string"||!/^[a-f0-9-]{36}$/i.test(body.id)||body.status!=="hidden")return reply({error:"INVALID_INPUT"},400,origin);
 const {error}=await db.from("loda_guest_wall").update({status:"hidden",hidden_at:new Date().toISOString()}).eq("id",body.id);
 return error?reply({error:"UPDATE_FAILED"},503,origin):reply({ok:true},200,origin);
 }
 if(typeof body.website==="string"&&body.website)return reply({ok:true,queued:false},200,origin);
 const name=typeof body.name==="string"?body.name.trim():"",message=typeof body.message==="string"?body.message.trim():"";
 if(name.length<2||name.length>48||message.length<1||message.length>500)return reply({error:"INVALID_INPUT"},400,origin);
 if(/https?:\/\/|www\./i.test(message))return reply({error:"LINKS_NOT_ALLOWED"},400,origin);
 const ip=(req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
 const ipHash=await digest("loda-guest-wall-v1:"+ip);
 const since=new Date(Date.now()-3600_000).toISOString();
 const {count,error:rateErr}=await db.from("loda_guest_wall").select("id",{count:"exact",head:true}).eq("ip_hash",ipHash).gte("created_at",since);
 if(rateErr)return reply({error:"WALL_UNAVAILABLE"},503,origin);
 if((count||0)>=5)return reply({error:"SLOW_DOWN"},429,origin);
 const {data,error}=await db.from("loda_guest_wall").insert({guest_name:name,message,ip_hash:ipHash}).select("id,guest_name,message,created_at").single();
 if(error)return reply({error:"WALL_UNAVAILABLE"},503,origin);
 // Never delay or roll back the guestbook write because of push service availability.
 const task=notifyNewGuestNote();
 const runtime=globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil:(task:Promise<void>)=>void } };
 if(runtime.EdgeRuntime?.waitUntil) runtime.EdgeRuntime.waitUntil(task);
 else await task;
 return reply({ok:true,message:data},201,origin);
});