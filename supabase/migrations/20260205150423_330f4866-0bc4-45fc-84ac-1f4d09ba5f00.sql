-- Add coin creation fee (gas fee) setting - adjustable by super admin
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS coin_creation_fee NUMERIC NOT NULL DEFAULT 5000;

-- Add minimum coin buy amount (already exists but ensure it's in sync)
-- Ensure min_buy_amount is used dynamically everywhere

-- Create function to get current base URL dynamically
CREATE OR REPLACE FUNCTION public.get_base_url()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Returns empty string - will be set dynamically from frontend
  RETURN '';
END;
$$;

-- Add referral code caching support with better persistence
-- Update profiles to ensure referral_code exists and is cached
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Create referrals table if not exists
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT referrals_referrer_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create referral_commissions table if not exists  
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on referral_commissions
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- Create policies for referrals (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create policies for referral_commissions
DROP POLICY IF EXISTS "Users can view their own referral commissions" ON public.referral_commissions;
CREATE POLICY "Users can view their own referral commissions" 
ON public.referral_commissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.id = referral_id AND r.referrer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all referral commissions" ON public.referral_commissions;
CREATE POLICY "Admins can view all referral commissions" 
ON public.referral_commissions 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_referral_code ON public.profiles;
CREATE TRIGGER trigger_auto_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Add referral commission percentage to site settings  
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS referral_commission_percentage NUMERIC NOT NULL DEFAULT 5;

-- Add coin approval fields if not exist
ALTER TABLE public.coins
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.coins
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.coins
ADD COLUMN IF NOT EXISTS creation_fee_paid BOOLEAN NOT NULL DEFAULT false;

-- Update RLS for coins - only show approved coins to public
DROP POLICY IF EXISTS "Anyone can view approved active coins" ON public.coins;
CREATE POLICY "Anyone can view approved active coins" 
ON public.coins 
FOR SELECT 
USING (is_active = true AND (is_approved = true OR is_admin(auth.uid())));