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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, origin, create_user } = await req.json().catch(() => ({} as any));
    if (!email || typeof email !== "string") return json({ ok: false, error: "email required" }, 400);

    const redirectTo = `${origin || ""}/dashboard`;

    // Check if user exists
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());

    // Auto-create new user (email-confirmed) so magiclink OTP works for sign-in
    if (!existing) {
      if (!create_user) return json({ ok: false, error: "No account found for this email" }, 404);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + "Aa1!",
      });
      if (createErr || !created?.user) {
        return json({ ok: false, error: createErr?.message || "Failed to create user" }, 500);
      }
      existing = created.user as any;
    }

    // Always use magiclink — produces a 6-digit OTP that verifies with type 'email'
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    const rawOtp = linkData?.properties?.email_otp || "";
    // Normalize to digits only and take first 6 (Supabase default is 6-digit)
    const otp = String(rawOtp).replace(/\D/g, "").slice(0, 6);
    if (!otp || otp.length < 6) {
      return json({ ok: false, error: linkErr?.message || "Failed to generate OTP" }, 500);
    }

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
