import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, code, origin } = await req.json().catch(() => ({} as any));
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedCode = String(code || "").replace(/\D/g, "").slice(0, 6);

    if (!normalizedEmail || normalizedCode.length !== 6) {
      return json({ ok: false, error: "Enter the 6-digit code" }, 400);
    }

    const { data: rows, error: lookupErr } = await admin
      .from("email_login_otps")
      .select("id, code_hash, attempts, origin, expires_at")
      .eq("email", normalizedEmail)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (lookupErr) return json({ ok: false, error: lookupErr.message }, 500);
    const otp = rows?.[0];
    if (!otp) return json({ ok: false, error: "Code expired. Send a new code." }, 400);
    if (Number(otp.attempts || 0) >= 5) return json({ ok: false, error: "Too many attempts. Send a new code." }, 429);

    const expected = await sha256(`${normalizedEmail}:${normalizedCode}:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);
    if (expected !== otp.code_hash) {
      await admin.from("email_login_otps").update({ attempts: Number(otp.attempts || 0) + 1 }).eq("id", otp.id);
      return json({ ok: false, error: "Invalid code" }, 400);
    }

    await admin.from("email_login_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

    const safeOrigin = (() => {
      try { return new URL(origin || otp.origin || req.headers.get("origin") || "").origin; }
      catch { return Deno.env.get("SITE_URL") || ""; }
    })();

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: { redirectTo: `${safeOrigin}/dashboard` },
    });

    const actionLink = linkData?.properties?.action_link;
    if (linkErr || !actionLink) return json({ ok: false, error: linkErr?.message || "Could not create login session" }, 500);

    return json({ ok: true, actionLink });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
});