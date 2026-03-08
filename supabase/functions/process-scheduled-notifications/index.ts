import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find all due scheduled notifications
    const now = new Date().toISOString();
    const { data: schedules, error: fetchError } = await adminClient
      .from("scheduled_notifications")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now);

    if (fetchError || !schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled notifications due", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const schedule of schedules) {
      // Get all user profiles for bulk send
      const { data: users } = await adminClient
        .from("profiles")
        .select("user_id, email, full_name, phone");

      let recipients: any[];
      if (schedule.target === "all") {
        recipients = (users || []).map((u: any) => ({
          user_id: u.user_id,
          email: u.email,
          phone: u.phone,
          name: u.full_name,
        }));
      } else {
        // Specific user IDs stored in target_user_ids
        const targetIds: string[] = schedule.target_user_ids || [];
        recipients = (users || [])
          .filter((u: any) => targetIds.includes(u.user_id))
          .map((u: any) => ({
            user_id: u.user_id,
            email: u.email,
            phone: u.phone,
            name: u.full_name,
          }));
      }

      if (recipients.length > 0) {
        // Call the send-custom-notification function internally
        const sendRes = await fetch(
          `${supabaseUrl}/functions/v1/send-custom-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              recipients,
              channels: schedule.channels,
              subject: schedule.subject || "",
              email_body: schedule.email_body || "",
              sms_body: schedule.sms_body || "",
              whatsapp_body: schedule.whatsapp_body || "",
              template_slug: schedule.template_slug,
            }),
          }
        );

        const sendResult = await sendRes.json();
        
        // Update last_run
        await adminClient
          .from("scheduled_notifications")
          .update({
            last_run_at: now,
            run_count: (schedule.run_count || 0) + 1,
          })
          .eq("id", schedule.id);
      }

      // Calculate next run
      if (schedule.frequency === "once") {
        // One-time: deactivate
        await adminClient
          .from("scheduled_notifications")
          .update({ is_active: false })
          .eq("id", schedule.id);
      } else {
        // Calculate next_run_at based on frequency
        const lastRun = new Date(schedule.next_run_at);
        let nextRun: Date;

        switch (schedule.frequency) {
          case "hourly":
            nextRun = new Date(lastRun.getTime() + 60 * 60 * 1000);
            break;
          case "daily":
            nextRun = new Date(lastRun.getTime() + 24 * 60 * 60 * 1000);
            break;
          case "weekly":
            nextRun = new Date(lastRun.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case "monthly":
            nextRun = new Date(lastRun);
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
          default:
            nextRun = new Date(lastRun.getTime() + 24 * 60 * 60 * 1000);
        }

        await adminClient
          .from("scheduled_notifications")
          .update({ next_run_at: nextRun.toISOString() })
          .eq("id", schedule.id);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
