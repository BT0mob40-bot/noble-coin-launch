import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory caches (per warm instance) to slash latency
let cachedToken: { token: string; expiresAt: number; key: string } | null = null;
let cachedConfig: { data: any; expiresAt: number } | null = null;

async function getMpesaAccessToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
  const cacheKey = `${baseUrl}:${consumerKey}`;
  const now = Date.now();
  if (cachedToken && cachedToken.key === cacheKey && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: now + 50 * 60 * 1000, key: cacheKey };
  return data.access_token;
}

async function getMpesaConfig(adminClient: any) {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) return cachedConfig.data;
  const { data, error } = await adminClient.from("mpesa_config").select("*").maybeSingle();
  if (error || !data) throw new Error("M-PESA not configured");
  cachedConfig = { data, expiresAt: now + 5 * 60 * 1000 }; // 5 min cache
  return data;
}

interface STKPushRequest {
  phone: string;
  amount: number;
  transactionId?: string;
  paymentRequestId?: string;
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
      console.error("No auth header found");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: STKPushRequest = await req.json();
    const { phone, amount, transactionId, paymentRequestId, accountReference, type = "buy", userId } = body;

    // Determine caller identity
    let authenticatedUserId: string;
    const token = authHeader.replace("Bearer ", "");
    
    // Decode JWT to check role
    let isServiceRole = false;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        // Base64url decode
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64));
        console.log("JWT role:", payload.role);
        isServiceRole = payload.role === "service_role";
      }
    } catch (e) {
      console.error("JWT decode error:", e);
    }

    if (isServiceRole) {
      // Service role call (from telegram-bot, etc.) — userId from body
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required for service calls" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedUserId = userId;
      console.log("Service role call for user:", authenticatedUserId);
    } else {
      // Normal user call — validate via getClaims
      const client = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } = await client.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        console.error("Auth claims error:", claimsError);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedUserId = claimsData.claims.sub as string;
      console.log("Authenticated user:", authenticatedUserId);
    }

    if (!phone || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid fields: phone, amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedPhone = phone.replace(/\s+/g, "").replace(/^\+/, "");
    if (formattedPhone.startsWith("0")) formattedPhone = `254${formattedPhone.substring(1)}`;
    else if (!formattedPhone.startsWith("254")) formattedPhone = `254${formattedPhone}`;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let mpesaConfig: any;
    try {
      mpesaConfig = await getMpesaConfig(adminClient);
    } catch {
      return new Response(JSON.stringify({ error: "M-PESA not configured. Contact admin." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mpesaConfig.consumer_key || !mpesaConfig.consumer_secret || !mpesaConfig.passkey) {
      return new Response(JSON.stringify({ error: "M-PESA credentials not fully configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = mpesaConfig.is_sandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";

    let accessToken: string;
    try {
      accessToken = await getMpesaAccessToken(baseUrl, mpesaConfig.consumer_key, mpesaConfig.consumer_secret);
    } catch (e) {
      console.error("OAuth token error:", e);
      return new Response(JSON.stringify({ error: "Failed to authenticate with M-PESA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const password = btoa(`${mpesaConfig.paybill_number}${mpesaConfig.passkey}${timestamp}`);

    const callbackUrl =
      mpesaConfig.callback_url ||
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    const txDescription =
      type === "deposit"
        ? `Wallet Deposit - ${authenticatedUserId}`
        : type === "coin_creation"
          ? `Coin Creation Fee - ${transactionId || "N/A"}`
          : `Payment - ${transactionId || "N/A"}`;

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
      TransactionDesc: txDescription,
    };

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
      return new Response(JSON.stringify({ error: "M-PESA gateway returned invalid response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stkResult = await stkResponse.json();

    if (stkResult.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({
          success: false,
          error: stkResult.errorMessage || stkResult.ResponseDescription || "STK Push failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const checkoutRequestId = stkResult.CheckoutRequestID as string;
    const merchantRequestId = stkResult.MerchantRequestID as string;

    // Fire-and-forget DB writes — don't block response to user
    const dbWrites = (async () => {
      if (type === "buy" && transactionId) {
        await adminClient
          .from("transactions")
          .update({ mpesa_receipt: checkoutRequestId, status: "stk_sent" })
          .eq("id", transactionId)
          .eq("user_id", authenticatedUserId);
      }
      if (type === "deposit" || type === "coin_creation") {
        if (paymentRequestId) {
          await adminClient.from("payment_requests").update({
            coin_id: type === "coin_creation" ? transactionId || null : null,
            checkout_request_id: checkoutRequestId,
            merchant_request_id: merchantRequestId,
            phone: formattedPhone,
            status: "stk_sent",
          }).eq("id", paymentRequestId).eq("user_id", userId || authenticatedUserId);
        } else {
          await adminClient.from("payment_requests").insert({
            user_id: userId || authenticatedUserId,
            coin_id: type === "coin_creation" ? transactionId || null : null,
            type,
            amount: Math.round(amount),
            phone: formattedPhone,
            checkout_request_id: checkoutRequestId,
            merchant_request_id: merchantRequestId,
            status: "stk_sent",
          });
        }
      }
    })().catch((e) => console.error("Post-STK DB write failed:", e));

    // Use EdgeRuntime.waitUntil if available so the runtime keeps the task alive
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(dbWrites); } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push sent successfully",
        checkoutRequestId,
        merchantRequestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("STK Push error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
