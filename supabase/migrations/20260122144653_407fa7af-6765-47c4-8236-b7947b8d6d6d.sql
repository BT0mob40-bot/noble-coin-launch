-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'coin_creator', 'user', 'banned');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create coins table
CREATE TABLE public.coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  whitepaper_url TEXT,
  price DECIMAL(20, 10) NOT NULL DEFAULT 0.001,
  total_supply DECIMAL(30, 10) NOT NULL DEFAULT 1000000000,
  circulating_supply DECIMAL(30, 10) NOT NULL DEFAULT 0,
  market_cap DECIMAL(30, 2) GENERATED ALWAYS AS (price * circulating_supply) STORED,
  liquidity DECIMAL(20, 10) NOT NULL DEFAULT 0,
  holders_count INTEGER NOT NULL DEFAULT 0,
  volatility DECIMAL(5, 2) NOT NULL DEFAULT 5.0,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trading_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create holdings table (user coin balances)
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id UUID NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
  amount DECIMAL(30, 10) NOT NULL DEFAULT 0,
  average_buy_price DECIMAL(20, 10) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, coin_id)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id UUID NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'allocation', 'burn')),
  amount DECIMAL(30, 10) NOT NULL,
  price_per_coin DECIMAL(20, 10) NOT NULL,
  total_value DECIMAL(20, 2) NOT NULL,
  phone TEXT,
  mpesa_receipt TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create mpesa_config table for admin settings
CREATE TABLE public.mpesa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paybill_number TEXT NOT NULL,
  passkey TEXT,
  consumer_key TEXT,
  consumer_secret TEXT,
  callback_url TEXT,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create site_settings table
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'CryptoLaunch',
  site_description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00d4ff',
  min_buy_amount DECIMAL(10, 2) NOT NULL DEFAULT 100,
  max_buy_amount DECIMAL(10, 2) NOT NULL DEFAULT 100000,
  fee_percentage DECIMAL(5, 2) NOT NULL DEFAULT 2.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coins_updated_at BEFORE UPDATE ON public.coins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mpesa_config_updated_at BEFORE UPDATE ON public.mpesa_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for coins
CREATE POLICY "Anyone can view active coins" ON public.coins FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all coins" ON public.coins FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can create coins" ON public.coins FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update coins" ON public.coins FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admins can delete coins" ON public.coins FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for holdings
CREATE POLICY "Users can view their own holdings" ON public.holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own holdings" ON public.holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own holdings" ON public.holdings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all holdings" ON public.holdings FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage all holdings" ON public.holdings FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for mpesa_config (admin only)
CREATE POLICY "Admins can view mpesa config" ON public.mpesa_config FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admins can manage mpesa config" ON public.mpesa_config FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for site_settings
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Super admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert default site settings
INSERT INTO public.site_settings (site_name, site_description) VALUES ('CryptoLaunch', 'The Next-Gen Crypto Launchpad Platform');

-- Enable realtime for coins and holdings
ALTER PUBLICATION supabase_realtime ADD TABLE public.coins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.holdings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;