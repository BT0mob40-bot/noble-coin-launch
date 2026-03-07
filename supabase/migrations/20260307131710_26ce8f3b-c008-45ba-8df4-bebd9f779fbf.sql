-- 1) Ensure pgcrypto is available (needed for random bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2) Fix contract generator to use extensions schema explicitly
CREATE OR REPLACE FUNCTION public.generate_contract_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contract_address IS NULL THEN
    NEW.contract_address := '0x' || encode(extensions.gen_random_bytes(20), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Ensure pricing trigger runs on coin INSERT + UPDATE
DROP TRIGGER IF EXISTS trigger_update_coin_price ON public.coins;
CREATE TRIGGER trigger_update_coin_price
BEFORE INSERT OR UPDATE OF initial_price, bonding_curve_factor, circulating_supply
ON public.coins
FOR EACH ROW
EXECUTE FUNCTION public.update_coin_price();

-- 4) Ensure contract trigger exists
DROP TRIGGER IF EXISTS trigger_generate_contract_address ON public.coins;
CREATE TRIGGER trigger_generate_contract_address
BEFORE INSERT ON public.coins
FOR EACH ROW
EXECUTE FUNCTION public.generate_contract_address();

-- 5) Coin social links
ALTER TABLE public.coins
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS telegram_url text,
  ADD COLUMN IF NOT EXISTS discord_url text;

-- 6) Payment tracking for non-trade STK flows (deposit + coin creation fee)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_request_type') THEN
    CREATE TYPE public.payment_request_type AS ENUM ('deposit', 'coin_creation');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coin_id uuid NULL,
  type public.payment_request_type NOT NULL,
  amount numeric NOT NULL,
  phone text NOT NULL,
  checkout_request_id text NULL,
  merchant_request_id text NULL,
  mpesa_receipt text NULL,
  status text NOT NULL DEFAULT 'pending',
  result_desc text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own payment requests" ON public.payment_requests;
CREATE POLICY "Users can create their own payment requests"
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own payment requests" ON public.payment_requests;
CREATE POLICY "Users can view their own payment requests"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all payment requests" ON public.payment_requests;
CREATE POLICY "Admins can view all payment requests"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role can manage payment requests" ON public.payment_requests;
CREATE POLICY "Service role can manage payment requests"
ON public.payment_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_payment_requests_updated_at ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payment_requests_checkout
  ON public.payment_requests (checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user
  ON public.payment_requests (user_id, created_at DESC);

-- 7) Manual withdrawal approvals + B2C processing queue
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note text NULL,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  checkout_request_id text NULL,
  mpesa_receipt text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can request their own withdrawals" ON public.wallet_withdrawals;
CREATE POLICY "Users can request their own withdrawals"
ON public.wallet_withdrawals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.wallet_withdrawals;
CREATE POLICY "Users can view their own withdrawals"
ON public.wallet_withdrawals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.wallet_withdrawals;
CREATE POLICY "Admins can manage withdrawals"
ON public.wallet_withdrawals
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role can manage withdrawals" ON public.wallet_withdrawals;
CREATE POLICY "Service role can manage withdrawals"
ON public.wallet_withdrawals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_wallet_withdrawals_updated_at ON public.wallet_withdrawals;
CREATE TRIGGER trg_wallet_withdrawals_updated_at
BEFORE UPDATE ON public.wallet_withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user
  ON public.wallet_withdrawals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status
  ON public.wallet_withdrawals (status, created_at DESC);