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
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return acceptedResponse;

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    let mpesaReceiptNumber = "";
    let amount = 0;
    let phoneNumber = "";

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value;
        else if (item.Name === "Amount") amount = Number(item.Value);
        else if (item.Name === "PhoneNumber") phoneNumber = String(item.Value);
      }
    }

    const { data: settings } = await supabase
      .from("site_settings")
      .select("fee_percentage, creator_commission_percentage, deposit_fee_percentage, referral_commission_percentage")
      .maybeSingle();

    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("mpesa_receipt", CheckoutRequestID)
      .maybeSingle();

    const { data: paymentRequest } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .maybeSingle();

    if (ResultCode !== 0) {
      if (transaction) {
        await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction.id);
      }
      if (paymentRequest) {
        await supabase
          .from("payment_requests")
          .update({ status: "failed", result_desc: ResultDesc || "failed" })
          .eq("id", paymentRequest.id);
      }
      return acceptedResponse;
    }

    // Trade payment path
    if (transaction) {
      await supabase
        .from("transactions")
        .update({ status: "completed", mpesa_receipt: mpesaReceiptNumber || CheckoutRequestID })
        .eq("id", transaction.id);

      const { data: existingHolding } = await supabase
        .from("holdings")
        .select("*")
        .eq("user_id", transaction.user_id)
        .eq("coin_id", transaction.coin_id)
        .maybeSingle();

      if (existingHolding) {
        const newAmount = existingHolding.amount + transaction.amount;
        const newAvgPrice =
          (existingHolding.average_buy_price * existingHolding.amount +
            transaction.price_per_coin * transaction.amount) /
          newAmount;
        await supabase
          .from("holdings")
          .update({ amount: newAmount, average_buy_price: newAvgPrice })
          .eq("id", existingHolding.id);
      } else {
        await supabase.from("holdings").insert({
          user_id: transaction.user_id,
          coin_id: transaction.coin_id,
          amount: transaction.amount,
          average_buy_price: transaction.price_per_coin,
        });
      }

      const { data: coin } = await supabase
        .from("coins")
        .select("circulating_supply, creator_id")
        .eq("id", transaction.coin_id)
        .single();

      if (coin) {
        const { count: holdersCount } = await supabase
          .from("holdings")
          .select("*", { count: "exact", head: true })
          .eq("coin_id", transaction.coin_id)
          .gt("amount", 0);

        await supabase
          .from("coins")
          .update({
            circulating_supply: coin.circulating_supply + transaction.amount,
            holders_count: holdersCount || 0,
          })
          .eq("id", transaction.coin_id);

        if (settings) {
          const tradingFee = transaction.total_value * (settings.fee_percentage / 100);
          await supabase.from("commission_transactions").insert({
            transaction_id: transaction.id,
            amount: tradingFee,
            commission_rate: settings.fee_percentage,
          });

          if (
            coin.creator_id &&
            coin.creator_id !== transaction.user_id &&
            settings.creator_commission_percentage > 0
          ) {
            const creatorEarning =
              transaction.total_value * (settings.creator_commission_percentage / 100);
            const { data: creatorWallet } = await supabase
              .from("wallets")
              .select("fiat_balance")
              .eq("user_id", coin.creator_id)
              .single();

            if (creatorWallet) {
              await supabase
                .from("wallets")
                .update({ fiat_balance: creatorWallet.fiat_balance + creatorEarning })
                .eq("user_id", coin.creator_id);
            }
          }
        }
      }

      return acceptedResponse;
    }

    // Deposit / coin creation payment path
    if (paymentRequest) {
      await supabase
        .from("payment_requests")
        .update({
          status: "completed",
          mpesa_receipt: mpesaReceiptNumber || CheckoutRequestID,
          result_desc: ResultDesc || "success",
        })
        .eq("id", paymentRequest.id);

      if (paymentRequest.type === "coin_creation" && paymentRequest.coin_id) {
        await supabase
          .from("coins")
          .update({ creation_fee_paid: true })
          .eq("id", paymentRequest.coin_id)
          .eq("creator_id", paymentRequest.user_id);
      }

      if (paymentRequest.type === "deposit") {
        const grossAmount = Number(paymentRequest.amount || amount || 0);
        const depositFee = settings?.deposit_fee_percentage
          ? grossAmount * (settings.deposit_fee_percentage / 100)
          : 0;
        const netDeposit = Math.max(0, grossAmount - depositFee);

        const { data: wallet } = await supabase
          .from("wallets")
          .select("fiat_balance")
          .eq("user_id", paymentRequest.user_id)
          .single();

        if (wallet) {
          await supabase
            .from("wallets")
            .update({ fiat_balance: wallet.fiat_balance + netDeposit })
            .eq("user_id", paymentRequest.user_id);
        }

        if (depositFee > 0) {
          await supabase.from("commission_transactions").insert({
            amount: depositFee,
            commission_rate: settings?.deposit_fee_percentage || 0,
          });
        }

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("referred_by")
          .eq("user_id", paymentRequest.user_id)
          .maybeSingle();

        if (userProfile?.referred_by && settings?.referral_commission_percentage) {
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referral_code", userProfile.referred_by)
            .maybeSingle();

          if (referrerProfile) {
            const referralBonus =
              grossAmount * (settings.referral_commission_percentage / 100);

            const { data: referrerWallet } = await supabase
              .from("wallets")
              .select("fiat_balance")
              .eq("user_id", referrerProfile.user_id)
              .single();

            if (referrerWallet) {
              await supabase
                .from("wallets")
                .update({ fiat_balance: referrerWallet.fiat_balance + referralBonus })
                .eq("user_id", referrerProfile.user_id);
            }
          }
        }
      }
    }

    return acceptedResponse;
  } catch (error) {
    console.error("Callback processing error:", error);
    return acceptedResponse;
  }
});
