import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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
      console.error("Invalid callback structure");
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    console.log(`Callback - CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}, ResultDesc: ${ResultDesc}`);

    // Find the transaction by checkout request ID
    const { data: transaction, error: findError } = await supabase
      .from("transactions")
      .select("*")
      .eq("mpesa_receipt", CheckoutRequestID)
      .maybeSingle();

    if (findError || !transaction) {
      console.error("Transaction not found for CheckoutRequestID:", CheckoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceiptNumber = "";
      let transactionDate = "";
      let phoneNumber = "";

      // Extract callback metadata
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === "MpesaReceiptNumber") {
            mpesaReceiptNumber = item.Value;
          } else if (item.Name === "TransactionDate") {
            transactionDate = String(item.Value);
          } else if (item.Name === "PhoneNumber") {
            phoneNumber = String(item.Value);
          }
        }
      }

      console.log(`Payment successful - Receipt: ${mpesaReceiptNumber}`);

      // Update transaction as completed
      await supabase
        .from("transactions")
        .update({
          status: "completed",
          mpesa_receipt: mpesaReceiptNumber,
        })
        .eq("id", transaction.id);

      // Update or create user holdings
      const { data: existingHolding } = await supabase
        .from("holdings")
        .select("*")
        .eq("user_id", transaction.user_id)
        .eq("coin_id", transaction.coin_id)
        .maybeSingle();

      if (existingHolding) {
        const newAmount = existingHolding.amount + transaction.amount;
        const newAvgPrice = 
          (existingHolding.average_buy_price * existingHolding.amount + transaction.price_per_coin * transaction.amount) / newAmount;

        await supabase
          .from("holdings")
          .update({
            amount: newAmount,
            average_buy_price: newAvgPrice,
          })
          .eq("id", existingHolding.id);
      } else {
        await supabase.from("holdings").insert({
          user_id: transaction.user_id,
          coin_id: transaction.coin_id,
          amount: transaction.amount,
          average_buy_price: transaction.price_per_coin,
        });
      }

      // Update coin circulating supply and holders count
      const { data: coin } = await supabase
        .from("coins")
        .select("circulating_supply, holders_count")
        .eq("id", transaction.coin_id)
        .single();

      if (coin) {
        // Count unique holders
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
      }

      console.log("Holdings updated successfully");
    } else {
      // Payment failed or cancelled
      console.log(`Payment failed - ResultCode: ${ResultCode}, ResultDesc: ${ResultDesc}`);
      
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id);
    }

    // Respond to M-PESA
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
