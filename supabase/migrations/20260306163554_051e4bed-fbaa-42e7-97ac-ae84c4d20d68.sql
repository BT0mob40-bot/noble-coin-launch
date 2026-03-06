
-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Add social links and SEO fields to site_settings
ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS twitter_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_verification_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_keywords text DEFAULT '',
  ADD COLUMN IF NOT EXISTS creator_commission_percentage numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deposit_fee_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withdrawal_fee_percentage numeric NOT NULL DEFAULT 0;

-- Fix: Allow any authenticated user to INSERT coins (for coin creation flow)
CREATE POLICY "Authenticated users can create coins"
ON public.coins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Ensure wallets are auto-created: add INSERT policy for users
CREATE POLICY "Users can create their own wallet"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
