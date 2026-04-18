import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ ok: false, error: "Server configuration error" });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    const { token, password } = await req.json().catch(() => ({}));
    if (!token || !password) {
      return jsonResponse({ ok: false, error: "Missing token or password" });
    }
    if (String(password).length < 6) {
      return jsonResponse({ ok: false, error: "Password must be at least 6 characters" });
    }

    // Look up token
    const { data: row, error: lookupErr } = await admin
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (lookupErr) return jsonResponse({ ok: false, error: lookupErr.message });
    if (!row) return jsonResponse({ ok: false, error: "Invalid or expired reset link" });
    if (row.used) return jsonResponse({ ok: false, error: "This reset link has already been used" });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return jsonResponse({ ok: false, error: "This reset link has expired. Please request a new one." });
    }

    // Update the user's password
    const { error: updErr } = await admin.auth.admin.updateUserById(row.user_id, { password });
    if (updErr) return jsonResponse({ ok: false, error: "Password update failed: " + updErr.message });

    // Mark token used
    await admin.from("password_reset_tokens").update({ used: true }).eq("id", row.id);

    return jsonResponse({ ok: true, success: true });
  } catch (e: any) {
    console.error("reset-password-confirm fatal:", e);
    return jsonResponse({ ok: false, error: e?.message || String(e) });
  }
});
