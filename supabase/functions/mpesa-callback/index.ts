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

  const acceptedResponse = new Response(
    JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const b2cResult = body?.Result;
    if (b2cResult) {
      const conversationId = b2cResult.ConversationID || b2cResult.OriginatorConversationID;
      const receipt = b2cResult.TransactionID || conversationId || "";
      const success = Number(b2cResult.ResultCode) === 0;
      const { data: withdrawal } = await supabase
        .from("wallet_withdrawals")
        .select("id,user_id,amount,net_amount,phone")
        .or(`checkout_request_id.eq.${conversationId},mpesa_receipt.eq.${conversationId}`)
        .maybeSingle();

      if (withdrawal?.id) {
        const { error } = await supabase.rpc("process_mpesa_withdrawal_result", {
          _withdrawal_id: withdrawal.id,
          _success: success,
          _mpesa_receipt: receipt,
          _result_desc: b2cResult.ResultDesc || (success ? "completed" : "failed"),
        });
        if (error) console.error("process_mpesa_withdrawal_result error:", error);
        else {
          try {
            const { data: profile } = await supabase
              .from("profiles").select("email").eq("user_id", withdrawal.user_id).maybeSingle();
            if (profile?.email) {
              supabase.functions.invoke("smtp-email", {
                body: {
                  type: success ? "withdrawal_approved" : "withdrawal_rejected",
                  email: profile.email,
                  amount: withdrawal.net_amount || withdrawal.amount,
                  phone: withdrawal.phone,
                  reference: receipt,
                  status: success ? "Completed" : "Failed",
                  reason: b2cResult.ResultDesc || "M-PESA payout failed",
                },
              }).catch(() => {});
            }
          } catch (_) {}
        }
      }
      return acceptedResponse;
    }

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return acceptedResponse;

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    let mpesaReceiptNumber = "";
    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value;
      }
    }

    let { data: transaction } = await supabase
      .from("transactions").select("id,status").or(`mpesa_receipt.eq.${CheckoutRequestID},merchant_request_id.eq.${MerchantRequestID}`).maybeSingle();

    let { data: paymentRequest } = await supabase
      .from("payment_requests").select("id,status").eq("checkout_request_id", CheckoutRequestID).maybeSingle();

    if (!transaction) {
      const txFallback = await supabase
        .from("transactions")
        .select("id,status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (txFallback.data?.id) {
        transaction = txFallback.data;
        await supabase.from("transactions").update({ mpesa_receipt: CheckoutRequestID, merchant_request_id: MerchantRequestID }).eq("id", txFallback.data.id);
      }
    }

    if (!paymentRequest) {
      const prFallback = await supabase
        .from("payment_requests")
        .select("id,status")
        .in("status", ["pending", "stk_sent"])
        .is("checkout_request_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prFallback.data?.id) {
        paymentRequest = prFallback.data;
        await supabase.from("payment_requests").update({ checkout_request_id: CheckoutRequestID }).eq("id", prFallback.data.id);
      }
    }

    if (ResultCode !== 0) {
      if (transaction) await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction.id);
      if (paymentRequest) {
        await supabase.from("payment_requests")
          .update({ status: "failed", result_desc: ResultDesc || "failed" })
          .eq("id", paymentRequest.id);
      }
      return acceptedResponse;
    }

    // Atomic allocation via RPC (idempotent)
    if (transaction) {
      const { data, error } = await supabase.rpc("complete_mpesa_buy", {
        _transaction_id: transaction.id,
        _mpesa_receipt: mpesaReceiptNumber || CheckoutRequestID,
      });
      if (error) console.error("complete_mpesa_buy error:", error);
      else console.log("complete_mpesa_buy:", data);
    }

    if (paymentRequest) {
      const { data, error } = await supabase.rpc("complete_mpesa_deposit", {
        _payment_request_id: paymentRequest.id,
        _mpesa_receipt: mpesaReceiptNumber || CheckoutRequestID,
      });
      if (error) console.error("complete_mpesa_deposit error:", error);
      else {
        console.log("complete_mpesa_deposit:", data);
        // Fire-and-forget deposit confirmation email
        try {
          const { data: pr } = await supabase
            .from("payment_requests")
            .select("user_id, amount, type")
            .eq("id", paymentRequest.id)
            .maybeSingle();
          if (pr && pr.type === "deposit") {
            const { data: profile } = await supabase
              .from("profiles").select("email").eq("user_id", pr.user_id).maybeSingle();
            if (profile?.email) {
              supabase.functions.invoke("smtp-email", {
                body: {
                  type: "deposit",
                  email: profile.email,
                  amount: pr.amount,
                  reference: mpesaReceiptNumber || CheckoutRequestID,
                  status: "Completed",
                },
              }).catch(() => {});
            }
          }
        } catch (_) {}
      }
    }

    return acceptedResponse;
  } catch (error) {
    console.error("Callback processing error:", error);
    return acceptedResponse;
  }
});
