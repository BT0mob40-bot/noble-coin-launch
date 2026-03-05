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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("M-PESA Callback received:", JSON.stringify(body, null, 2));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    console.log(`Callback - CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

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

    // Find matching transaction by CheckoutRequestID (stored as mpesa_receipt during STK push)
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("mpesa_receipt", CheckoutRequestID)
      .maybeSingle();

    // Fetch platform settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("fee_percentage, admin_commission, creator_commission_percentage, deposit_fee_percentage, referral_commission_percentage, coin_creation_fee")
      .maybeSingle();

    if (ResultCode === 0) {
      console.log(`Payment successful - Receipt: ${mpesaReceiptNumber}, Amount: ${amount}`);

      if (transaction) {
        // ===== COIN BUY/SELL TRANSACTION =====
        await supabase.from("transactions").update({
          status: "completed",
          mpesa_receipt: mpesaReceiptNumber,
        }).eq("id", transaction.id);

        // Update holdings
        const { data: existingHolding } = await supabase
          .from("holdings")
          .select("*")
          .eq("user_id", transaction.user_id)
          .eq("coin_id", transaction.coin_id)
          .maybeSingle();

        if (existingHolding) {
          const newAmount = existingHolding.amount + transaction.amount;
          const newAvgPrice = (existingHolding.average_buy_price * existingHolding.amount + transaction.price_per_coin * transaction.amount) / newAmount;
          await supabase.from("holdings").update({ amount: newAmount, average_buy_price: newAvgPrice }).eq("id", existingHolding.id);
        } else {
          await supabase.from("holdings").insert({
            user_id: transaction.user_id,
            coin_id: transaction.coin_id,
            amount: transaction.amount,
            average_buy_price: transaction.price_per_coin,
          });
        }

        // Update coin circulating supply (triggers bonding curve price update)
        const { data: coin } = await supabase.from("coins").select("circulating_supply, creator_id").eq("id", transaction.coin_id).single();
        if (coin) {
          const { count: holdersCount } = await supabase
            .from("holdings")
            .select("*", { count: "exact", head: true })
            .eq("coin_id", transaction.coin_id)
            .gt("amount", 0);

          await supabase.from("coins").update({
            circulating_supply: coin.circulating_supply + transaction.amount,
            holders_count: holdersCount || 0,
          }).eq("id", transaction.coin_id);

          // ===== COMMISSION DISTRIBUTION =====
          if (settings) {
            const tradingFee = transaction.total_value * (settings.fee_percentage / 100);

            // Admin commission
            await supabase.from("commission_transactions").insert({
              transaction_id: transaction.id,
              amount: tradingFee,
              commission_rate: settings.fee_percentage,
            });

            // Creator earnings (if coin has a creator and it's not the admin buying their own coin)
            if (coin.creator_id && coin.creator_id !== transaction.user_id && settings.creator_commission_percentage > 0) {
              const creatorEarning = transaction.total_value * (settings.creator_commission_percentage / 100);
              const { data: creatorWallet } = await supabase
                .from("wallets")
                .select("fiat_balance")
                .eq("user_id", coin.creator_id)
                .single();

              if (creatorWallet) {
                await supabase.from("wallets").update({
                  fiat_balance: creatorWallet.fiat_balance + creatorEarning,
                }).eq("user_id", coin.creator_id);
                console.log(`Creator earning: ${creatorEarning} KES to ${coin.creator_id}`);
              }
            }
          }
        }

        console.log("Coin buy completed, holdings & commissions updated");

      } else if (amount > 0) {
        // ===== WALLET DEPOSIT =====
        let userId: string | null = null;

        // Try to find user by phone
        if (phoneNumber) {
          const formattedPhone = phoneNumber.startsWith("254") ? phoneNumber : `254${phoneNumber}`;
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id")
            .or(`phone.eq.${formattedPhone},phone.eq.+${formattedPhone},phone.eq.0${formattedPhone.slice(3)}`)
            .maybeSingle();
          userId = profile?.user_id || null;
        }

        if (userId) {
          // Apply deposit fee
          const depositFee = settings?.deposit_fee_percentage ? amount * (settings.deposit_fee_percentage / 100) : 0;
          const netDeposit = amount - depositFee;

          const { data: wallet } = await supabase.from("wallets").select("fiat_balance").eq("user_id", userId).single();
          if (wallet) {
            await supabase.from("wallets").update({ fiat_balance: wallet.fiat_balance + netDeposit }).eq("user_id", userId);
            console.log(`Deposit: ${netDeposit} KES (fee: ${depositFee}) to user ${userId}`);

            // Record deposit fee as commission
            if (depositFee > 0) {
              await supabase.from("commission_transactions").insert({
                amount: depositFee,
                commission_rate: settings?.deposit_fee_percentage || 0,
              });
            }

            // ===== REFERRAL BONUS =====
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("referred_by")
              .eq("user_id", userId)
              .maybeSingle();

            if (userProfile?.referred_by && settings?.referral_commission_percentage) {
              const { data: referrerProfile } = await supabase
                .from("profiles")
                .select("user_id")
                .eq("referral_code", userProfile.referred_by)
                .maybeSingle();

              if (referrerProfile) {
                const referralBonus = amount * (settings.referral_commission_percentage / 100);
                const { data: referrerWallet } = await supabase
                  .from("wallets")
                  .select("fiat_balance")
                  .eq("user_id", referrerProfile.user_id)
                  .single();

                if (referrerWallet) {
                  await supabase.from("wallets").update({
                    fiat_balance: referrerWallet.fiat_balance + referralBonus,
                  }).eq("user_id", referrerProfile.user_id);
                  console.log(`Referral bonus: ${referralBonus} KES to ${referrerProfile.user_id}`);
                }

                const { data: referral } = await supabase
                  .from("referrals")
                  .select("id")
                  .eq("referrer_id", referrerProfile.user_id)
                  .eq("referred_id", userId)
                  .maybeSingle();

                if (referral) {
                  await supabase.from("referral_commissions").insert({
                    referral_id: referral.id,
                    transaction_id: referral.id,
                    amount: referralBonus,
                  });
                }
              }
            }
          }
        }
      }

      // ===== GAS FEE PAYMENT CHECK =====
      if (settings && amount === settings.coin_creation_fee) {
        // Find unpaid coins matching this amount - mark as paid
        const { data: unpaidCoins } = await supabase
          .from("coins")
          .select("id")
          .eq("creation_fee_paid", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (unpaidCoins && unpaidCoins.length > 0) {
          // Mark most recent unpaid coin as paid
          await supabase.from("coins").update({ creation_fee_paid: true }).eq("id", unpaidCoins[0].id);
          console.log(`Gas fee paid for coin ${unpaidCoins[0].id}`);
        }
      }
    } else {
      // Payment failed
      console.log(`Payment failed - ResultCode: ${ResultCode}, ResultDesc: ${ResultDesc}`);
      if (transaction) {
        await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction.id);
      }
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Callback processing error:", error);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
