import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface STKPushRequest {
  phone: string;
  amount: number;
  transactionId?: string;
  accountReference?: string;
  type?: "buy" | "deposit" | "coin_creation";
  userId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user with getUser instead of getClaims
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log(`Authenticated user: ${userId}`);

    const body: STKPushRequest = await req.json();
    const { phone, amount, transactionId, accountReference, type } = body;

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For deposits, create a transaction record if none provided
    let txId = transactionId;
    if (type === "deposit" && !txId) {
      // Use service role to create deposit record
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // We'll track deposits via a special coin_id = null approach
      // For now, just send the STK push and let callback handle it
      console.log("Deposit request - no transaction needed for STK push");
    }

    // Fetch M-PESA config using service role (config is admin-only)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: mpesaConfig, error: configError } = await adminClient
      .from("mpesa_config")
      .select("*")
      .maybeSingle();

    if (configError || !mpesaConfig) {
      console.error("M-PESA config error:", configError?.message);
      return new Response(
        JSON.stringify({ error: "M-PESA not configured. Contact admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mpesaConfig.consumer_key || !mpesaConfig.consumer_secret || !mpesaConfig.passkey) {
      console.error("M-PESA credentials incomplete");
      return new Response(
        JSON.stringify({ error: "M-PESA credentials not fully configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = mpesaConfig.is_sandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";

    // Get OAuth token
    const auth = btoa(`${mpesaConfig.consumer_key}:${mpesaConfig.consumer_secret}`);
    console.log(`Getting OAuth token from ${baseUrl}...`);

    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("OAuth token error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with M-PESA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("OAuth token obtained successfully");

    // Format phone number
    let formattedPhone = phone.replace(/\s+/g, "").replace(/^\+/, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);

    const password = btoa(`${mpesaConfig.paybill_number}${mpesaConfig.passkey}${timestamp}`);

    const callbackUrl =
      mpesaConfig.callback_url ||
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    const stkPayload = {
      BusinessShortCode: mpesaConfig.paybill_number,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: mpesaConfig.paybill_number,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference || "CoinPurchase",
      TransactionDesc: txId
        ? `Payment - ${txId}`
        : type === "deposit"
        ? `Wallet Deposit - ${userId}`
        : "Payment",
    };

    console.log("STK Push payload:", JSON.stringify(stkPayload, null, 2));

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    });

    const contentType = stkResponse.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const textResponse = await stkResponse.text();
      console.error("M-PESA returned non-JSON:", textResponse.substring(0, 300));
      return new Response(
        JSON.stringify({ error: "M-PESA gateway returned invalid response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stkResult = await stkResponse.json();
    console.log("STK Push response:", JSON.stringify(stkResult, null, 2));

    if (stkResult.ResponseCode === "0") {
      // Update transaction with checkout request ID if we have one
      if (txId) {
        await adminClient
          .from("transactions")
          .update({
            mpesa_receipt: stkResult.CheckoutRequestID,
            status: "stk_sent",
          })
          .eq("id", txId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "STK Push sent successfully",
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("STK Push failed:", JSON.stringify(stkResult));

      if (txId) {
        await adminClient
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", txId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: stkResult.errorMessage || stkResult.ResponseDescription || "STK Push failed",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("STK Push error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
