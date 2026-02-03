-- Create wallets table for fiat balances
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  fiat_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all wallets" ON public.wallets
FOR ALL USING (is_admin(auth.uid()));

-- Trigger to update wallets updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add hero/landing page columns to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT 'Trade Crypto with M-PESA',
ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'The first crypto launchpad designed for Africa. Buy, sell, and launch tokens instantly using M-PESA mobile money.',
ADD COLUMN IF NOT EXISTS hero_badge TEXT DEFAULT 'Next-Gen Crypto Launchpad',
ADD COLUMN IF NOT EXISTS feature_1_title TEXT DEFAULT 'Launch Your Token',
ADD COLUMN IF NOT EXISTS feature_1_description TEXT DEFAULT 'Create and launch your crypto token in minutes with our easy-to-use platform.',
ADD COLUMN IF NOT EXISTS feature_2_title TEXT DEFAULT 'Secure Trading',
ADD COLUMN IF NOT EXISTS feature_2_description TEXT DEFAULT 'Advanced security measures protect your assets and transactions.',
ADD COLUMN IF NOT EXISTS feature_3_title TEXT DEFAULT 'Instant M-PESA',
ADD COLUMN IF NOT EXISTS feature_3_description TEXT DEFAULT 'Buy and sell tokens instantly using M-PESA mobile money.',
ADD COLUMN IF NOT EXISTS feature_4_title TEXT DEFAULT 'Real-Time Prices',
ADD COLUMN IF NOT EXISTS feature_4_description TEXT DEFAULT 'Live price updates and market data for informed trading decisions.',
ADD COLUMN IF NOT EXISTS stats_tokens TEXT DEFAULT '100+',
ADD COLUMN IF NOT EXISTS stats_traders TEXT DEFAULT '50K+',
ADD COLUMN IF NOT EXISTS stats_volume TEXT DEFAULT '$10M+',
ADD COLUMN IF NOT EXISTS stats_uptime TEXT DEFAULT '99.9%',
ADD COLUMN IF NOT EXISTS cta_title TEXT DEFAULT 'Join the Revolution',
ADD COLUMN IF NOT EXISTS cta_subtitle TEXT DEFAULT 'Start trading crypto today with the easiest mobile money integration in Africa.',
ADD COLUMN IF NOT EXISTS admin_commission NUMERIC NOT NULL DEFAULT 2.5;

-- Create commission_transactions table to track admin earnings
CREATE TABLE public.commission_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins can view commission transactions
CREATE POLICY "Admins can view commission transactions" ON public.commission_transactions
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage commissions" ON public.commission_transactions
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add bonding curve columns to coins
ALTER TABLE public.coins
ADD COLUMN IF NOT EXISTS initial_price NUMERIC NOT NULL DEFAULT 0.001,
ADD COLUMN IF NOT EXISTS bonding_curve_factor NUMERIC NOT NULL DEFAULT 0.00001,
ADD COLUMN IF NOT EXISTS burned_supply NUMERIC NOT NULL DEFAULT 0;

-- Function to calculate price based on bonding curve
CREATE OR REPLACE FUNCTION public.calculate_bonding_price(
  _initial_price NUMERIC,
  _bonding_factor NUMERIC,
  _circulating_supply NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Bonding curve formula: price = initial_price * (1 + bonding_factor * circulating_supply)
  RETURN _initial_price * (1 + _bonding_factor * _circulating_supply);
END;
$$;

-- Function to update price when supply changes
CREATE OR REPLACE FUNCTION public.update_coin_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.price := calculate_bonding_price(NEW.initial_price, NEW.bonding_curve_factor, NEW.circulating_supply);
  NEW.market_cap := NEW.price * NEW.circulating_supply;
  RETURN NEW;
END;
$$;

-- Trigger to automatically update price when circulating_supply changes
CREATE TRIGGER update_coin_price_trigger
BEFORE UPDATE OF circulating_supply ON public.coins
FOR EACH ROW
EXECUTE FUNCTION public.update_coin_price();

-- Update handle_new_user to also create wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create wallet
  INSERT INTO public.wallets (user_id, fiat_balance)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;