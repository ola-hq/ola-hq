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
    "id": "welcome",
    "at": "2026-10-16T21:00:00.000Z",
    "heading": {
      "en": "WELCOME TO LA OLA! 🌊",
      "es": "¡BIENVENIDOS A LA OLA! 🌊"
    },
    "body": {
      "en": "Fruit, aguas and cold beer are waiting. Explore Plaza San Roberto and make yourself at home.",
      "es": "Ya hay fruta, aguas y cervezas frías. Explora la Plaza San Roberto y siéntete en casa."
    }
  },
  {
    "id": "seating",
    "at": "2026-10-16T22:00:00.000Z",
    "heading": {
      "en": "CEREMONY SEATING 💍",
      "es": "ASIENTOS PARA LA CEREMONIA 💍"
    },
    "body": {
      "en": "Please begin making your way to the ceremony seats. Bri and Jon can't wait to see you!",
      "es": "Por favor, comiencen a tomar asiento para la ceremonia. ¡Bri y Jon ya quieren verlos!"
    }
  },
  {
    "id": "seating-final",
    "at": "2026-10-16T22:15:00.000Z",
    "heading": {
      "en": "ONE LAST NUDGE 🤍",
      "es": "ÚLTIMO AVISO 🤍"
    },
    "body": {
      "en": "Please be seated. The ceremony is almost here!",
      "es": "Por favor, tomen asiento. ¡La ceremonia está por comenzar!"
    }
  },
  {
    "id": "gates",
    "at": "2026-10-16T23:00:00.000Z",
    "heading": {
      "en": "THE FESTIVAL IS OPEN! 🎺",
      "es": "¡EL FESTIVAL ESTÁ ABIERTO! 🎺"
    },
    "body": {
      "en": "Mariachi de Don Roberto is playing. Drinks and snacks are waiting. Welcome to our world!",
      "es": "Suena el Mariachi de Don Roberto. Hay bebidas y antojitos. ¡Bienvenidos a nuestro mundo!"
    }
  },
  {
    "id": "mirror",
    "at": "2026-10-17T00:15:00.000Z",
    "heading": {
      "en": "FOUND THE MAGIC MIRROR? 📸",
      "es": "¿YA VISTE EL ESPEJO MÁGICO? 📸"
    },
    "body": {
      "en": "Find the Magic Mirror near Súper Farmacia Domingo and grab a photo with your people.",
      "es": "Busca el Espejo Mágico junto a Súper Farmacia Domingo y tómate una foto con tu gente."
    }
  },
  {
    "id": "sunset",
    "at": "2026-10-17T01:00:00.000Z",
    "heading": {
      "en": "THE SUNSET SELECTORS ☀️",
      "es": "THE SUNSET SELECTORS ☀️"
    },
    "body": {
      "en": "Golden-hour groove is starting. Follow the music!",
      "es": "¡Comienza el groove de la hora dorada! Sigue la música."
    }
  },
  {
    "id": "entrance",
    "at": "2026-10-17T02:00:00.000Z",
    "heading": {
      "en": "A MOMENT FOR BRI + JON 🤍",
      "es": "UN MOMENTO PARA BRI + JON 🤍"
    },
    "body": {
      "en": "Everyone, please head toward the stage for our grand entrance, first dances, and a few words from family.",
      "es": "¡Todos al escenario, por favor! Se vienen nuestra entrada, los primeros bailes y unas palabras de familia."
    }
  },
  {
    "id": "group-photo-perreo",
    "at": "2026-10-17T02:53:00.000Z",
    "heading": {
      "en": "EVERYBODY TO THE DANCE FLOOR! 📸",
      "es": "¡TODOS A LA PISTA! 📸"
    },
    "body": {
      "en": "Everybody to the dance floor for our big group photo! Perreo Paraíso follows. Come find your spot!",
      "es": "¡Todos a la pista para nuestra gran foto grupal! Después sigue Perreo Paraíso. ¡Vengan ya!"
    }
  },
  {
    "id": "desserts",
    "at": "2026-10-17T03:35:00.000Z",
    "heading": {
      "en": "A LITTLE SOMETHING SWEET 🍰",
      "es": "ALGO DULCECITO 🍰"
    },
    "body": {
      "en": "Have you tried Aurora y Carmen's Postrecitos? Go find your favorite!",
      "es": "¿Ya probaste los Postrecitos de Aurora y Carmen? ¡Busca tu favorito!"
    }
  },
  {
    "id": "couple-photo",
    "at": "2026-10-17T04:15:00.000Z",
    "heading": {
      "en": "LET'S MAKE A MEMORY 📷",
      "es": "VAMOS A HACER UN RECUERDO 📷"
    },
    "body": {
      "en": "If Bri and Jon are free between dances, ask for a quick photo. And explore the memory walls!",
      "es": "Si Bri y Jon están libres entre bailes, pídeles una foto. ¡Y explora las paredes de recuerdos!"
    }
  },
  {
    "id": "time-machine",
    "at": "2026-10-17T04:45:00.000Z",
    "heading": {
      "en": "LA MÁQUINA DEL TIEMPO ⏳",
      "es": "LA MÁQUINA DEL TIEMPO ⏳"
    },
    "body": {
      "en": "The classics are taking over. Come sing your heart out!",
      "es": "¡Llegaron los clásicos! Ven a cantar con todo el corazón."
    }
  },
  {
    "id": "midnight-last-call",
    "at": "2026-10-17T06:00:00.000Z",
    "heading": {
      "en": "LAST CALL · 1 AM 🍹",
      "es": "ÚLTIMA RONDA · 1 AM 🍹"
    },
    "body": {
      "en": "Night Frequency begins. Staffed bar service ends at 1 AM. Grab that last bartender-made drink!",
      "es": "Arranca Night Frequency. El servicio de barra termina a la 1 AM. ¡Pide tu último trago preparado!"
    }
  },
  {
    "id": "afters-self-serve",
    "at": "2026-10-17T07:00:00.000Z",
    "heading": {
      "en": "YOU REALLY THOUGHT THAT WAS LAST CALL? 😂",
      "es": "¿DE VERDAD CREÍSTE QUE ERA LA ÚLTIMA? 😂"
    },
    "body": {
      "en": "Neon Mirage is on. Bartenders are off. The afters are ON. Serve yourself a drink—then serve us all one. 🌊",
      "es": "Llegó Neon Mirage. Los meseros se fueron. ¡Los afters comienzan! Sírvete un trago y, de paso, ¡sírvete uno para todos! 🌊"
    }
  },
  {
    "id": "tornaboda",
    "at": "2026-10-17T17:45:00.000Z",
    "heading": {
      "en": "ONE MORE WAVE TODAY 🌮",
      "es": "¡HOY NOS QUEDA OTRA OLA! 🌮"
    },
    "body": {
      "en": "Tornaboda starts at noon right here at La Tijera. Come relaxed and come hungry!",
      "es": "La Tornaboda comienza al mediodía aquí en La Tijera. ¡Vengan relajados y con hambre!"
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
    if (!res.ok || !payload?.id) {
      // Report a safe diagnosis to the authenticated host without exposing
      // provider credentials or returning arbitrary third-party response text.
      const raw=JSON.stringify(payload?.errors??payload?.error??"").toLowerCase();
      const providerCode=res.ok && !payload?.id ? "NO_MATCHING_SUBSCRIPTIONS"
        : res.status===401 || res.status===403 ? "KEY_REJECTED"
        : /app.?id|app.?key|application not found/.test(raw) ? "APP_ID_INVALID"
        : /filter|segment|target|audience/.test(raw) ? "AUDIENCE_INVALID"
        : /limit|quota|billing/.test(raw) ? "ACCOUNT_LIMIT"
        : res.status===400 || res.status===422 ? "REQUEST_INVALID"
        : "PROVIDER_ERROR";
      console.warn("[La Ola push] Provider rejected message", {providerStatus:res.status,providerCode});
      return {error:"PROVIDER_REJECTED",providerStatus:res.status,providerCode,status:502};
    }
    return {id:payload.id,status:200,recipients:typeof payload.recipients==="number"?payload.recipients:null};
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
  if(body.action==="preview") {
    const {data,error}=await db.from("loda_push_schedule").select("event_id,scheduled_for");
    if(error)return reply({error:"PREVIEW_UNAVAILABLE"},503,origin);
    const booked=new Set((data||[]).map(row=>row.event_id));
    return reply({ok:true,total:scheduled.length,program:scheduled.map(e=>({
      id:e.id,at:e.at,title:e.heading,body:e.body,status:booked.has(e.id)?"scheduled":"not_scheduled"
    }))},200,origin);
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
    return "error" in result?reply({error:result.error,providerCode:result.providerCode,providerStatus:result.providerStatus},result.status,origin):reply({ok:true,notificationId:result.id},200,origin);
  }
  // One manually confirmed beta push, immediately, per Guadalajara calendar day.
  // This action requires the same private host credentials as scheduling.
  // Deliver ONLY to guests who opted into the festival category.
  if(body.action==="beta") {
    if(!Deno.env.get("ONESIGNAL_REST_API_KEY")) return reply({error:"PUSH_NOT_CONFIGURED"},503,origin);
    const parts=Object.fromEntries(
      new Intl.DateTimeFormat("en-US",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"})
        .formatToParts(new Date()).map(x=>[x.type,x.value]));
    const day=parts.year+"-"+parts.month+"-"+parts.day;
    const {data:existing,error:lookupError}=await db.from("loda_push_beta_runs")
      .select("provider_notification_id,provider_recipients,accepted_at")
      .eq("local_date",day).maybeSingle();
    if(lookupError)return reply({error:"BETA_STATUS_UNAVAILABLE"},503,origin);
    if(existing)return reply({ok:true,alreadySent:true,notificationId:existing.provider_notification_id,
      recipients:existing.provider_recipients,acceptedAt:existing.accepted_at},200,origin);
    const result=await deliver({
      filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],
      headings:{en:"BETA TEST — LA OLA DE AMOR 🌊🔔",es:"PRUEBA — LA OLA DE AMOR 🌊🔔"},
      contents:{
        en:"Your festival app is speaking! 😂 If you see this on your lock screen, reply 🔔 in Casa Luna. This is only a test!",
        es:"¡La app del festival está hablando! 😂 Si ves esto en tu pantalla, responde 🔔 en Casa Luna. ¡Es solo una prueba!"
      },
      idempotency_key:await eventKey("beta-"+day),
      ttl:600
    });
    if("error" in result)return reply({error:result.error,providerCode:result.providerCode,providerStatus:result.providerStatus},result.status,origin);
    const {error:saveError}=await db.from("loda_push_beta_runs").insert({
      local_date:day,provider_notification_id:result.id,provider_recipients:result.recipients
    });
    if(saveError)return reply({error:"BETA_ACCEPTED_RECEIPT_FAILED",
      notificationId:result.id,recipients:result.recipients},503,origin);
    return reply({ok:true,alreadySent:false,notificationId:result.id,recipients:result.recipients},200,origin);
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
      if("error" in result) return reply({error:result.error,providerCode:result.providerCode,providerStatus:result.providerStatus,completed:outcomes},result.status,origin);
      const {error:storeError}=await db.from("loda_push_schedule").insert({event_id:event.id,provider_notification_id:result.id,scheduled_for:event.at});
      if(storeError) return reply({error:"SCHEDULED_BUT_RECEIPT_FAILED",event:event.id,completed:outcomes},503,origin);
      outcomes.push({event:event.id,status:"scheduled",notificationId:result.id});
    }
    return reply({ok:true,results:outcomes},200,origin);
  }
  return reply({error:"UNKNOWN_ACTION"},400,origin);
});
