import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://ola-hq.github.io";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const departments = ["Undeclared", "Low End Studies", "Dancefloor Physics", "Club Science", "Rave Ethics"];
const responseHeaders = (origin: string | null) => ({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "vary": "Origin",
  ...(origin === SITE ? {"access-control-allow-origin": SITE} : {}),
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info"
});
const reply = (value: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(value), { status, headers: responseHeaders(origin) });

async function ipDigest(address: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SERVICE_KEY),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("gdb-wall-v1:" + address));
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== SITE) return reply({error:"ORIGIN_NOT_ALLOWED"},403,origin);
  if (request.method === "OPTIONS")
    return new Response(null, { status:204, headers:responseHeaders(origin) });
  if (!SUPABASE_URL || !SERVICE_KEY)
    return reply({error:"BACKEND_NOT_READY"},503,origin);

  if (request.method === "GET") {
    const {data,error} = await db.from("gdb_midnight_checkins")
      .select("id,nickname,note,department,created_at")
      .eq("status","approved").order("created_at",{ascending:false}).limit(80);
    return error ? reply({error:"WALL_UNAVAILABLE"},503,origin) : reply({entries:data || []},200,origin);
  }
  if (request.method !== "POST") return reply({error:"METHOD_NOT_ALLOWED"},405,origin);
  if (origin !== SITE) return reply({error:"ORIGIN_REQUIRED"},403,origin);
  if (!(request.headers.get("content-type") || "").includes("application/json"))
    return reply({error:"JSON_REQUIRED"},415,origin);

  let payload: Record<string,unknown>;
  try {
    const body = await request.text();
    if (body.length > 2048) return reply({error:"TOO_LARGE"},413,origin);
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return reply({error:"INVALID_INPUT"},400,origin);
    payload = parsed;
  } catch { return reply({error:"INVALID_JSON"},400,origin); }
  if (payload.website) return reply({ok:true,pending:true},202,origin);
  const nickname = typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const department = typeof payload.department === "string" ? payload.department : "Undeclared";
  if (nickname.length < 2 || nickname.length > 32 || note.length > 180 ||
      !departments.includes(department) || /[\\u0000-\\u001f\\u007f]/.test(nickname + note))
    return reply({error:"INVALID_INPUT"},400,origin);

  const forwarded = request.headers.get("x-forwarded-for");
  const address = request.headers.get("cf-connecting-ip") ||
                  request.headers.get("x-real-ip") || forwarded?.split(",")[0]?.trim();
  if (!address) return reply({error:"ORIGIN_IP_UNAVAILABLE"},503,origin);
  try {
    const {error} = await db.rpc("gdb_midnight_submit",{
      p_nickname:nickname, p_note: note || null,
      p_department:department, p_ip_hash:await ipDigest(address)
    });
    if (error) {
      if (error.message.includes("COOLDOWN")) return reply({error:"COOLDOWN"},429,origin);
      if (error.message.includes("DAILY_LIMIT")) return reply({error:"DAILY_LIMIT"},429,origin);
      return reply({error:"COULD_NOT_SIGN"},503,origin);
    }
    return reply({ok:true,pending:true},202,origin);
  } catch {
    return reply({error:"COULD_NOT_SIGN"},503,origin);
  }
});
