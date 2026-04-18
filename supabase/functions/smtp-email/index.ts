import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Welcome to <strong>${siteName}</strong>! Your account is ready and you can now start trading, creating tokens, and exploring the platform.</p>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0;">If this is a test email, your SMTP configuration is working perfectly. ✅</p>`;
  return shell("Welcome", "linear-gradient(135deg,#3b82f6,#6366f1)", body, siteName, domain);
}

function tplDeposit(siteName: string, amount: string, domain: string) {
  const body = `
    <p style="color:#374151;font-size:15px;margin:0 0 16px;">Your deposit was successful!</p>
    <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:0 0 20px;">
      <p style="color:#059669;font-size:24px;font-weight:800;margin:0;">+ KES ${amount}</p>
      <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">credited to your wallet</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">You can now trade tokens or create your own.</p>`;
  return shell("Deposit Confirmed", "linear-gradient(135deg,#10b981,#059669)", body, siteName, domain);
}

function tplGeneric(siteName: string, subject: string, message: string, domain: string) {
  const body = `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${message.replace(/\n/g, "<br/>")}</p>`;
  return shell(subject, "linear-gradient(135deg,#6366f1,#8b5cf6)", body, siteName, domain);
}

// ─────────────────────────── SMTP send (robust) ───────────────────────────
/**
 * Tries to send email via SMTP with multiple TLS strategies to handle
 * shared-hosting servers (cPanel, Plesk) that misadvertise TLS support.
 */
async function sendViaSmtp(
  smtpConfig: any,
  to: string,
  subject: string,
  htmlBody: string,
): Promise<{ success: boolean; error?: string; strategy?: string }> {
  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

  const port = Number(smtpConfig.port) || 587;
  const enc = (smtpConfig.encryption || "tls").toLowerCase();

  // Build candidate strategies in order of preference
  const strategies: Array<{ name: string; tls: boolean }> = [];
  if (enc === "ssl" || port === 465) {
    strategies.push({ name: "implicit-tls", tls: true });
    strategies.push({ name: "plain-fallback", tls: false });
  } else if (enc === "none") {
    strategies.push({ name: "plain", tls: false });
  } else {
    // tls/starttls — try STARTTLS first, then plain fallback (cPanel/shared hosts)
    strategies.push({ name: "starttls", tls: false }); // denomailer auto-upgrades via STARTTLS when tls:false on 587
    strategies.push({ name: "implicit-tls", tls: true });
    strategies.push({ name: "plain-fallback", tls: false });
  }

  const errors: string[] = [];

  for (const strat of strategies) {
    try {
      console.log(`[SMTP] Trying ${strat.name} → ${smtpConfig.host}:${port}`);
      const client = new SMTPClient({
        connection: {
          hostname: smtpConfig.host,
          port,
          tls: strat.tls,
          auth: {
            username: smtpConfig.username,
            password: smtpConfig.password,
          },
        },
        debug: { log: false, allowUnsecure: true, encodeLB: true, noStartTLS: strat.name === "plain-fallback" || strat.name === "plain" },
      } as any);

      await client.send({
        from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
        to,
        subject,
        content: "auto",
        html: htmlBody,
      });
      try { await client.close(); } catch (_) {}
      console.log(`[SMTP] ✅ Success via ${strat.name}`);
      return { success: true, strategy: strat.name };
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(`[SMTP] ❌ ${strat.name} failed: ${msg}`);
      errors.push(`${strat.name}: ${msg}`);
      // If it's an auth error, no point in retrying with other transports
      if (/auth|535|password|credentials/i.test(msg)) {
        return { success: false, error: `Authentication failed. Check your SMTP username/password. (${msg})` };
      }
    }
  }

  return { success: false, error: `All SMTP strategies failed:\n${errors.join("\n")}` };
}

// ─────────────────────────── Handler ───────────────────────────
function jsonResponse(payload: any, status = 200) {
  // ALWAYS use status 200 so the client receives the body (avoids "non-2xx" errors hiding details)
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // If admin chose lovable/built-in, tell client to fall back
    if (emailProvider !== "smtp") {
      return jsonResponse({ ok: true, provider: "lovable", message: "Use built-in auth emails" });
    }

    const domain = origin ? new URL(origin).hostname : "your-app.com";

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
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: redirect_to || `${origin}/reset-password` },
        });
        if (linkErr) {
          return jsonResponse({ ok: false, error: "Failed to generate reset link: " + linkErr.message });
        }
        const resetLink = linkData?.properties?.action_link || redirect_to || "#";
        subject = `Reset your ${siteName} password`;
        html = tplPasswordReset(siteName, resetLink, domain);
        break;
      }
      case "2fa_code": {
        subject = `Your ${siteName} verification code`;
        html = tpl2FACode(siteName, code || "000000", domain);
        break;
      }
      case "welcome": {
        subject = `Welcome to ${siteName}`;
        html = tplWelcome(siteName, user_name || "there", domain);
        break;
      }
      case "deposit": {
        subject = `Deposit confirmed — ${siteName}`;
        html = tplDeposit(siteName, String(amount ?? "0"), domain);
        break;
      }
      case "generic": {
        subject = subjOverride || `Notification from ${siteName}`;
        html = tplGeneric(siteName, subject, message || "", domain);
        break;
      }
      default:
        return jsonResponse({ ok: false, error: `Unknown email type: ${type}` });
    }

    const result = await sendViaSmtp(smtpConfig, email, subject, html);

    await adminClient.from("notification_log").insert({
      channel: "email",
      recipient: email,
      subject,
      body: `[${type}] via SMTP${result.strategy ? ` (${result.strategy})` : ""}`,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
      template_slug: `smtp_${type}`,
    });

    if (!result.success) {
      return jsonResponse({ ok: false, error: result.error });
    }

    return jsonResponse({ ok: true, success: true, provider: "smtp", strategy: result.strategy });
  } catch (error: any) {
    console.error("smtp-email error:", error);
    return jsonResponse({ ok: false, error: error?.message || String(error) });
  }
});
