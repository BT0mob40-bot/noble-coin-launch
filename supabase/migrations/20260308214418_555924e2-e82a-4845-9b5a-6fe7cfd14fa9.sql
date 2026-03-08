
-- Coin override columns for admin
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS market_cap_override numeric DEFAULT NULL;
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS liquidity_override numeric DEFAULT NULL;
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS holders_override integer DEFAULT NULL;
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS use_market_cap_override boolean NOT NULL DEFAULT false;
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS use_liquidity_override boolean NOT NULL DEFAULT false;
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS use_holders_override boolean NOT NULL DEFAULT false;

-- Blocked words for coin creation
CREATE TABLE IF NOT EXISTS public.blocked_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blocked words" ON public.blocked_words FOR SELECT USING (true);
CREATE POLICY "Super admins can manage blocked words" ON public.blocked_words FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Telegram bot config
CREATE TABLE IF NOT EXISTS public.telegram_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  chat_id text,
  bot_username text,
  webhook_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view telegram config" ON public.telegram_config FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage telegram config" ON public.telegram_config FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Ensure triggers exist on coins table
DROP TRIGGER IF EXISTS trigger_generate_contract_address ON public.coins;
CREATE TRIGGER trigger_generate_contract_address BEFORE INSERT ON public.coins FOR EACH ROW EXECUTE FUNCTION generate_contract_address();

DROP TRIGGER IF EXISTS trigger_update_coin_price ON public.coins;
CREATE TRIGGER trigger_update_coin_price BEFORE INSERT OR UPDATE ON public.coins FOR EACH ROW EXECUTE FUNCTION update_coin_price();
