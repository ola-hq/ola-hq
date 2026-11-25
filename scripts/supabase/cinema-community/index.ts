import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
const SITE='https://ola-hq.github.io';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',secret,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':SITE,'vary':'Origin','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const allowed=['the-feast','the-inheritance'];
async function hash(s:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{try{
 if(req.headers.get('origin')!==SITE)return reply({error:'ORIGIN_NOT_ALLOWED'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON_REQUIRED'},415);
 const raw=await req.text();if(raw.length>1500)return reply({error:'TOO_LARGE'},413);
 let body;try{body=JSON.parse(raw)}catch{return reply({error:'INVALID_JSON'},400)}
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

