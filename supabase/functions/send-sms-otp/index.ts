import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp_code } = await req.json();
    if (!phone || !otp_code) {
      return new Response(JSON.stringify({ error: 'Missing phone or otp_code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch SMS config
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: smsConfig } = await supabase.from('sms_config').select('*').maybeSingle();

    if (!smsConfig || !smsConfig.is_active) {
      return new Response(JSON.stringify({ error: 'SMS not configured', fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via Africa's Talking
    const atUrl = smsConfig.username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const message = `Your verification code is: ${otp_code}. Valid for 10 minutes.`;

    const formData = new URLSearchParams();
    formData.append('username', smsConfig.username);
    formData.append('to', phone.startsWith('+') ? phone : `+${phone}`);
    formData.append('message', message);
    if (smsConfig.sender_id) {
      formData.append('from', smsConfig.sender_id);
    }

    const atResponse = await fetch(atUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': smsConfig.api_key,
      },
      body: formData.toString(),
    });

    const atResult = await atResponse.json();

    // Log notification
    await supabase.from('notification_log').insert({
      channel: 'sms',
      recipient: phone,
      body: message,
      template_slug: 'otp_verification',
      status: atResponse.ok ? 'sent' : 'failed',
      error_message: atResponse.ok ? null : JSON.stringify(atResult),
    });

    return new Response(JSON.stringify({ success: true, result: atResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
