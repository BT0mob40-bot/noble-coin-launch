import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface STKPushRequest {
  phone: string;
  amount: number;
  transactionId: string;
  accountReference: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const body: STKPushRequest = await req.json();
    const { phone, amount, transactionId, accountReference } = body;

    if (!phone || !amount || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch M-PESA config
    const { data: mpesaConfig, error: configError } = await supabase
      .from("mpesa_config")
      .select("*")
      .maybeSingle();

    if (configError || !mpesaConfig) {
      console.error("M-PESA config error:", configError);
      return new Response(
        JSON.stringify({ error: "M-PESA not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mpesaConfig.consumer_key || !mpesaConfig.consumer_secret || !mpesaConfig.passkey) {
      return new Response(
        JSON.stringify({ error: "M-PESA credentials not fully configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine API URLs based on environment
    const baseUrl = mpesaConfig.is_sandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";

    // Get OAuth token
    const auth = btoa(`${mpesaConfig.consumer_key}:${mpesaConfig.consumer_secret}`);
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

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

    // Format phone number (remove leading 0 or +254, then add 254)
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

    // Generate password
    const password = btoa(`${mpesaConfig.paybill_number}${mpesaConfig.passkey}${timestamp}`);

    // Build callback URL
    const callbackUrl = mpesaConfig.callback_url || 
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    // Prepare STK Push request
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
      TransactionDesc: `Coin Purchase - ${transactionId}`,
    };

    console.log("STK Push payload:", JSON.stringify(stkPayload, null, 2));

    // Send STK Push request
    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    });

    const stkResult = await stkResponse.json();
    console.log("STK Push response:", JSON.stringify(stkResult, null, 2));

    if (stkResult.ResponseCode === "0") {
      // Update transaction with checkout request ID
      await supabase
        .from("transactions")
        .update({
          mpesa_receipt: stkResult.CheckoutRequestID,
          status: "stk_sent",
        })
        .eq("id", transactionId);

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
      console.error("STK Push failed:", stkResult);
      
      // Update transaction status
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transactionId);

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
