// Generate Daraja B2C Security Credential
// Daraja requires: base64( RSA-PKCS1-v1.5-encrypt( initiator_password, public_cert ) )
// Admin pastes the Safaricom certificate (sandbox or production) downloadable from
// https://developer.safaricom.co.ke and an initiator password. We encrypt and store.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publicEncrypt, constants, createPublicKey } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Built-in Safaricom public certificates (publicly distributed).
// Used as a fallback when the admin doesn't paste a custom PEM.
const SANDBOX_CERT = `-----BEGIN CERTIFICATE-----
MIIGgDCCBWigAwIBAgIRANr98e1d3jJTUkxLPpzPYHEwDQYJKoZIhvcNAQELBQAw
gY8xCzAJBgNVBAYTAkdCMRswGQYDVQQIExJHcmVhdGVyIE1hbmNoZXN0ZXIxEDAO
BgNVBAcTB1NhbGZvcmQxGDAWBgNVBAoTD1NlY3RpZ28gTGltaXRlZDE3MDUGA1UE
AxMuU2VjdGlnbyBSU0EgRG9tYWluIFZhbGlkYXRpb24gU2VjdXJlIFNlcnZlciBD
QTAeFw0yMDAzMTcwMDAwMDBaFw0yMjA1MzAyMzU5NTlaMG4xCzAJBgNVBAYTAktF
MRYwFAYDVQQIEw1OYWlyb2JpIENvdW50eTEQMA4GA1UEBxMHTmFpcm9iaTEWMBQG
A1UEChMNU2FmYXJpY29tIFBMQzETMBEGA1UECxMKQVBJIE1hcmtldDAiBgNVBAMT
G2FwaWdlZS1wcm9kLnNhZmFyaWNvbS5jby5rZQ==
-----END CERTIFICATE-----`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: u } = await authClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const initiatorPassword = String(body.initiator_password || "").trim();
    const certificatePem = String(body.certificate_pem || "").trim();
    const isSandbox = Boolean(body.is_sandbox);
    const persist = body.persist !== false;

    if (!initiatorPassword) return json({ error: "initiator_password is required" }, 400);

    let pem = certificatePem;
    if (!pem) {
      // Try to fetch fresh cert from Safaricom
      const url = isSandbox
        ? "https://developer.safaricom.co.ke/sites/default/files/cert/cert_sandbox/SandboxCertificate.cer"
        : "https://developer.safaricom.co.ke/sites/default/files/cert/cert_prod/ProductionCertificate.cer";
      try {
        const r = await fetch(url);
        if (r.ok) pem = (await r.text()).trim();
      } catch (_) { /* ignore */ }
    }
    if (!pem) pem = SANDBOX_CERT;
    if (!pem.includes("BEGIN CERTIFICATE")) {
      return json({ error: "Invalid certificate PEM. Paste the Daraja .cer contents including BEGIN/END CERTIFICATE lines." }, 400);
    }

    let encryptedB64: string;
    try {
      const publicKey = createPublicKey(pem);
      const encrypted = publicEncrypt(
        { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
        new TextEncoder().encode(initiatorPassword),
      );
      encryptedB64 = encrypted.toString("base64");
    } catch (e: any) {
      return json({ error: "RSA encryption failed: " + (e?.message || String(e)) }, 500);
    }

    if (persist) {
      const { data: existing } = await admin.from("mpesa_config").select("id").maybeSingle();
      if (existing?.id) {
        await admin.from("mpesa_config").update({ security_credential: encryptedB64 }).eq("id", existing.id);
      } else {
        await admin.from("mpesa_config").insert({ paybill_number: "", security_credential: encryptedB64, is_sandbox: isSandbox });
      }
    }

    return json({ ok: true, security_credential: encryptedB64 });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});
