import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WithdrawalRequest {
  withdrawalId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { withdrawalId }: WithdrawalRequest = await req.json();
    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: "withdrawalId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: withdrawal, error: withdrawalError } = await adminClient
      .from("wallet_withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .eq("status", "approved")
      .maybeSingle();

    if (withdrawalError || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found or not approved" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await adminClient.from("mpesa_config").select("*").maybeSingle();
    if (!config?.consumer_key || !config?.consumer_secret || !config?.paybill_number) {
      return new Response(JSON.stringify({ error: "M-PESA configuration incomplete" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.initiator_name || !config.security_credential) {
      return new Response(JSON.stringify({
        error: "B2C credentials missing. Set initiator name and security credential in M-PESA settings.",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = config.is_sandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";

    const auth = btoa(`${config.consumer_key}:${config.consumer_secret}`);

    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      return new Response(JSON.stringify({ error: `Failed to authenticate with M-PESA: ${tokenError}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    await adminClient
      .from("wallet_withdrawals")
      .update({ status: "processing" })
      .eq("id", withdrawal.id);

    const payload = {
      InitiatorName: config.initiator_name,
      SecurityCredential: config.security_credential,
      CommandID: config.b2c_command_id || "BusinessPayment",
      Amount: Math.round(withdrawal.net_amount),
      PartyA: config.paybill_number,
      PartyB: withdrawal.phone,
      Remarks: `Withdrawal ${withdrawal.id}`,
      QueueTimeOutURL:
        config.b2c_timeout_url || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`,
      ResultURL:
        config.b2c_result_url || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`,
      Occasion: "WalletWithdrawal",
    };

    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v3/paymentrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const b2cResult = await b2cResponse.json().catch(() => ({}));

    if (!b2cResponse.ok) {
      await adminClient.rpc("process_mpesa_withdrawal_result", {
        _withdrawal_id: withdrawal.id,
        _success: false,
        _mpesa_receipt: b2cResult.ConversationID || b2cResult.OriginatorConversationID || null,
        _result_desc: b2cResult.errorMessage || "B2C request failed",
      });

      return new Response(JSON.stringify({ error: b2cResult.errorMessage || "B2C request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("wallet_withdrawals")
      .update({
        status: "processing",
        checkout_request_id: b2cResult.ConversationID || b2cResult.OriginatorConversationID || null,
        mpesa_receipt: b2cResult.ConversationID || null,
        admin_note: b2cResult.ResponseDescription || "Sent to M-PESA, awaiting final result",
      })
      .eq("id", withdrawal.id);

    return new Response(
      JSON.stringify({ success: true, message: "Withdrawal sent to M-PESA", status: "processing", result: b2cResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
