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

    const { checkoutRequestId, transactionId, paymentRequestId } = await req.json();
    if (!checkoutRequestId && !transactionId && !paymentRequestId) {
      return new Response(JSON.stringify({ error: "Missing checkoutRequestId or record reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First check if we already have a result in our DB
    const txLookup = transactionId
      ? adminClient.from("transactions").select("id,status,mpesa_receipt").eq("id", transactionId).maybeSingle()
      : adminClient.from("transactions").select("id,status,mpesa_receipt").eq("mpesa_receipt", checkoutRequestId).maybeSingle();
    const { data: tx } = await txLookup;

    const effectiveCheckoutRequestId = checkoutRequestId || tx?.mpesa_receipt;

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

    const prLookup = paymentRequestId
      ? adminClient.from("payment_requests").select("*").eq("id", paymentRequestId).maybeSingle()
      : adminClient.from("payment_requests").select("*").eq("checkout_request_id", effectiveCheckoutRequestId).maybeSingle();
    const { data: pr } = await prLookup;
    if (!effectiveCheckoutRequestId) {
      return new Response(JSON.stringify({ status: "pending", message: "Awaiting checkout reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


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
         CheckoutRequestID: effectiveCheckoutRequestId,
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
      // Atomic allocation via RPC — idempotent, safe if callback also fires
      const transactionToComplete = tx?.id ? { data: { id: tx.id } } : await adminClient.from("transactions").select("id").eq("mpesa_receipt", effectiveCheckoutRequestId).maybeSingle();
      if (transactionToComplete.data?.id) {
        const { error: rpcErr } = await adminClient.rpc("complete_mpesa_buy", {
          _transaction_id: transactionToComplete.data.id,
          _mpesa_receipt: effectiveCheckoutRequestId,
        });
        if (rpcErr) console.error("complete_mpesa_buy from query:", rpcErr);
      }

      if (pr) {
        const { error: rpcErr2 } = await adminClient.rpc("complete_mpesa_deposit", {
          _payment_request_id: pr.id,
          _mpesa_receipt: effectiveCheckoutRequestId,
        });
        if (rpcErr2) console.error("complete_mpesa_deposit from query:", rpcErr2);
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
        await adminClient.from("transactions").update({ status: "failed", mpesa_receipt: effectiveCheckoutRequestId }).eq("id", tx.id);
      }
      if (pr) {
        await adminClient.from("payment_requests").update({ status: "failed", result_desc: queryResult.ResultDesc || "Failed", mpesa_receipt: effectiveCheckoutRequestId }).eq("id", pr.id);
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
