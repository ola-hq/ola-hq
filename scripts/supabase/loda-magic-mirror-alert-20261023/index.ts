// This one-time photo-notification sender is retired after its verified send.
// Keep gateway JWT validation enabled. No credentials, database or provider access.
Deno.serve(()=>new Response(JSON.stringify({error:"ONE_TIME_PUSH_RETIRED"}),{status:410,headers:{"content-type":"application/json","cache-control":"no-store"}}));
