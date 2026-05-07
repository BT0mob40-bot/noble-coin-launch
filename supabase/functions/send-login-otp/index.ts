import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { email, origin, create_user } = await req.json().catch(() => ({} as any));
    if (!email || typeof email !== "string") {
      return json({ ok: false, error: "email required" }, 400);
    }
    const redirectTo = `${origin || ""}/dashboard`;

    // 1) Check if user exists
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u: any) =>
      (u.email || "").toLowerCase() === email.toLowerCase()
    );

    // 2) Generate OTP via Supabase admin (magiclink for existing, signup for new)
    let linkData: any = null, linkErr: any = null;
    if (existing) {
      const r = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      linkData = r.data; linkErr = r.error;
    } else {
      if (!create_user) {
        return json({ ok: false, error: "No account found for this email" }, 404);
      }
      // Create the user inline (passwordless) and get OTP
      const tempPwd = crypto.randomUUID() + "Aa1!";
      const r = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password: tempPwd,
        options: { redirectTo },
      });
      linkData = r.data; linkErr = r.error;
    }

    const otp = linkData?.properties?.email_otp;
    if (!otp) {
      return json({ ok: false, error: linkErr?.message || "Failed to generate OTP" }, 500);
    }

    // 3) Send the 6-digit code via our SMTP function (reuses 2fa template)
    const { data: smtpRes, error: smtpErr } = await admin.functions.invoke("smtp-email", {
      body: { type: "2fa_code", email, code: otp, origin },
    });
    if (smtpErr || (smtpRes as any)?.ok === false) {
      return json({
        ok: false,
        error: (smtpRes as any)?.error || smtpErr?.message || "Failed to send OTP email",
      }, 500);
    }

    return json({ ok: true, sent: true });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
});
