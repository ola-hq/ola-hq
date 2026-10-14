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
    "id": "thursday-setup-party",
    "at": "2026-10-15T18:00:00.000Z",
    "heading": {
      "en": "TODAY: SETUP PRE-PARTY! 🛠️🌊",
      "es": "¡HOY: PRE-FIESTA DE MONTAJE! 🛠️🌊"
    },
    "body": {
      "en": "3 PM at La Tijera: our festival setup pre-party! Casa Sol, Casa Luna, locals, and the whole village—if you're coming to La Ola, you're welcome to stop by, lend a hand, and hang out. Want to keep the surprise for Friday? Then don't peek. 😂❤️",
      "es": "¡A las 3 PM en La Tijera hacemos pre-fiesta de montaje! Casa Sol, Casa Luna, vecinos y toda nuestra gente: si vienes a La Ola, puedes pasar, echarnos la mano y convivir. ¿Prefieres guardar la sorpresa para el viernes? ¡Entonces no vengas a espiar! 😂❤️"
    }
  },
  {
    "id": "wedding-day",
    "at": "2026-10-16T17:00:00.000Z",
    "heading": {
      "en": "TODAY IS THE DAY! 🌞",
      "es": "¡HOY ES EL GRAN DÍA! 🌞"
    },
    "body": {
      "en": "Today's the day! Dress up, bring your best energy, and remember we're celebrating outdoors. Comfortable shoes are your friend. See you at La Tijera! 🌊",
      "es": "¡Hoy es el gran día! Vénganse guapos, con toda la actitud. Estaremos al aire libre, así que unos zapatos cómodos ayudan. ¡Nos vemos en La Tijera! 🌊"
    }
  },
  {
    "id": "on-the-way",
    "at": "2026-10-16T20:30:00.000Z",
    "heading": {
      "en": "THE WAVE IS WAITING 🚗🌊",
      "es": "¡LA OLA LOS ESPERA! 🚗🌊"
    },
    "body": {
      "en": "Heading our way? We're getting ready for you! Ceremony seating begins at 4 PM. Give yourself time to arrive and get comfortable.",
      "es": "¿Ya vienen en camino? ¡Los esperamos! Empezamos a tomar asiento a las 4 PM. Lleguen con tiempo para acomodarse."
    }
  },
  {
    "id": "welcome",
    "at": "2026-10-16T21:00:00.000Z",
    "heading": {
      "en": "WELCOME TO LA OLA! 🌊",
      "es": "¡BIENVENIDOS A LA OLA! 🌊"
    },
    "body": {
      "en": "Fruit, aguas frescas, and cold beer are waiting! Explore Plaza San Roberto and make yourself at home. Welcome to our world!",
      "es": "¡Ya los esperan fruta, aguas frescas y cervezas bien frías! Exploren Plaza San Roberto y siéntanse como en casa. ¡Bienvenidos a nuestro mundo!"
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
      "es": "Vayan tomando sus lugares para la ceremonia. ¡Bri y Jon ya quieren verlos!"
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
      "es": "¡Todos a sus lugares, por favor! La ceremonia está por comenzar."
    }
  },
  {
    "id": "gates",
    "at": "2026-10-16T23:00:00.000Z",
    "heading": {
      "en": "LET THE CELEBRATION BEGIN! 🎺",
      "es": "¡QUE EMPIECE LA FIESTA! 🎺"
    },
    "body": {
      "en": "Mariachi de Don Roberto is getting the party started! Grab a drink and explore the plaza. Look out for Beto's Botana and Frutería Rivera. Welcome to our world! 🌊",
      "es": "¡Mariachi de Don Roberto arranca la fiesta! Pidan algo de tomar y recorran la plaza. Busquen Beto's Botana y Frutería Rivera. ¡Bienvenidos a nuestro mundo! 🌊"
    }
  },
  {
    "id": "love-bri",
    "at": "2026-10-16T23:26:00.000Z",
    "heading": {
      "en": "SHUG, LOOK WHAT LOVE BUILT 🤍",
      "es": "SHUG, MIRA LO QUE CREÓ EL AMOR 🤍"
    },
    "body": {
      "en": "Shug, take one second and look around. All these people, all these little details, all this joy. You're the heart of this wave—and we love you. 🤍",
      "es": "Shug, detente un segundito y mira a tu alrededor. Toda esta gente, los detalles, la alegría. Eres el corazón de esta ola… y te queremos muchísimo. 🤍"
    }
  },
  {
    "id": "explore-plaza",
    "at": "2026-10-16T23:45:00.000Z",
    "heading": {
      "en": "EXPLORE YOUR PLAZA 🏘️",
      "es": "¡RECORRAN SU PLAZA! 🏘️"
    },
    "body": {
      "en": "This isn't your usual wedding. Take a walk around Plaza San Roberto, discover our little businesses, and see what we've built for you. 🌊",
      "es": "Esto no es una boda cualquiera. Dense una vuelta por Plaza San Roberto, conozcan nuestros negocitos y descubran todo lo que preparamos para ustedes. 🌊"
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
      "en": "Find the Magic Mirror near Súper Farmacia Domingo! It's here until 7 PM, then returns from 9–11 PM. Grab your people!",
      "es": "¡Busca el Espejo Mágico junto a Súper Farmacia Domingo! Está hasta las 7 PM y regresa de 9–11 PM. ¡Junta a tu gente!"
    }
  },
  {
    "id": "love-jon",
    "at": "2026-10-17T00:32:00.000Z",
    "heading": {
      "en": "SHUG, DON'T MISS THIS MOMENT 🤍",
      "es": "SHUG, NO TE PIERDAS ESTE MOMENTO 🤍"
    },
    "body": {
      "en": "Shug, you dreamed up a whole little world for the people you love. Look around: they're here, and it's real. Put the phone down for a second. This one's yours too. 🤍",
      "es": "Shug, soñaste todo un mundito para la gente que quieres. Mira alrededor: aquí están, y todo es real. Suelta el celular un ratito. Este momento también es tuyo. 🤍"
    }
  },
  {
    "id": "memory-walls",
    "at": "2026-10-17T00:45:00.000Z",
    "heading": {
      "en": "THESE ARE OUR PEOPLE ❤️",
      "es": "ESTA ES NUESTRA GENTE ❤️"
    },
    "body": {
      "en": "Take a little walk through our memories. The photos, the places, the people. So much of our story is here tonight—and now you're part of it.",
      "es": "Dense una vueltecita por nuestros recuerdos. Las fotos, los lugares, nuestra gente. Tanta historia está aquí esta noche… y ahora ustedes son parte de ella."
    }
  },
  {
    "id": "sunset",
    "at": "2026-10-17T01:00:00.000Z",
    "heading": {
      "en": "SUNSET SELECTORS ☀️",
      "es": "SUNSET SELECTORS ☀️"
    },
    "body": {
      "en": "From mariachi to sunset grooves. Sunset Selectors are taking over! Follow the music and enjoy the ride. Make your way to the Sol y Luna Main Stage!",
      "es": "Del mariachi al ritmo del atardecer. ¡Llegaron los Sunset Selectors! Sigue la música y déjate llevar. ¡Acérquense al escenario principal Sol y Luna!"
    }
  },
  {
    "id": "formal-soon",
    "at": "2026-10-17T01:40:00.000Z",
    "heading": {
      "en": "SOMETHING SPECIAL IS COMING 🤍",
      "es": "SE VIENE ALGO ESPECIAL 🤍"
    },
    "body": {
      "en": "In about 20 minutes, we're gathering near the stage for a few moments close to our hearts. Find your people and make your way over.",
      "es": "En unos 20 minutos nos reunimos junto al escenario para compartir unos momentos muy especiales. Busquen a su gente y váyanse acercando."
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
      "en": "Gather near the stage! It's time for our grand entrance, first dances, and a few words from the people we love.",
      "es": "¡Nos vemos junto al escenario! Llegó el momento de nuestra gran entrada, primeros bailes y unas palabras de nuestra gente."
    }
  },
  {
    "id": "desserts",
    "at": "2026-10-17T03:35:00.000Z",
    "heading": {
      "en": "SOMETHING SWEET! 🍰",
      "es": "¡ALGO DULCECITO! 🍰"
    },
    "body": {
      "en": "Time for a little sweetness! Find Aurora y Carmen's Postrecitos and treat yourself. You earned it. 😂",
      "es": "¡Hora de algo dulce! Busquen los Postrecitos de Aurora y Carmen y dense un gustito. ¡Se lo merecen! 😂"
    }
  },
  {
    "id": "mirror-again",
    "at": "2026-10-17T03:55:00.000Z",
    "heading": {
      "en": "ROUND TWO AT THE MIRROR! 📸",
      "es": "¡SEGUNDA VUELTA AL ESPEJO! 📸"
    },
    "body": {
      "en": "The Magic Mirror is back near Súper Farmacia Domingo until 11 PM. Your group photo isn't going to take itself! 😂",
      "es": "¡Regresó el Espejo Mágico! Está junto a Súper Farmacia Domingo hasta las 11 PM. ¡Esa foto con tu bolita no se va a tomar sola! 😂"
    }
  },
  {
    "id": "couple-photo",
    "at": "2026-10-17T04:15:00.000Z",
    "heading": {
      "en": "MAKE A MEMORY 📷",
      "es": "VAMOS A HACER UN RECUERDO 📷"
    },
    "body": {
      "en": "Look around. These are your people. Grab a photo together, explore our memory walls, and make tonight one to remember. ❤️",
      "es": "Mira a tu alrededor. Esta es tu gente. Tómense una foto, recorran nuestros muros de recuerdos y guarden este momento para siempre. ❤️"
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
      "en": "We're taking it BACK! Old favorites, forgotten classics, and songs you still know every word to. See you on the dance floor! Make your way to the Sol y Luna Main Stage!",
      "es": "¡NOS VAMOS AL PASADO! Viejos favoritos, clásicos inolvidables y canciones que todavía te sabes completitas. ¡Nos vemos en la pista! ¡Acérquense al escenario principal Sol y Luna!"
    }
  },
  {
    "id": "love-our-people",
    "at": "2026-10-17T05:08:00.000Z",
    "heading": {
      "en": "HEY YOU. YES, YOU. 🫵❤️",
      "es": "OYE, TÚ. SÍ, TÚ. 🫵❤️"
    },
    "body": {
      "en": "Not the person next to you. YOU. Thank you for showing up, bringing your whole self, and making this night what it is. We love you. Now go dance. 🌊",
      "es": "No la persona de al lado. ¡TÚ! Gracias por estar aquí, por ser tú y por hacer esta noche tan especial. Te queremos. Ahora sí… ¡a bailar! 🌊"
    }
  },
  {
    "id": "keep-dancing",
    "at": "2026-10-17T05:30:00.000Z",
    "heading": {
      "en": "YOU KNOW THIS ONE! 🎶",
      "es": "¡ESTA TE LA SABES! 🎶"
    },
    "body": {
      "en": "Don't you dare leave the dance floor yet. There's still so much music—and so many memories—to make. 😂",
      "es": "¡Ni se les ocurra salirse de la pista! Todavía nos queda muchísima música y un montón de recuerdos por hacer. 😂"
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
      "en": "Night Frequency is taking over! One more hour of bartender service. Grab your final bartender-made drink and get back to dancing! Make your way to the Sol y Luna Main Stage!",
      "es": "¡Llegó Night Frequency! Queda una hora de servicio en la barra. ¡Pide tu último trago preparado y regresa a bailar! ¡Acérquense al escenario principal Sol y Luna!"
    }
  },
  {
    "id": "water-and-bar",
    "at": "2026-10-17T06:30:00.000Z",
    "heading": {
      "en": "30 MINUTES LEFT! ⏰",
      "es": "¡QUEDAN 30 MINUTOS! ⏰"
    },
    "body": {
      "en": "Half an hour until staffed bar service ends! Grab water, check on your people, and get ready for the final chapter of the night. 🌊",
      "es": "¡Queda media hora de servicio en la barra! Agarren agua, chequen cómo anda su gente y prepárense para el último capítulo de la noche. 🌊"
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
      "en": "YOU REALLY THOUGHT?! 😂 The bartenders are done, but Neon Mirage is just beginning. The afters are ON. Want another drink? Serve yourself—and pour us one too! 🌊 Make your way to the Sol y Luna Main Stage!",
      "es": "¿DE VERDAD CREÍSTE QUE YA SE ACABÓ? 😂 Los bartenders terminaron, ¡pero Neon Mirage apenas comienza! ¿Otro trago? Sírvete… ¡y sírvenos uno también! 🌊 ¡Acérquense al escenario principal Sol y Luna!"
    }
  },
  {
    "id": "neon-last-wave",
    "at": "2026-10-17T07:30:00.000Z",
    "heading": {
      "en": "ONE LAST WAVE 🌙",
      "es": "UNA ÚLTIMA OLA 🌙"
    },
    "body": {
      "en": "We've got one more half hour of Neon Mirage. Find your people, get on that dance floor, and give us one last memory. ❤️",
      "es": "Nos queda media hora de Neon Mirage. Busquen a su gente, regresen a la pista y regálennos un último recuerdo. ❤️"
    }
  },
  {
    "id": "wake-up",
    "at": "2026-10-17T16:30:00.000Z",
    "heading": {
      "en": "Y'ALL STILL ALIVE? 😂",
      "es": "¿SIGUEN VIVOS? 😂"
    },
    "body": {
      "en": "GOOD MORNING, LA OLA! 😂 Drink some water, find your sunglasses, and get ready. We've got one more afternoon together!",
      "es": "¡BUENOS DÍAS, LA OLA! 😂 Tomen agüita, busquen sus lentes de sol y prepárense. ¡Todavía nos queda otra tarde juntos!"
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
      "en": "We're doing it again! Tornaboda starts at noon at La Tijera. Same place, one more afternoon together. Come as you are! 🌊",
      "es": "¡NOS QUEDA OTRA OLA! La Tornaboda empieza al mediodía en La Tijera. Mismo lugar, otra tarde juntos. ¡Vengan como quieran! 🌊"
    }
  },
  {
    "id": "afterglow",
    "at": "2026-10-17T18:30:00.000Z",
    "heading": {
      "en": "THE AFTERGLOW ☀️",
      "es": "LA OLA CONTINÚA ☀️"
    },
    "body": {
      "en": "No speeches. No formal dances. Just our people, one more afternoon, and a chance to slow things down. Welcome back. ❤️",
      "es": "Sin discursos. Sin bailes formales. Nomás nuestra gente, otra tarde juntos y un ratito para relajarnos. Bienvenidos de regreso. ❤️"
    }
  },
  {
    "id": "love-together",
    "at": "2026-10-17T20:32:00.000Z",
    "heading": {
      "en": "BRI + JON, LOOK AROUND AGAIN 🤍",
      "es": "BRI + JON, VUELVAN A MIRAR 🤍"
    },
    "body": {
      "en": "This wave was never just about one night. It's about the people who keep showing up for each other. Look around—the party is the people. That's the whole point. 🌊",
      "es": "Esta ola nunca fue solo una noche. Es por la gente que siempre está presente. Miren a su alrededor: la fiesta es nuestra gente. De eso se trata todo. 🌊"
    }
  },
  {
    "id": "tornaboda-photo",
    "at": "2026-10-17T21:30:00.000Z",
    "heading": {
      "en": "ONE MORE PICTURE? 📸",
      "es": "¿OTRA FOTITO? 📸"
    },
    "body": {
      "en": "Yesterday was incredible, but we're still making memories. Get a photo with someone you love before the weekend slips away.",
      "es": "Ayer estuvo increíble, pero seguimos haciendo recuerdos. Tómate una foto con alguien que quieras antes de que se nos vaya el fin de semana."
    }
  },
  {
    "id": "thank-you",
    "at": "2026-10-17T22:45:00.000Z",
    "heading": {
      "en": "THANK YOU FOR BEING OUR WAVE ❤️",
      "es": "GRACIAS POR SER PARTE DE NUESTRA OLA ❤️"
    },
    "body": {
      "en": "From the bottom of our hearts, thank you for being part of La Ola de Amor. This whole world was made for the people we love. And that means you. 🌊",
      "es": "De todo corazón, gracias por ser parte de La Ola de Amor. Todo este mundo lo creamos para la gente que queremos. Y eso los incluye a ustedes. 🌊"
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
  if (!key) return {error:"PUSH_NOT_CONFIGURED",status:503,providerStatus:null,providerCode:"PUSH_NOT_CONFIGURED"};
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
    return {error:"PROVIDER_UNAVAILABLE",status:503,providerStatus:null,providerCode:"PROVIDER_UNAVAILABLE"};
  }
}
// The notification history is public/read-only; only this host-protected service-role
// endpoint can record accepted festival broadcasts. Future cues stay hidden by RLS.
async function rememberFestivalPush(id:string, heading:Record<string,string>, body:Record<string,string>, publishedAt:string, providerId:string, kind:"festival"|"beta"="festival") {
  const {error}=await db.from("loda_festival_notification_history").upsert({
    id,title_en:heading.en,title_es:heading.es,body_en:body.en,body_es:body.es,
    published_at:publishedAt,kind,provider_notification_id:providerId
  },{onConflict:"id"});
  if(error) console.warn("[La Ola push] Feed history write failed",{event:id,code:error.code});
  return !error;
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
    const feedId="beta-"+day;
    const heading={en:"LA OLA DE AMOR 🌊🔔",es:"LA OLA DE AMOR 🌊🔔"};
    const message={
      en:"If you're reading this, IT WORKED! 😂 Just making sure a little festival magic is reaching you. So far, so good! 🤫 Don't mention this alert in the chat just yet. Instead, drop a GIF showing what you expect to look like by the end of La Ola de Amor. That's how we'll know you got it. The celebration is almost here! 🌊",
      es:"¡Si estás leyendo esto, FUNCIONÓ! 😂 Solo queremos asegurarnos de que te esté llegando un poquito de magia del festival. ¡Hasta ahora, todo bien! 🤫 Todavía no menciones esta alerta en el chat. Mejor manda un GIF de cómo crees que vas a estar al final de La Ola de Amor. Así sabremos que te llegó. ¡La celebración ya casi está aquí! 🌊"
    };
    const result=await deliver({
      filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],
      headings:heading,contents:message,
      web_url:GUIDE.replace("#updates","#updates/"+feedId),
      idempotency_key:await eventKey("beta-"+day),
      ttl:600
    });
    if("error" in result)return reply({error:result.error,providerCode:result.providerCode,providerStatus:result.providerStatus},result.status,origin);
    const {error:saveError}=await db.from("loda_push_beta_runs").insert({
      local_date:day,provider_notification_id:result.id,provider_recipients:result.recipients
    });
    if(saveError)return reply({error:"BETA_ACCEPTED_RECEIPT_FAILED",
      notificationId:result.id,recipients:result.recipients},503,origin);
    const feedSaved=await rememberFestivalPush(feedId,heading,message,new Date().toISOString(),result.id,"beta");
    return reply({ok:true,alreadySent:false,notificationId:result.id,recipients:result.recipients,feedSaved},200,origin);
  }
  // A distinct, one-time, owner-approved group beta. This is intentionally
  // independent of the daily group GIF beta and all 31 wedding event timers.
  // The primary key and OneSignal idempotency key prevent duplicate sending.
  if(body.action==="stress_report") {
    if(!Deno.env.get("ONESIGNAL_REST_API_KEY")) return reply({error:"PUSH_NOT_CONFIGURED"},503,origin);
    const feedId="beta-stress-report-2026-10-13";
    const heading={"en":"Beta Test — The Stress Report 🌊🔔","es":"Prueba Beta — El Reporte del Estrés 🌊🔔"};
    const message={"en":"ALRIGHT BITCHES, THIS SHIT'S LIVE! 🌊🔔\n\nIt's been a stressful fucking day. I've already managed to piss off my wife, but I know she still loves me. 😂❤️\n\nOnce y'all start arriving, Bri will finally have enough backup to outnumber me. We can put this chaos behind us and start having some FUCKING FUN!\n\nWe're almost there, people. I love you guys. 🌊\n\nIf you got this, drop a 🌊 in the chat.\n\n— Jon","es":"¡A VER, CABRONES, ESTA MADRE YA ESTÁ EN VIVO! 🌊🔔\n\nHa sido un pinche día estresante. Ya hasta hice enojar a mi esposa, ¡pero sé que todavía me quiere! 😂❤️\n\nEn cuanto empiecen a llegar, Bri va a tener refuerzos para hacerme montón. Vamos a dejar todo este desmadre atrás y ¡POR FIN EMPEZAR A PASÁRNOSLA DE POCA MADRE!\n\nYa casi, mi gente. Los quiero mucho. 🌊\n\nSi les llegó, manden una 🌊 al chat.\n\n— Jon"};
    const {data:existing,error:lookupError}=await db.from("loda_push_special_beta_runs")
      .select("provider_notification_id,provider_recipients,accepted_at")
      .eq("beta_id",feedId).maybeSingle();
    if(lookupError) return reply({error:"SPECIAL_BETA_STATUS_UNAVAILABLE"},503,origin);
    if(existing) {
      const feedSaved=await rememberFestivalPush(feedId,heading,message,existing.accepted_at,existing.provider_notification_id,"beta");
      return reply({ok:true,alreadySent:true,notificationId:existing.provider_notification_id,
        recipients:existing.provider_recipients,acceptedAt:existing.accepted_at,feedSaved},200,origin);
    }
    const result=await deliver({
      filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],
      headings:heading,contents:message,
      web_url:GUIDE.replace("#updates","#updates/"+feedId),
      idempotency_key:await eventKey(feedId),
      ttl:600
    });
    if("error" in result) return reply({error:result.error,providerCode:result.providerCode,
      providerStatus:result.providerStatus},result.status,origin);
    const {error:saveError}=await db.from("loda_push_special_beta_runs").insert({
      beta_id:feedId,provider_notification_id:result.id,provider_recipients:result.recipients
    });
    if(saveError) return reply({error:"SPECIAL_BETA_ACCEPTED_RECEIPT_FAILED",
      notificationId:result.id,recipients:result.recipients},503,origin);
    const feedSaved=await rememberFestivalPush(feedId,heading,message,new Date().toISOString(),result.id,"beta");
    return reply({ok:true,alreadySent:false,notificationId:result.id,recipients:result.recipients,feedSaved},200,origin);
  }
  if(body.action==="schedule") {
    if(!Deno.env.get("ONESIGNAL_REST_API_KEY")) return reply({error:"PUSH_NOT_CONFIGURED"},503,origin);
    const outcomes=[];
    for(const event of scheduled) {
      if(Date.parse(event.at)<=Date.now()+60000) return reply({error:"EVENT_TOO_CLOSE_OR_PASSED",event:event.id},409,origin);
      const {data:existing,error:lookupError}=await db.from("loda_push_schedule").select("provider_notification_id").eq("event_id",event.id).maybeSingle();
      if(lookupError) return reply({error:"SCHEDULE_UNAVAILABLE"},503,origin);
      if(existing){
        const feedSaved=await rememberFestivalPush(event.id,event.heading,event.body,event.at,existing.provider_notification_id);
        outcomes.push({event:event.id,status:"already_scheduled",feedSaved});continue;
      }
      const result=await deliver({
        headings:event.heading,contents:event.body,send_after:event.at,ttl:3600,
        web_url:GUIDE.replace("#updates","#updates/"+event.id),
        filters:[{field:"tag",key:"loda_festival",relation:"=",value:"true"}],
        idempotency_key:await eventKey(event.id)
      });
      if("error" in result) return reply({error:result.error,providerCode:result.providerCode,providerStatus:result.providerStatus,completed:outcomes},result.status,origin);
      const {error:storeError}=await db.from("loda_push_schedule").insert({event_id:event.id,provider_notification_id:result.id,scheduled_for:event.at});
      if(storeError) return reply({error:"SCHEDULED_BUT_RECEIPT_FAILED",event:event.id,completed:outcomes},503,origin);
      const feedSaved=await rememberFestivalPush(event.id,event.heading,event.body,event.at,result.id);
      outcomes.push({event:event.id,status:"scheduled",notificationId:result.id,feedSaved});
    }
    return reply({ok:true,results:outcomes},200,origin);
  }
  return reply({error:"UNKNOWN_ACTION"},400,origin);
});
