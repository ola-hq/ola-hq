/* Only tags, mileage and motion time are public. Ownership secrets never leave server storage as plaintext. */
export function makeHandler({rpc,list,hash}){
 const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://ola-hq.github.io','vary':'Origin','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 return async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'METHOD'},405);
 if(req.headers.get('origin')&&req.headers.get('origin')!=='https://ola-hq.github.io')return reply({error:'ORIGIN'},403);
 try{const raw=await req.text();if(raw.length>2048)return reply({error:'SIZE'},413);let b;try{b=JSON.parse(raw)}catch{return reply({error:'INPUT'},400)}if(!b||typeof b!=='object')return reply({error:'INPUT'},400);
 if(b.action==='board'){if(b.pilot&&!/^[a-f0-9-]{36}$/i.test(b.pilot))return reply({error:'PILOT'},400);return reply(await list(b.pilot||null))}
 if(!['save','remove'].includes(b.action)||!/^[a-f0-9]{64}$/.test(b.token||''))return reply({error:'INPUT'},400);
 if(b.action==='save'&&(b.consent!==true||!/^[A-Z0-9]{3,5}$/.test(b.tag||'')||/^(FUCK|SHIT|CUNT|NAZI|NIGGA|NIGER)$/.test(b.tag)||!Number.isSafeInteger(b.miles)||b.miles<0||b.miles>1e15||!Number.isSafeInteger(b.seconds)||b.seconds<0||b.seconds>1e9))return reply({error:'INPUT'},400);
 const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();const owner=await hash('hq-orbit-owner:'+b.token),source=await hash('hq-orbit-source:'+new Date().toISOString().slice(0,10)+':'+ip);
 const result=await rpc({p_owner:owner,p_source:source,p_tag:b.tag||'OLA',p_miles:b.miles||0,p_seconds:b.seconds||0,p_remove:b.action==='remove'});return reply(result);
 }catch(e){return reply({error:String(e.message).includes('SLOW_DOWN')?'SLOW_DOWN':'UNAVAILABLE'},String(e.message).includes('SLOW_DOWN')?429:503)}};
}
if(typeof Deno!=='undefined'){
 const base=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 async function db(path,body){const r=await fetch(base+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:secret,authorization:'Bearer '+secret,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.message||'DATABASE');return data}
 const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 Deno.serve(makeHandler({hash,rpc:body=>db('rpc/hq_orbit_save',body),async list(id){const rows=await db('hq_orbit_pilots?select=id,tag,miles,seconds&order=miles.desc,id.asc&limit=25');const pilot=id?(await db('hq_orbit_pilots?select=id,tag,miles,seconds&id=eq.'+encodeURIComponent(id)+'&limit=1'))[0]||null:null;return {rows,pilot}}}));
}
