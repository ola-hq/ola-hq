// Guests submit through this fixed survey endpoint; response rows are never public.
const ORIGIN='https://ola-hq.github.io';
const TEXT_FIELDS={moment:3000,connection:3000,difficulties:3000,keep_change:3000,missed_details:3000,worth_trip:3000,guest_name:120,contact:320};
const CORS={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
function reply(value,status=200){return new Response(JSON.stringify(value),{status,headers:{...CORS,'Content-Type':'application/json'}});}
async function bucket(ip){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')), {name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('one-more-wave:'+new Date().toISOString().slice(0,10)+':'+ip)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async request=>{
 if(request.headers.get('origin')&&request.headers.get('origin')!==ORIGIN)return reply({error:'ORIGIN_NOT_ALLOWED'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON_REQUIRED'},415);
 let input;try{if(Number(request.headers.get('content-length'))>90000)return reply({error:'TOO_LONG'},413);const bytes=await request.arrayBuffer();if(bytes.byteLength>90000)return reply({error:'TOO_LONG'},413);input=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'INVALID_JSON'},400);}
 if(!input||Array.isArray(input)||typeof input!=='object')return reply({error:'INVALID_INPUT'},400);
 const allowed=new Set(['id','language',...Object.keys(TEXT_FIELDS),'future_interest','follow_memories','follow_gatherings','website','elapsed']);
 if(Object.keys(input).some(k=>!allowed.has(k)))return reply({error:'INVALID_INPUT'},400);
 if(typeof input.website!=='string'||input.website)return reply({error:'INVALID_INPUT'},400);
 if(typeof input.elapsed!=='number'||!Number.isFinite(input.elapsed)||input.elapsed<2000)return reply({error:'PLEASE_TAKE_A_MOMENT'},400);
 if(typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)||!['en','es'].includes(input.language))return reply({error:'INVALID_INPUT'},400);
 const record={id:input.id,language:input.language};
 for(const [field,max] of Object.entries(TEXT_FIELDS)){if(typeof input[field]!=='string'||input[field].length>max)return reply({error:'INVALID_INPUT'},400);record[field]=input[field].trim();}
 if(!['','interested','maybe','from_home'].includes(input.future_interest)||typeof input.follow_memories!=='boolean'||typeof input.follow_gatherings!=='boolean')return reply({error:'INVALID_INPUT'},400);
 Object.assign(record,{future_interest:input.future_interest,follow_memories:input.follow_memories,follow_gatherings:input.follow_gatherings});
 if(!['moment','connection','difficulties','keep_change','missed_details','worth_trip'].some(k=>record[k])&&!record.future_interest)return reply({error:'ADD_ONE_ANSWER'},400);
 if(record.contact&&!record.follow_memories&&!record.follow_gatherings)return reply({error:'CONTACT_PERMISSION_REQUIRED'},400);
 try{
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!secret)throw Error('not configured');
  const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  record.ip_bucket=await bucket(ip);
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/loda_save_one_more_wave',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({p_record:record}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('save failed');
  const result=await response.json();
  if(result==='rate_limited')return reply({error:'PLEASE_TRY_LATER'},429);
  if(result!=='saved')throw Error('unexpected receipt');
  return reply({ok:true});
 }catch{return reply({error:'NOT_SAVED_TRY_AGAIN'},503);}
});
