import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getPasswordResetTemplate(siteName: string, resetLink: string, domain: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 30px;text-align:center;">
    <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">🔐 ${siteName}</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Password Reset Request</p>
  </td></tr>
  <tr><td style="padding:32px 30px;">
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">Hello,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to set a new password:</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 24px;">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;box-shadow:0 4px 12px rgba(99,102,241,0.35);">Reset My Password</a>
    </td></tr></table>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 16px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">If the button doesn't work, copy this URL:<br/>
      <a href="${resetLink}" style="color:#6366f1;word-break:break-all;font-size:11px;">${resetLink}</a></p>
    </div>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${siteName} · ${domain}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function get2FACodeTemplate(siteName: string, code: string, domain: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 30px;text-align:center;">
    <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">🛡️ ${siteName}</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Two-Factor Authentication</p>
  </td></tr>
  <tr><td style="padding:32px 30px;text-align:center;">
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Your verification code is:</p>
    <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #10b981;border-radius:12px;padding:20px;margin:0 auto 24px;max-width:240px;">
      <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#059669;font-family:monospace;">${code}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">This code expires in <strong>10 minutes</strong>.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${siteName} · ${domain}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function sendViaSmtp(
  smtpConfig: any,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use denomailer for SMTP
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    
    const tls = smtpConfig.encryption === "ssl";
    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.host,
        port: smtpConfig.port,
        tls,
        auth: {
          username: smtpConfig.username,
          password: smtpConfig.password,
        },
      },
    });
    
    await client.send({
      from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
      to,
      subject,
      content: "auto",
      html: htmlBody,
    });
    await client.close();
    return { success: true };
  } catch (e: any) {
    console.error("SMTP send error:", e);
    return { success: false, error: e.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { type, email, code, redirect_to, origin, user_name } = body;

    if (!email || !type) {
      return new Response(JSON.stringify({ error: "email and type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get site settings
    const { data: settings } = await adminClient
      .from("site_settings")
      .select("site_name, email_provider")
      .maybeSingle();

    const siteName = settings?.site_name || "Platform";
    const emailProvider = settings?.email_provider || "smtp";

    // If provider is "lovable", tell the client to use default auth
    if (emailProvider !== "smtp") {
      return new Response(JSON.stringify({ provider: "lovable", message: "Use default auth emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = origin ? new URL(origin).hostname : "app.example.com";

    // Get SMTP config
    const { data: smtpConfig, error: smtpErr } = await adminClient
      .from("smtp_config")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (smtpErr) {
      console.error("SMTP config fetch error:", smtpErr);
    }

    if (!smtpConfig) {
      return new Response(JSON.stringify({ error: "SMTP not configured or inactive. Please configure SMTP settings in Admin → Email/SMTP." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "password_reset": {
        // Generate a real password reset link via Supabase Admin API
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: redirect_to || `${origin}/reset-password`,
          },
        });

        if (linkErr) {
          console.error("generateLink error:", linkErr);
          return new Response(JSON.stringify({ error: "Failed to generate reset link: " + linkErr.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // The action_link contains the full Supabase confirmation URL
        const resetLink = linkData?.properties?.action_link || redirect_to || "#";
        subject = `Reset your ${siteName} password`;
        html = getPasswordResetTemplate(siteName, resetLink, domain);
        break;
      }
      case "2fa_code": {
        subject = `Your ${siteName} verification code`;
        html = get2FACodeTemplate(siteName, code || "000000", domain);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const result = await sendViaSmtp(smtpConfig, email, subject, html);

    // Log
    await adminClient.from("notification_log").insert({
      channel: "email",
      recipient: email,
      subject,
      body: `[${type}] sent via SMTP`,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
      template_slug: `smtp_${type}`,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, provider: "smtp" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("smtp-email function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
