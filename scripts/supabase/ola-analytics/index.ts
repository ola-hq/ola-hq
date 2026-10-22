import { createClient } from 'npm:@supabase/supabase-js@2.95.3';

const SITE='https://ola-hq.github.io';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',secret,{auth:{persistSession:false,autoRefreshToken:false}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':SITE,'vary':'Origin','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,x-loda-moderator-token'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const safePath=(s:unknown)=>typeof s==='string'&&s.length<=300&&/^\/ola-hq\/[a-z0-9_./-]*(?:#[a-z0-9_./-]*)?$/i.test(s)&&!s.includes('..')?s:null;
const surface=(path:string)=>path.startsWith('/ola-hq/la-ola-de-amor/scan/guide/')?'loda_app':path.startsWith('/ola-hq/la-ola-de-amor/scan/app/')?'loda_app_entrance':path.startsWith('/ola-hq/la-ola-de-amor/')?'loda_site':path.startsWith('/ola-hq/app/')?'hq_app':'hq_site';

Deno.serve(async req=>{
 try {
  if(req.headers.get('origin')!==SITE)return reply({error:'ORIGIN_NOT_ALLOWED'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON_REQUIRED'},415);
  const raw=await req.text();if(raw.length>24000)return reply({error:'TOO_LARGE'},413);
  let body;try{body=JSON.parse(raw)}catch{return reply({error:'INVALID_JSON'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'INVALID_INPUT'},400);
  if(body.action==='report'){
   const token=req.headers.get('x-loda-moderator-token')||'';
   if(!/^[a-f0-9]{64}$/i.test(token))return reply({error:'NOT_AUTHORIZED'},401);
   const hash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
   const {data:owner,error:authError}=await db.from('loda_guest_moderator_keys').select('id').eq('token_hash',hash).eq('is_active',true).maybeSingle();
   if(authError||!owner)return reply({error:'NOT_AUTHORIZED'},401);
   const {data,error}=await db.rpc('ola_analytics_report',{report_days:[1,7,30,90].includes(body.days)?body.days:30,report_scope:['all','loda','hq'].includes(body.scope)?body.scope:'all'});
   return error?reply({error:'REPORT_UNAVAILABLE'},503):reply(data);
  }
  if(body.action!=='collect'||!Array.isArray(body.events)||body.events.length<1||body.events.length>20)return reply({error:'INVALID_INPUT'},400);
  // Discard known bots, automated previews and search crawlers. Never store the user agent.
  if(/bot|crawler|spider|headless|preview|facebookexternalhit/i.test(req.headers.get('user-agent')||''))return reply({ok:true,ignored:true});
  const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sourceHash=hex(await crypto.subtle.sign('HMAC',material,new TextEncoder().encode('analytics:'+new Date().toISOString().slice(0,10)+':'+ip)));
  const rows=[];
  for(const e of body.events){
   if(!e||!uuid.test(e.id)||!uuid.test(e.visitor_id)||!uuid.test(e.session_id))return reply({error:'INVALID_EVENT'},400);
   const path=safePath(e.path);
   if(!path||!['page_view','click','app_install'].includes(e.event_name)||!['browser','standalone'].includes(e.mode))return reply({error:'INVALID_EVENT'},400);
   if(path.startsWith('/ola-hq/analytics'))return reply({error:'INVALID_EVENT'},400);
   const target=typeof e.target==='string'?e.target:'';
   if(target.length>350||target&&!(safePath(target)||/^(?:https:\/\/[a-z0-9.-]+\/[a-z0-9_./-]*|button:[a-z0-9_./:-]{1,100}|external)$/i.test(target)))return reply({error:'INVALID_TARGET'},400);
   const label=typeof e.label==='string'&&/^[a-z0-9_./:# -]{0,100}$/i.test(e.label)?e.label:'';
   const referrer=typeof e.referrer_host==='string'&&/^[a-z0-9.-]{0,150}$/i.test(e.referrer_host)?e.referrer_host:'';
   const language=typeof e.language==='string'&&/^[a-z-]{0,12}$/i.test(e.language)?e.language:'';
   const stamp=Date.parse(e.occurred_at),now=Date.now();
   rows.push({id:e.id,visitor_id:e.visitor_id,session_id:e.session_id,event_name:e.event_name,path,surface:surface(path),mode:e.mode,target,label,referrer_host:referrer,language,source_hash:sourceHash,is_test:e.is_test===true,occurred_at:new Date(Number.isFinite(stamp)&&stamp>now-7*86400000&&stamp<now+60000?stamp:now).toISOString()});
  }
  const {count,error:rateError}=await db.from('ola_analytics_events').select('id',{count:'exact',head:true}).eq('source_hash',sourceHash).gte('received_at',new Date(Date.now()-3600000).toISOString());
  if(rateError)return reply({error:'COLLECTOR_UNAVAILABLE'},503);
  if((count||0)>5000)return reply({error:'RATE_LIMIT'},429);
  const {error}=await db.from('ola_analytics_events').upsert(rows,{onConflict:'id',ignoreDuplicates:true});
  return error?reply({error:'COLLECTOR_UNAVAILABLE'},503):reply({ok:true});
 }catch{return reply({error:'UNAVAILABLE'},503)}
});
