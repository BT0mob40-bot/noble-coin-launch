import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Recipient {
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
}

async function sendSmtpEmail(
  smtpConfig: any,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
    return { success: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Check if this is an internal cron call (no auth header but has cron_secret)
    const authHeader = req.headers.get("Authorization");
    const adminClient = createClient(supabaseUrl, serviceKey);
    let isCronCall = false;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Verify caller is admin
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });
      if (!isAdmin) throw new Error("Unauthorized: admin only");
    } else {
      // Allow calls from cron (via pg_net with anon key in header)
      isCronCall = true;
    }

    const body = await req.json();
    const {
      recipients,
      channels,
      subject,
      email_body,
      sms_body,
      whatsapp_body,
      template_slug,
    } = body as {
      recipients: Recipient[];
      channels: string[];
      subject: string;
      email_body: string;
      sms_body: string;
      whatsapp_body: string;
      template_slug: string | null;
    };

    // Get site settings
    const { data: settings } = await adminClient
      .from("site_settings")
      .select("site_name")
      .maybeSingle();
    const siteName = settings?.site_name || "Platform";

    // Get channel configs
    let smtpConfig: any = null;
    let smsConfig: any = null;
    let whatsappConfig: any = null;

    if (channels.includes("email")) {
      const { data } = await adminClient.from("smtp_config").select("*").eq("is_active", true).maybeSingle();
      smtpConfig = data;
    }
    if (channels.includes("sms")) {
      const { data } = await adminClient.from("sms_config").select("*").eq("is_active", true).maybeSingle();
      smsConfig = data;
    }
    if (channels.includes("whatsapp")) {
      const { data } = await adminClient.from("whatsapp_config").select("*").eq("is_active", true).maybeSingle();
      whatsappConfig = data;
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const replacePlaceholders = (text: string) => {
        return text
          .replace(/\{\{user_name\}\}/g, recipient.name || "User")
          .replace(/\{\{email\}\}/g, recipient.email || "")
          .replace(/\{\{phone\}\}/g, recipient.phone || "")
          .replace(/\{\{site_name\}\}/g, siteName);
      };

      // Send Email via SMTP
      if (channels.includes("email") && recipient.email) {
        if (smtpConfig) {
          const emailSubject = replacePlaceholders(subject);
          const emailHtml = replacePlaceholders(email_body);
          const result = await sendSmtpEmail(smtpConfig, recipient.email, emailSubject, emailHtml);

          await adminClient.from("notification_log").insert({
            user_id: recipient.user_id,
            channel: "email",
            recipient: recipient.email,
            subject: emailSubject,
            body: emailHtml,
            status: result.success ? "sent" : "failed",
            error_message: result.error || null,
            template_slug,
          });
          if (result.success) sentCount++;
          else failedCount++;
        } else {
          await adminClient.from("notification_log").insert({
            user_id: recipient.user_id,
            channel: "email",
            recipient: recipient.email,
            subject: replacePlaceholders(subject),
            body: replacePlaceholders(email_body),
            status: "failed",
            error_message: "SMTP not configured or inactive",
            template_slug,
          });
          failedCount++;
        }
      }

      // Send SMS via Africa's Talking
      if (channels.includes("sms") && recipient.phone) {
        if (smsConfig) {
          try {
            const smsText = replacePlaceholders(sms_body);
            const formData = new URLSearchParams();
            formData.append("username", smsConfig.username);
            formData.append("to", recipient.phone);
            formData.append("message", smsText);
            if (smsConfig.sender_id) formData.append("from", smsConfig.sender_id);

            const smsRes = await fetch(
              "https://api.africastalking.com/version1/messaging",
              {
                method: "POST",
                headers: {
                  apiKey: smsConfig.api_key,
                  "Content-Type": "application/x-www-form-urlencoded",
                  Accept: "application/json",
                },
                body: formData.toString(),
              }
            );
            const smsResult = await smsRes.json();
            const msgStatus = smsResult?.SMSMessageData?.Recipients?.[0]?.status;
            const success = msgStatus === "Success";

            await adminClient.from("notification_log").insert({
              user_id: recipient.user_id,
              channel: "sms",
              recipient: recipient.phone,
              body: smsText,
              status: success ? "sent" : "failed",
              error_message: success ? null : (msgStatus || "Unknown SMS error"),
              template_slug,
            });
            if (success) sentCount++;
            else failedCount++;
          } catch (e: any) {
            await adminClient.from("notification_log").insert({
              user_id: recipient.user_id,
              channel: "sms",
              recipient: recipient.phone,
              body: replacePlaceholders(sms_body),
              status: "failed",
              error_message: e.message,
              template_slug,
            });
            failedCount++;
          }
        } else {
          await adminClient.from("notification_log").insert({
            user_id: recipient.user_id,
            channel: "sms",
            recipient: recipient.phone,
            body: replacePlaceholders(sms_body),
            status: "failed",
            error_message: "SMS not configured or inactive",
            template_slug,
          });
          failedCount++;
        }
      }

      // Send WhatsApp via Meta Cloud API
      if (channels.includes("whatsapp") && recipient.phone) {
        if (whatsappConfig) {
          try {
            const waText = replacePlaceholders(whatsapp_body);
            const phone = recipient.phone.replace(/\+/g, "");
            const waRes = await fetch(
              `https://graph.facebook.com/v18.0/${whatsappConfig.phone_number_id}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${whatsappConfig.api_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: phone,
                  type: "text",
                  text: { body: waText },
                }),
              }
            );
            const waResult = await waRes.json();
            const success = !!waResult?.messages?.[0]?.id;

            await adminClient.from("notification_log").insert({
              user_id: recipient.user_id,
              channel: "whatsapp",
              recipient: recipient.phone,
              body: waText,
              status: success ? "sent" : "failed",
              error_message: success ? null : JSON.stringify(waResult?.error || "Unknown WA error"),
              template_slug,
            });
            if (success) sentCount++;
            else failedCount++;
          } catch (e: any) {
            await adminClient.from("notification_log").insert({
              user_id: recipient.user_id,
              channel: "whatsapp",
              recipient: recipient.phone,
              body: replacePlaceholders(whatsapp_body),
              status: "failed",
              error_message: e.message,
              template_slug,
            });
            failedCount++;
          }
        } else {
          await adminClient.from("notification_log").insert({
            user_id: recipient.user_id,
            channel: "whatsapp",
            recipient: recipient.phone,
            body: replacePlaceholders(whatsapp_body),
            status: "failed",
            error_message: "WhatsApp not configured or inactive",
            template_slug,
          });
          failedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
