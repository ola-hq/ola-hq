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
   if(error)return reply({error:'REPORT_UNAVAILABLE'},503);
   const cutoff=new Date(Date.now()-([1,7,30,90].includes(body.days)?body.days:30)*86400000).toISOString();
   const worldPaths={"wedding":"/ola-hq/la-ola-de-amor/","blockbuster":"/ola-hq/blockbuster-wave/","cinema":"/ola-hq/la-ola-cinema-club/","polaroid":"/ola-hq/our-polaroid-project/","wave26":"/ola-hq/wave-26","fpl":"/ola-hq/fpl-wave","simulation":"/ola-hq/simulation-wave/","gdb":"/ola-hq/gdb-wave","arsenal":"/ola-hq/arsenal-wave","offbrand":"/ola-hq/offbrand-wave","willpwr":"/ola-hq/willpwr-wave","wuwei":"/ola-hq/wu-wei-wave","capybara":"/ola-hq/capybara-wave","aios":"/ola-hq/ai/","tools":"/ola-hq/tools","archive":"/ola-hq/archive"};
   const scope=['all','loda','hq','hq_site','hq_app','loda_site','loda_app','loda_app_entrance',...Object.keys(worldPaths)].includes(body.scope)?body.scope:'all';
   let q=db.from('ola_analytics_events').select('event_name,label,device_type,os_family,browser_family,screen_bucket,country_code,region_name,city_name,campaign_source,campaign_medium,campaign_name,duration_seconds,metric_value,path,target,visitor_id,session_id,surface,mode,referrer_host,occurred_at').gte('occurred_at',cutoff).eq('is_test',false).order('occurred_at',{ascending:false}).limit(10000);
   if(scope==='loda')q=q.like('surface','loda%');if(scope==='hq')q=q.like('surface','hq%');if(['hq_site','hq_app','loda_site','loda_app','loda_app_entrance'].includes(scope))q=q.eq('surface',scope);
   if(worldPaths[scope as keyof typeof worldPaths])q=q.like('path',worldPaths[scope as keyof typeof worldPaths]+'%');
   const {data:detail,error:detailError}=await q;
   if(detailError)return reply({error:'REPORT_UNAVAILABLE'},503);
   const count=(key:string,filter:(x:any)=>boolean=()=>true)=>Object.entries((detail||[]).filter(filter).reduce((a:any,e:any)=>{const k=String(e[key]||'unknown');a[k]=(a[k]||0)+1;return a},{})).sort((a:any,b:any)=>b[1]-a[1]).slice(0,30);
   const distinct=(key:string)=>{const m=new Map<string,Set<string>>();for(const e of detail||[]){const k=String(e[key]||'unknown');if(!m.has(k))m.set(k,new Set());m.get(k)!.add(e.visitor_id)}return [...m].map(([k,s])=>[k,s.size]).sort((a:any,b:any)=>b[1]-a[1]).slice(0,30)};
   const filtered=detail||[];
   const unique=(xs:any[],key:string)=>new Set(xs.map(x=>x[key])).size;
   const groups=(xs:any[],key:string,type:string,sortKey:string)=>{const m=new Map<string,any[]>();for(const x of xs){const v=String(x[key]||'');if(!m.has(v))m.set(v,[]);m.get(v)!.push(x)}return [...m].map(([k,items])=>type==='pages'?{path:k,views:items.length,visitors:unique(items,'visitor_id')}:type==='clicks'?{target:k,path:items[0]?.path||'',clicks:items.length}:type==='sources'?{referrer_host:k,visitors:unique(items,'visitor_id')}:type==='surfaces'?{surface:k,visitors:unique(items,'visitor_id'),views:items.length}:{day:k,visitors:unique(items,'visitor_id'),views:items.filter(x=>x.event_name==='page_view').length,clicks:items.filter(x=>x.event_name==='click').length}).sort((a:any,b:any)=>b[sortKey]-a[sortKey]).slice(0,50)};
   const pageRows=filtered.filter((x:any)=>x.event_name==='page_view');
   const clickRows=filtered.filter((x:any)=>x.event_name==='click');
   const scoped=['hq_site','hq_app','loda_site','loda_app','loda_app_entrance',...Object.keys(worldPaths)].includes(scope);
   const summary=scoped?{visitors:unique(filtered,'visitor_id'),visits:unique(filtered,'session_id'),page_views:pageRows.length,clicks:clickRows.length,app_visitors:scope==='hq_app'||scope.startsWith('loda_app')?unique(filtered,'visitor_id'):0,installed_app_visits:unique(filtered.filter((x:any)=>x.mode==='standalone'),'session_id'),observed_installs:filtered.filter((x:any)=>x.event_name==='app_install').length}:data.summary;
   const report=scoped?{summary,pages:groups(pageRows,'path','pages','views'),clicks:groups(clickRows,'target','clicks','clicks'),sources:groups(filtered.filter((x:any)=>x.referrer_host),'referrer_host','sources','visitors'),surfaces:groups(pageRows,'surface','surfaces','views'),days:[],tracking_started:filtered.length?filtered[filtered.length-1].occurred_at:null}:data;
   const worldTotals=Object.entries(worldPaths).map(([id,prefix])=>{const relevant=filtered.filter((x:any)=>String(x.path||'').startsWith(prefix));return {id,events:relevant.length,visitors:unique(relevant,'visitor_id'),sessions:unique(relevant,'session_id'),views:relevant.filter((x:any)=>x.event_name==='page_view').length,clicks:relevant.filter((x:any)=>x.event_name==='click').length}});
   return reply({...report,worlds:worldTotals,extended:{devices:distinct('device_type'),operating_systems:distinct('os_family'),browsers:distinct('browser_family'),locations:distinct('country_code'),campaigns:distinct('campaign_source'),activity:count('event_name'),cinema_actions:count('label',(x:any)=>String(x.path).startsWith('/ola-hq/la-ola-cinema-club/')&&String(x.label).startsWith('cinema:')),files:count('target',(x:any)=>x.event_name==='file_open'||x.event_name==='file_download'),active_seconds:(detail||[]).filter((x:any)=>x.event_name==='engagement').reduce((n:number,x:any)=>n+(x.duration_seconds||0),0),sampled:detail?.length===10000}});
  }
  if(body.action!=='collect'||!Array.isArray(body.events)||body.events.length<1||body.events.length>20)return reply({error:'INVALID_INPUT'},400);
  // Discard known bots, automated previews and search crawlers. Never store the user agent.
  if(/bot|crawler|spider|headless|preview|facebookexternalhit/i.test(req.headers.get('user-agent')||''))return reply({ok:true,ignored:true});
  const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sourceHash=hex(await crypto.subtle.sign('HMAC',material,new TextEncoder().encode('analytics:'+new Date().toISOString().slice(0,10)+':'+ip)));
  const geo=(name:string,max:number)=>{const s=req.headers.get(name)||'';return /^[a-z .'-]{0,80}$/i.test(s)?s.slice(0,max):''};
  const country=geo('cf-ipcountry',2),region=geo('cf-region',60),city=geo('cf-ipcity',60);
  const allowed=(v:unknown,values:string[])=>typeof v==='string'&&values.includes(v)?v:'';
  const tidy=(v:unknown,n:number)=>typeof v==='string'&&/^[a-z0-9_ .-]*$/i.test(v)?v.slice(0,n):'';
  const rows=[];
  for(const e of body.events){
   if(!e||!uuid.test(e.id)||!uuid.test(e.visitor_id)||!uuid.test(e.session_id))return reply({error:'INVALID_EVENT'},400);
   const path=safePath(e.path);
   if(!path||!['page_view','click','app_install','engagement','file_open','file_download','media_play','media_progress','media_complete','scroll_depth','js_error'].includes(e.event_name)||!['browser','standalone'].includes(e.mode))return reply({error:'INVALID_EVENT'},400);
   if(path.startsWith('/ola-hq/analytics'))return reply({error:'INVALID_EVENT'},400);
   const target=typeof e.target==='string'?e.target:'';
   if(target.length>350||target&&!(safePath(target)||/^(?:https:\/\/[a-z0-9.-]+\/[a-z0-9_./-]*|button:[a-z0-9_./:-]{1,100}|external)$/i.test(target)))return reply({error:'INVALID_TARGET'},400);
   const label=typeof e.label==='string'&&/^[a-z0-9_./:# -]{0,100}$/i.test(e.label)?e.label:'';
   const referrer=typeof e.referrer_host==='string'&&/^[a-z0-9.-]{0,150}$/i.test(e.referrer_host)?e.referrer_host:'';
   const language=typeof e.language==='string'&&/^[a-z-]{0,12}$/i.test(e.language)?e.language:'';
   const stamp=Date.parse(e.occurred_at),now=Date.now();
   rows.push({id:e.id,visitor_id:e.visitor_id,session_id:e.session_id,event_name:e.event_name,path,surface:surface(path),mode:e.mode,target,label,referrer_host:referrer,language,source_hash:sourceHash,is_test:e.is_test===true,
   device_type:allowed(e.device_type,['desktop','mobile','tablet','unknown']),os_family:allowed(e.os_family,['iOS','Android','Windows','macOS','Linux','other']),
   browser_family:allowed(e.browser_family,['Chrome','Safari','Firefox','Edge','Samsung Internet','other']),
   screen_bucket:allowed(e.screen_bucket,['small','medium','large','xlarge']),
   country_code:country,region_name:region,city_name:city,
   campaign_source:tidy(e.campaign_source,60),campaign_medium:tidy(e.campaign_medium,60),campaign_name:tidy(e.campaign_name,80),
   duration_seconds:Number.isInteger(e.duration_seconds)&&e.duration_seconds>=0&&e.duration_seconds<=3600?e.duration_seconds:null,
   metric_value:Number.isInteger(e.metric_value)&&e.metric_value>=0&&e.metric_value<=100000?e.metric_value:null,occurred_at:new Date(Number.isFinite(stamp)&&stamp>now-7*86400000&&stamp<now+60000?stamp:now).toISOString()});
  }
  const {count,error:rateError}=await db.from('ola_analytics_events').select('id',{count:'exact',head:true}).eq('source_hash',sourceHash).gte('received_at',new Date(Date.now()-3600000).toISOString());
  if(rateError)return reply({error:'COLLECTOR_UNAVAILABLE'},503);
  if((count||0)>5000)return reply({error:'RATE_LIMIT'},429);
  const {error}=await db.from('ola_analytics_events').upsert(rows,{onConflict:'id',ignoreDuplicates:true});
  return error?reply({error:'COLLECTOR_UNAVAILABLE'},503):reply({ok:true});
 }catch{return reply({error:'UNAVAILABLE'},503)}
});
