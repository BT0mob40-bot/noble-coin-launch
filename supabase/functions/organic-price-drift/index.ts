import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Pull active, approved, non-paused coins
    const { data: coins, error } = await admin
      .from("coins")
      .select("id, price, circulating_supply, bonding_curve_factor, initial_price, liquidity, updated_at")
      .eq("is_active", true)
      .eq("is_approved", true)
      .eq("trading_paused", false);

    if (error) throw error;
    if (!coins || coins.length === 0) {
      return new Response(JSON.stringify({ ok: true, drifted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute recent volume (last 30 min) per coin to weight drift
    const sinceVol = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentVol } = await admin
      .from("price_history")
      .select("coin_id, volume")
      .gte("created_at", sinceVol);

    const volMap = new Map<string, number>();
    (recentVol || []).forEach((r: any) => {
      volMap.set(r.coin_id, (volMap.get(r.coin_id) || 0) + Number(r.volume || 0));
    });

    let drifted = 0;
    const inserts: any[] = [];

    for (const c of coins) {
      const idleMs = Date.now() - new Date(c.updated_at).getTime();
      // Skip very recently traded coins (<60s) to keep real moves clean
      if (idleMs < 60_000) continue;

      const vol = volMap.get(c.id) || 0;
      // Active coins drift more (up to 0.5%), idle coins less (~0.1%)
      const activityWeight = Math.min(1, Math.log10(1 + vol) / 4); // 0..1
      const maxPct = 0.001 + activityWeight * 0.004; // 0.1% .. 0.5%
      const pct = (Math.random() * 2 - 1) * maxPct; // signed

      const newPrice = Math.max(0.000001, Number(c.price) * (1 + pct));

      // Synthesize a tiny supply nudge so bonding curve trigger keeps integrity
      // We update price + market_cap directly (trigger only fires on supply change)
      const newMarketCap = newPrice * Number(c.circulating_supply || 0);

      const { error: upErr } = await admin
        .from("coins")
        .update({ price: newPrice, market_cap: newMarketCap })
        .eq("id", c.id);

      if (!upErr) {
        drifted++;
        inserts.push({
          coin_id: c.id,
          price: newPrice,
          volume: 0,
          trade_type: "drift",
        });
      }
    }

    if (inserts.length > 0) {
      await admin.from("price_history").insert(inserts);
    }

    return new Response(JSON.stringify({ ok: true, drifted, total: coins.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
