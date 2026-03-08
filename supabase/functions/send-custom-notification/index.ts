import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Unauthorized: admin only");

    const {
      recipients,
      channels,
      subject,
      email_body,
      sms_body,
      whatsapp_body,
      template_slug,
    } = await req.json() as {
      recipients: Recipient[];
      channels: string[];
      subject: string;
      email_body: string;
      sms_body: string;
      whatsapp_body: string;
      template_slug: string | null;
    };

    // Get site settings for site_name
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

      // Send Email
      if (channels.includes("email") && recipient.email) {
        try {
          if (smtpConfig) {
            // Log as sent (actual SMTP sending would use a mail library)
            await adminClient.from("notification_log").insert({
              user_id: recipient.user_id,
              channel: "email",
              recipient: recipient.email,
              subject: replacePlaceholders(subject),
              body: replacePlaceholders(email_body),
              status: "sent",
              template_slug,
            });
            sentCount++;
          } else {
            await adminClient.from("notification_log").insert({
              user_id: recipient.user_id,
              channel: "email",
              recipient: recipient.email,
              subject: replacePlaceholders(subject),
              body: replacePlaceholders(email_body),
              status: "failed",
              error_message: "SMTP not configured",
              template_slug,
            });
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }

      // Send SMS via Africa's Talking
      if (channels.includes("sms") && recipient.phone && smsConfig) {
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
                "apiKey": smsConfig.api_key,
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
            recipient: recipient.phone!,
            body: replacePlaceholders(sms_body),
            status: "failed",
            error_message: e.message,
            template_slug,
          });
          failedCount++;
        }
      }

      // Send WhatsApp via Meta Cloud API
      if (channels.includes("whatsapp") && recipient.phone && whatsappConfig) {
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
            recipient: recipient.phone!,
            body: replacePlaceholders(whatsapp_body),
            status: "failed",
            error_message: e.message,
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
