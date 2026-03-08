
ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS require_email_verification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_phone_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_2fa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_2fa_optional boolean NOT NULL DEFAULT true;

-- Phone verification OTPs table
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTPs" ON public.phone_otps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own OTPs" ON public.phone_otps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own OTPs" ON public.phone_otps FOR UPDATE USING (auth.uid() = user_id);

-- Add phone_verified and 2FA fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret text DEFAULT NULL;
