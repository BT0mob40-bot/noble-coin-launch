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

function sixDigitCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, origin, create_user } = await req.json().catch(() => ({} as any));
    if (!email || typeof email !== "string") return json({ ok: false, error: "email required" }, 400);

    let createdUserId: string | null = null;
    if (create_user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + "Aa1!",
      });
      if (created?.user?.id) createdUserId = created.user.id;
      if (createErr && !/already|registered|exists/i.test(createErr.message || "")) {
        return json({ ok: false, error: createErr.message || "Failed to prepare OTP login" }, 500);
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = sixDigitCode();
    const codeHash = await sha256(`${normalizedEmail}:${otp}:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);
    const tokenHash = await sha256(`${crypto.randomUUID()}:${normalizedEmail}`);

    await admin.from("email_login_otps").insert({
      email: normalizedEmail,
      user_id: createdUserId,
      code_hash: codeHash,
      token_hash: tokenHash,
      origin: origin || req.headers.get("origin") || null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const { data: smtpRes, error: smtpErr } = await admin.functions.invoke("smtp-email", {
      body: { type: "2fa_code", email, code: otp, origin },
    });
    if (smtpErr || (smtpRes as any)?.ok === false) {
      return json({ ok: false, error: (smtpRes as any)?.error || smtpErr?.message || "Failed to send OTP email" }, 500);
    }

    return json({ ok: true, sent: true });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
});
