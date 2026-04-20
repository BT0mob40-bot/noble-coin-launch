import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const priceCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const tokenCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [priceRes, tokenRes] = await Promise.all([
      admin.from("price_history").delete().lt("created_at", priceCutoff).select("id"),
      admin
        .from("password_reset_tokens")
        .delete()
        .or(`used.eq.true,expires_at.lt.${new Date().toISOString()}`)
        .lt("created_at", tokenCutoff)
        .select("id"),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        price_history_deleted: priceRes.data?.length || 0,
        reset_tokens_deleted: tokenRes.data?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
