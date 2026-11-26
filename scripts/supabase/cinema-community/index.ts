import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
const SITE='https://ola-hq.github.io';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',secret,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':SITE,'vary':'Origin','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const filmIDs=new Set(["club-focker-in-law", "club-how-to-rob-a-bank", "cinema2025-51", "cinema2025-52", "cinema2025-53", "cinema2025-54", "cinema2025-55", "cinema2025-56", "cinema2025-57", "cinema2025-58", "cinema2025-59", "cinema2025-68", "cinema2025-69", "cinema2025-70", "cinema2025-71", "cinema2025-72", "cinema2025-73", "cinema2025-74", "cinema2025-75", "cinema2025-76", "cinema2025-77", "cinema2025-86", "cinema2025-87", "cinema2025-88", "cinema2025-89", "cinema2025-90", "cinema2025-91", "cinema2025-92", "cinema2025-110", "cinema2025-111", "cinema2025-112", "cinema2025-113", "cinema2025-114", "cinema2025-115", "cinema2025-116", "cinema2025-117", "cinema2025-126", "cinema2025-127", "cinema2025-128", "cinema2025-129", "cinema2025-130", "cinema2025-131", "cinema2025-132", "cinema2025-133", "cinema2025-134", "cinema2025-135", "cinema2025-144", "cinema2025-145", "cinema2025-146", "cinema2025-147", "cinema2025-165", "cinema2025-166", "cinema2025-167", "cinema2025-168", "cinema2025-169", "cinema2025-170", "cinema2025-171", "cinema2025-172", "cinema2025-173", "cinema2025-174", "cinema2025-175", "cinema2025-176", "cinema2025-177", "cinema2025-178", "cinema2025-179", "cinema2025-180", "cinema2025-181", "cinema2025-190", "cinema2025-191", "cinema2025-192", "cinema2025-193", "cinema2025-202", "cinema2025-203", "cinema2025-204", "cinema2025-205", "cinema2025-206", "cinema2025-207", "cinema2025-208", "cinema2025-209", "cinema2025-210", "cinema2025-211", "cinema2025-212", "cinema2025-213", "cinema2025-214", "cinema2025-232", "cinema2025-233", "cinema2025-234", "cinema2025-235", "cinema2025-236", "cinema2025-237", "cinema2025-238", "cinema2025-239", "cinema2025-240", "cinema2025-241", "cinema2025-242", "cinema2025-243", "cinema2025-244", "cinema2025-253", "cinema2025-254", "cinema2025-255", "cinema2025-256", "cinema2025-257", "cinema2025-258", "cinema2025-259", "cinema2025-260", "cinema2025-261", "cinema2025-262", "cinema2025-263", "cinema2025-264", "cinema2025-265", "cinema2025-266", "cinema2025-267", "cinema2025-268", "cinema2025-269", "cinema2025-270", "cinema2025-271", "cinema2025-272", "cinema2025-273", "cinema2025-274", "cinema2025-275", "cinema2025-276", "cinema2025-277", "cinema2025-278", "cinema2025-279", "cinema2025-280", "cinema2025-281", "cinema2025-282", "cinema2025-283", "cinema2025-284", "cinema2025-285", "cinema2025-286", "cinema2025-287", "cinema2025-288", "cinema2025-289", "cinema2025-290", "cinema2025-291", "cinema2025-292", "cinema2025-293", "cinema2025-294", "cinema2025-295", "cinema2025-296", "cinema2025-297", "cinema2025-298", "cinema2025-299", "cinema2025-300", "cinema2025-301", "cinema2025-302", "cinema2025-303", "cinema2026-14", "cinema2026-15", "cinema2026-16", "cinema2026-17", "cinema2026-18", "cinema2026-19", "cinema2026-20", "cinema2026-21", "cinema2026-22", "cinema2026-23", "cinema2026-24", "cinema2026-25", "cinema2026-26", "cinema2026-27", "cinema2026-28", "cinema2026-29", "cinema2026-30", "cinema2026-31", "cinema2026-33", "cinema2026-34", "cinema2026-35", "cinema2026-36", "cinema2026-37", "cinema2026-38", "cinema2026-39", "cinema2026-40", "cinema2026-41", "cinema2026-42", "cinema2026-43", "cinema2026-44", "cinema2026-45", "cinema2026-46", "cinema2026-47", "cinema2026-48", "cinema2026-49", "cinema2026-50", "cinema2026-51", "cinema2026-52", "cinema2026-53", "cinema2026-54", "cinema2026-55", "cinema2026-56", "cinema2026-57", "cinema2026-58", "club-michael", "club-busboys", "club-mother-mary", "club-billie-eilish-hit-me-hard-and-soft-the-tour-live-in-3d", "club-the-devil-wears-prada-2", "club-erupcja", "club-the-sheep-detectives", "club-obsession", "club-i-love-boosters", "club-passenger", "club-jackass-best-and-last", "club-couture", "club-minions-monsters", "club-maddies-secret", "club-disclosure-day", "club-the-invite", "club-her-private-hell", "club-spider-man-brand-new-day", "club-nimrods", "club-the-end-of-oak-street", "club-the-wrong-girls", "club-idiots", "club-coyote-vs-acme", "club-by-any-means", "club-finding-emily", "club-onslaught", "club-runner", "club-practical-magic-2", "club-hope", "club-verity", "club-primetime", "club-resident-evil", "club-heart-of-the-beast", "club-street-fighter", "club-you-can-see-everything", "club-forgotten-island", "club-the-only-living-pickpocket-in-new-york", "club-godzilla-minus-zero", "club-wild-horse-nine", "club-wicker", "club-ebenezer", "club-victorian-psycho", "club-club-kid", "club-the-hunger-games-sunrise-on-the-reaping"]);
const allowed=['the-feast','the-inheritance'];
async function hash(s:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{try{
 if(req.headers.get('origin')!==SITE)return reply({error:'ORIGIN_NOT_ALLOWED'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON_REQUIRED'},415);
 const raw=await req.text();if(raw.length>8000)return reply({error:'TOO_LARGE'},413);
 let body;try{body=JSON.parse(raw)}catch{return reply({error:'INVALID_JSON'},400)}
 if(typeof body?.action==='string'&&body.action.startsWith('film_')){
  if(!filmIDs.has(body.film)||!['film_summary','film_react','film_review','film_remove_review'].includes(body.action))return reply({error:'INVALID_INPUT'},400);
  if(body.voter!==undefined&&!uuid.test(body.voter))return reply({error:'INVALID_VOTER'},400);
  const voter=body.voter?await hash('cinema-feedback-v1:'+body.film+':'+body.voter):null;
  if(body.action==='film_summary'){
   if(body.offset!==undefined&&(!Number.isInteger(body.offset)||body.offset<0||body.offset>10000))return reply({error:'INVALID_OFFSET'},400);
   const {data,error}=await db.rpc('cinema_film_summary',{p_film:body.film,p_voter:voter,p_offset:body.offset||0});return error?reply({error:'UNAVAILABLE'},503):reply(data);
  }
  if(!voter||body.website||/bot|crawler|spider|headless|preview/i.test(req.headers.get('user-agent')||''))return reply({error:'INVALID_RESPONSE'},400);
  if(body.action==='film_react'&&![null,-1,1].includes(body.reaction))return reply({error:'INVALID_REACTION'},400);
  if(body.action==='film_review'&&(typeof body.review!=='string'||body.review.trim().length<10||body.review.trim().length>1600||typeof body.name!=='string'||body.name.length>40))return reply({error:'INVALID_REVIEW'},400);
  const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
  const source=await hash('cinema-feedback-source:'+new Date().toISOString().slice(0,10)+':'+ip);
  const {data,error}=await db.rpc('cinema_film_respond',{p_film:body.film,p_voter:voter,p_source:source,p_action:body.action.slice(5),p_reaction:body.action==='film_react'?body.reaction:null,p_name:body.action==='film_review'?body.name.trim():'',p_review:body.action==='film_review'?body.review.trim():null});
  if(error){const limited=/RATE_LIMIT|SLOW_DOWN/.test(error.message||'');return reply({error:limited?'TRY_LATER':'UNAVAILABLE'},limited?429:503)}return reply(data);
 }
 if(!body||!allowed.includes(body.concept)||!['summary','vote'].includes(body.action))return reply({error:'INVALID_INPUT'},400);
 if(body.action==='summary'){
  const [all,positive]=await Promise.all([db.from('cinema_concept_votes').select('*',{count:'exact',head:true}).eq('concept_id',body.concept),db.from('cinema_concept_votes').select('*',{count:'exact',head:true}).eq('concept_id',body.concept).eq('would_watch',true)]);if(all.error||positive.error)return reply({error:'UNAVAILABLE'},503);
  const yes=positive.count||0,total=all.count||0;
  return reply({concept:body.concept,yes,no:total-yes,total});
 }
 if(!uuid.test(body.voter)||typeof body.choice!=='boolean')return reply({error:'INVALID_VOTE'},400);
 if(/bot|crawler|spider|headless|preview/i.test(req.headers.get('user-agent')||''))return reply({error:'AUTOMATED_VOTE'},403);
 const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
 const voter=await hash('cinema-voter-v1:'+body.concept+':'+body.voter),source=await hash('cinema-source:'+new Date().toISOString().slice(0,10)+':'+ip);
 const {data,error}=await db.rpc('cinema_concept_vote',{p_concept:body.concept,p_voter:voter,p_choice:body.choice,p_source:source});
 if(error){const limited=/RATE_LIMIT|SLOW_DOWN/.test(error.message||'');return reply({error:limited?'TRY_LATER':'UNAVAILABLE'},limited?429:503)}
 return reply({concept:body.concept,...data,choice:body.choice});
 }catch{return reply({error:'UNAVAILABLE'},503)}});

