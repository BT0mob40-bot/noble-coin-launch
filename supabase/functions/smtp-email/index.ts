import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────── Templates ───────────────────────────
const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;

function shell(title: string, accent: string, bodyHtml: string, siteName: string, domain: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;${baseStyle}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;"><tr><td align="center">
<table width="100%" style="max-width:540px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:${accent};padding:32px 30px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">${siteName}</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">${title}</p>
  </td></tr>
  <tr><td style="padding:30px;">${bodyHtml}</td></tr>
  <tr><td style="background:#f9fafb;padding:18px 30px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${siteName} · ${domain}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function tplPasswordReset(siteName: string, link: string, domain: string) {
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hello,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click below to set a new one:</p>
    <table width="100%"><tr><td align="center" style="padding:8px 0 24px;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">Reset My Password</a>
    </td></tr></table>
    <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    <p style="color:#9ca3af;font-size:11px;word-break:break-all;">Or copy: <a href="${link}" style="color:#6366f1;">${link}</a></p>`;
  return shell("Password Reset", "linear-gradient(135deg,#6366f1,#8b5cf6)", body, siteName, domain);
}

function tpl2FACode(siteName: string, code: string, domain: string) {
  const body = `
    <p style="color:#374151;font-size:15px;text-align:center;margin:0 0 20px;">Your verification code is:</p>
    <div style="background:#f0fdf4;border:2px solid #10b981;border-radius:12px;padding:20px;margin:0 auto 24px;max-width:260px;text-align:center;">
      <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#059669;font-family:monospace;">${code}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">This code expires in <strong>10 minutes</strong>.</p>`;
  return shell("Two-Factor Authentication", "linear-gradient(135deg,#10b981,#059669)", body, siteName, domain);
}

function tplWelcome(siteName: string, userName: string, domain: string) {
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${userName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Welcome to <strong>${siteName}</strong>! Your account is ready.</p>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0;">If this is a test email, your SMTP configuration is working perfectly. ✅</p>`;
  return shell("Welcome", "linear-gradient(135deg,#3b82f6,#6366f1)", body, siteName, domain);
}

function tplDeposit(siteName: string, amount: string, domain: string) {
  const body = `
    <p style="color:#374151;font-size:15px;margin:0 0 16px;">Your deposit was successful!</p>
    <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:0 0 20px;">
      <p style="color:#059669;font-size:24px;font-weight:800;margin:0;">+ KES ${amount}</p>
      <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">credited to your wallet</p>
    </div>`;
  return shell("Deposit Confirmed", "linear-gradient(135deg,#10b981,#059669)", body, siteName, domain);
}

function tplGeneric(siteName: string, subject: string, message: string, domain: string) {
  const body = `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${message.replace(/\n/g, "<br/>")}</p>`;
  return shell(subject, "linear-gradient(135deg,#6366f1,#8b5cf6)", body, siteName, domain);
}

// ─────────────────────────── SMTP via nodemailer (robust) ───────────────────────────
async function sendViaSmtp(
  cfg: any,
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string; strategy?: string }> {
  const port = Number(cfg.port) || 587;
  const enc = (cfg.encryption || "tls").toLowerCase();
  const host = cfg.host;

  // Build strategies; nodemailer tolerates relaxed TLS (cPanel self-signed certs)
  const strategies: Array<{ name: string; secure: boolean; requireTLS: boolean; ignoreTLS: boolean }> = [];
  if (enc === "ssl" || port === 465) {
    strategies.push({ name: "implicit-tls(465)", secure: true, requireTLS: false, ignoreTLS: false });
    strategies.push({ name: "starttls", secure: false, requireTLS: true, ignoreTLS: false });
  } else if (enc === "none") {
    strategies.push({ name: "plain", secure: false, requireTLS: false, ignoreTLS: true });
  } else {
    strategies.push({ name: "starttls", secure: false, requireTLS: true, ignoreTLS: false });
    strategies.push({ name: "starttls-optional", secure: false, requireTLS: false, ignoreTLS: false });
    strategies.push({ name: "implicit-tls(465)", secure: true, requireTLS: false, ignoreTLS: false });
    strategies.push({ name: "plain-fallback", secure: false, requireTLS: false, ignoreTLS: true });
  }

  const errors: string[] = [];
  for (const s of strategies) {
    let transporter: any = null;
    try {
      console.log(`[SMTP] Trying ${s.name} → ${host}:${port}`);
      transporter = nodemailer.createTransport({
        host,
        port: s.name === "implicit-tls(465)" ? 465 : port,
        secure: s.secure,
        requireTLS: s.requireTLS,
        ignoreTLS: s.ignoreTLS,
        auth: { user: cfg.username, pass: cfg.password },
        tls: {
          rejectUnauthorized: false, // shared hosting often has self-signed certs
          minVersion: "TLSv1",
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });

      await transporter.sendMail({
        from: `"${cfg.from_name}" <${cfg.from_email}>`,
        to,
        subject,
        html,
      });
      console.log(`[SMTP] ✅ Success via ${s.name}`);
      try { transporter.close(); } catch (_) {}
      return { success: true, strategy: s.name };
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(`[SMTP] ❌ ${s.name} failed: ${msg}`);
      errors.push(`${s.name}: ${msg}`);
      try { transporter?.close(); } catch (_) {}
      // Hard auth failure — don't try further
      if (/535|invalid login|authentication failed|bad username|bad password/i.test(msg)) {
        return { success: false, error: `Authentication failed. Check SMTP username/password. (${msg})` };
      }
    }
  }

  return { success: false, error: `All SMTP strategies failed:\n${errors.join("\n")}` };
}

// ─────────────────────────── Handler ───────────────────────────
function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight FIRST — must always succeed
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ ok: false, error: "Server configuration error" });
    }
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { type, email, code, redirect_to, origin, user_name, amount, subject: subjOverride, message } = body;

    if (!email || !type) {
      return jsonResponse({ ok: false, error: "email and type are required" });
    }

    const { data: settings } = await adminClient
      .from("site_settings")
      .select("site_name, email_provider")
      .maybeSingle();

    const siteName = settings?.site_name || "Platform";
    const emailProvider = settings?.email_provider || "smtp";

    if (emailProvider !== "smtp") {
      return jsonResponse({ ok: true, provider: "lovable", message: "Use built-in auth emails" });
    }

    // Dynamic domain (origin can change between custom domains/preview)
    let domain = "your-app.com";
    let baseOrigin = origin;
    try {
      if (origin) {
        const u = new URL(origin);
        domain = u.hostname;
        baseOrigin = u.origin;
      }
    } catch (_) {}

    const { data: smtpConfig } = await adminClient
      .from("smtp_config")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (!smtpConfig) {
      return jsonResponse({
        ok: false,
        error: "SMTP not configured or inactive. Configure SMTP in Admin → Email/SMTP and toggle 'Enable SMTP'.",
      });
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "password_reset": {
        // Look up the user (don't leak existence — but we still need user_id)
        const { data: userList, error: userErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (userErr) {
          return jsonResponse({ ok: false, error: "User lookup failed: " + userErr.message });
        }
        const matchedUser = userList?.users?.find((u: any) => (u.email || "").toLowerCase() === String(email).toLowerCase());
        if (!matchedUser) {
          // Don't reveal whether email exists; pretend success
          return jsonResponse({ ok: true, success: true, provider: "smtp", note: "If account exists, email sent." });
        }

        // Generate cryptographically strong custom token
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const customToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

        const { error: insertErr } = await adminClient.from("password_reset_tokens").insert({
          user_id: matchedUser.id,
          email,
          token: customToken,
          origin: baseOrigin,
        });
        if (insertErr) {
          return jsonResponse({ ok: false, error: "Token store failed: " + insertErr.message });
        }

        // Build link to CURRENT origin — fully dynamic per domain
        const resetLink = `${baseOrigin}/reset-password?token=${customToken}&email=${encodeURIComponent(email)}`;
        subject = `Reset your ${siteName} password`;
        html = tplPasswordReset(siteName, resetLink, domain);
        break;
      }
      case "2fa_code":
        subject = `Your ${siteName} verification code`;
        html = tpl2FACode(siteName, code || "000000", domain);
        break;
      case "welcome":
        subject = `Welcome to ${siteName}`;
        html = tplWelcome(siteName, user_name || "there", domain);
        break;
      case "deposit":
        subject = `Deposit confirmed — ${siteName}`;
        html = tplDeposit(siteName, String(amount ?? "0"), domain);
        break;
      case "generic":
        subject = subjOverride || `Notification from ${siteName}`;
        html = tplGeneric(siteName, subject, message || "", domain);
        break;
      default:
        return jsonResponse({ ok: false, error: `Unknown email type: ${type}` });
    }

    const result = await sendViaSmtp(smtpConfig, email, subject, html);

    // Log (don't fail if logging fails)
    try {
      await adminClient.from("notification_log").insert({
        channel: "email",
        recipient: email,
        subject,
        body: `[${type}] via SMTP${result.strategy ? ` (${result.strategy})` : ""}`,
        status: result.success ? "sent" : "failed",
        error_message: result.error || null,
        template_slug: `smtp_${type}`,
      });
    } catch (_) {}

    if (!result.success) {
      return jsonResponse({ ok: false, error: result.error });
    }
    return jsonResponse({ ok: true, success: true, provider: "smtp", strategy: result.strategy });
  } catch (error: any) {
    console.error("smtp-email fatal:", error);
    return jsonResponse({ ok: false, error: error?.message || String(error) });
  }
});
