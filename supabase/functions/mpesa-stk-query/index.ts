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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { checkoutRequestId } = await req.json();
    if (!checkoutRequestId) {
      return new Response(JSON.stringify({ error: "Missing checkoutRequestId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First check if we already have a result in our DB
    const { data: tx } = await adminClient
      .from("transactions")
      .select("status")
      .eq("mpesa_receipt", checkoutRequestId)
      .maybeSingle();

    if (tx?.status === "completed") {
      return new Response(JSON.stringify({ status: "completed", resultCode: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx?.status === "failed") {
      return new Response(JSON.stringify({ status: "failed", resultCode: 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pr } = await adminClient
      .from("payment_requests")
      .select("status")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (pr?.status === "completed") {
      return new Response(JSON.stringify({ status: "completed", resultCode: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pr?.status === "failed") {
      return new Response(JSON.stringify({ status: "failed", resultCode: 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query Daraja STK Query API
    const { data: mpesaConfig } = await adminClient
      .from("mpesa_config")
      .select("*")
      .maybeSingle();

    if (!mpesaConfig?.consumer_key || !mpesaConfig?.consumer_secret || !mpesaConfig?.passkey) {
      return new Response(JSON.stringify({ status: "pending", message: "Awaiting callback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = mpesaConfig.is_sandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";

    const auth = btoa(`${mpesaConfig.consumer_key}:${mpesaConfig.consumer_secret}`);
    const tokenRes = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ status: "pending", message: "Token error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token } = await tokenRes.json();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const password = btoa(`${mpesaConfig.paybill_number}${mpesaConfig.passkey}${timestamp}`);

    const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: mpesaConfig.paybill_number,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const contentType = queryRes.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(JSON.stringify({ status: "pending", message: "Non-JSON response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const queryResult = await queryRes.json();
    const resultCode = parseInt(queryResult.ResultCode);

    // Map Daraja result codes
    // 0 = success, 1032 = cancelled by user, 1037 = DS timeout, 1 = insufficient balance
    if (resultCode === 0) {
      // Update DB so callback doesn't need to race
      if (tx && tx.status !== "completed") {
        await adminClient.from("transactions").update({ status: "completed" }).eq("mpesa_receipt", checkoutRequestId);
      }
      if (pr && pr.status !== "completed") {
        await adminClient.from("payment_requests").update({ status: "completed", result_desc: queryResult.ResultDesc || "success" }).eq("checkout_request_id", checkoutRequestId);

        // Fetch full payment request to handle coin_creation
        const { data: fullPr } = await adminClient
          .from("payment_requests")
          .select("*")
          .eq("checkout_request_id", checkoutRequestId)
          .maybeSingle();

        if (fullPr?.type === "coin_creation" && fullPr.coin_id) {
          await adminClient
            .from("coins")
            .update({ creation_fee_paid: true })
            .eq("id", fullPr.coin_id)
            .eq("creator_id", fullPr.user_id);
        }

        if (fullPr?.type === "deposit") {
          const { data: settings } = await adminClient
            .from("site_settings")
            .select("deposit_fee_percentage")
            .maybeSingle();

          const grossAmount = Number(fullPr.amount || 0);
          const depositFee = settings?.deposit_fee_percentage
            ? grossAmount * (settings.deposit_fee_percentage / 100)
            : 0;
          const netDeposit = Math.max(0, grossAmount - depositFee);

          const { data: wallet } = await adminClient
            .from("wallets")
            .select("fiat_balance")
            .eq("user_id", fullPr.user_id)
            .single();

          if (wallet) {
            await adminClient
              .from("wallets")
              .update({ fiat_balance: wallet.fiat_balance + netDeposit })
              .eq("user_id", fullPr.user_id);
          }
        }
      }

      return new Response(JSON.stringify({ status: "completed", resultCode: 0, resultDesc: queryResult.ResultDesc }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (isNaN(resultCode) || queryResult.errorCode === "500.001.1001") {
      // Transaction still processing
      return new Response(JSON.stringify({ status: "pending", message: "Still processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Any non-zero result code = failed/cancelled/timeout
      // Update DB status for fast subsequent checks
      if (tx) {
        await adminClient.from("transactions").update({ status: "failed" }).eq("mpesa_receipt", checkoutRequestId);
      }
      if (pr) {
        await adminClient.from("payment_requests").update({ status: "failed", result_desc: queryResult.ResultDesc || "Failed" }).eq("checkout_request_id", checkoutRequestId);
      }

      return new Response(JSON.stringify({
        status: "failed",
        resultCode,
        resultDesc: queryResult.ResultDesc || "Transaction failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("STK Query error:", error);
    return new Response(JSON.stringify({ status: "pending", message: "Query error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
