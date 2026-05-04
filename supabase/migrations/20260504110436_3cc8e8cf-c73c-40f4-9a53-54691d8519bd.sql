-- Performance monitoring metrics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  metric_type text NOT NULL,
  route text NULL,
  endpoint text NULL,
  duration_ms integer NOT NULL,
  status_code integer NULL,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT performance_metrics_type_check CHECK (metric_type IN ('page_load', 'api_latency', 'stk_latency')),
  CONSTRAINT performance_metrics_duration_check CHECK (duration_ms >= 0 AND duration_ms <= 600000)
);

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record safe performance metrics" ON public.performance_metrics;
CREATE POLICY "Anyone can record safe performance metrics"
ON public.performance_metrics
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view performance metrics" ON public.performance_metrics;
CREATE POLICY "Admins can view performance metrics"
ON public.performance_metrics
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_type
  ON public.performance_metrics (created_at DESC, metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint_created
  ON public.performance_metrics (endpoint, created_at DESC)
  WHERE endpoint IS NOT NULL;

-- Faster payment status matching
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_receipt_status
  ON public.transactions (mpesa_receipt, status)
  WHERE mpesa_receipt IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_status_created
  ON public.transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_checkout_status
  ON public.payment_requests (checkout_request_id, status)
  WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_referred
  ON public.referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referral_tx
  ON public.referral_commissions (referral_id, transaction_id);

-- Server-validated referral claim: client cannot choose arbitrary rewards.
CREATE OR REPLACE FUNCTION public.claim_referral(_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(_referral_code, '')));
  v_referrer_id uuid;
  v_existing_code text;
  v_referral_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_code');
  END IF;

  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = v_code
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_referrer');
  END IF;

  SELECT referred_by INTO v_existing_code
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_existing_code IS NOT NULL AND length(trim(v_existing_code)) > 0 THEN
    SELECT id INTO v_referral_id FROM public.referrals WHERE referred_id = v_user_id LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'already_claimed', true, 'referral_id', v_referral_id);
  END IF;

  UPDATE public.profiles
  SET referred_by = v_code,
      updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.referrals (referrer_id, referred_id)
  VALUES (v_referrer_id, v_user_id)
  ON CONFLICT (referred_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    SELECT id INTO v_referral_id FROM public.referrals WHERE referred_id = v_user_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_id', v_referral_id, 'referrer_id', v_referrer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

-- Idempotent buy allocation: never allocate twice if query and callback both succeed.
CREATE OR REPLACE FUNCTION public.complete_mpesa_buy(_transaction_id uuid, _mpesa_receipt text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_coin RECORD;
  v_settings RECORD;
  v_holding RECORD;
  v_holders_delta integer := 0;
  v_creator_share numeric;
  v_holders_count integer;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Transaction not found'); END IF;

  IF v_tx.status = 'completed' THEN
    IF _mpesa_receipt IS NOT NULL AND _mpesa_receipt <> '' AND COALESCE(v_tx.mpesa_receipt, '') <> _mpesa_receipt THEN
      UPDATE public.transactions
      SET mpesa_receipt = _mpesa_receipt,
          updated_at = now()
      WHERE id = _transaction_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'already_completed', true);
  END IF;

  SELECT * INTO v_coin FROM public.coins WHERE id = v_tx.coin_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Coin not found'); END IF;

  SELECT fee_percentage, creator_commission_percentage INTO v_settings
    FROM public.site_settings LIMIT 1;

  UPDATE public.transactions
    SET status = 'completed',
        mpesa_receipt = COALESCE(NULLIF(_mpesa_receipt, ''), mpesa_receipt),
        updated_at = now()
    WHERE id = _transaction_id;

  SELECT * INTO v_holding FROM public.holdings 
    WHERE user_id = v_tx.user_id AND coin_id = v_tx.coin_id FOR UPDATE;

  IF v_holding.id IS NULL THEN
    INSERT INTO public.holdings (user_id, coin_id, amount, average_buy_price)
      VALUES (v_tx.user_id, v_tx.coin_id, v_tx.amount, v_tx.price_per_coin);
    v_holders_delta := 1;
  ELSE
    UPDATE public.holdings
      SET amount = v_holding.amount + v_tx.amount,
          average_buy_price = ((v_holding.amount * v_holding.average_buy_price) 
            + (v_tx.amount * v_tx.price_per_coin)) / (v_holding.amount + v_tx.amount),
          updated_at = now()
      WHERE id = v_holding.id;
  END IF;

  SELECT count(*) INTO v_holders_count FROM public.holdings 
    WHERE coin_id = v_tx.coin_id AND amount > 0;

  UPDATE public.coins
    SET circulating_supply = circulating_supply + v_tx.amount,
        liquidity = COALESCE(liquidity, 0) + v_tx.total_value,
        holders_count = v_holders_count,
        updated_at = now()
    WHERE id = v_tx.coin_id;

  INSERT INTO public.price_history (coin_id, price, volume, trade_type)
    SELECT id, price, v_tx.total_value, 'buy' FROM public.coins WHERE id = v_tx.coin_id;

  IF COALESCE(v_settings.fee_percentage, 0) > 0 THEN
    INSERT INTO public.commission_transactions (transaction_id, amount, commission_rate)
      VALUES (_transaction_id, v_tx.total_value * (v_settings.fee_percentage / 100.0), v_settings.fee_percentage);
  END IF;

  IF v_coin.creator_id IS NOT NULL 
     AND v_coin.creator_id <> v_tx.user_id 
     AND COALESCE(v_settings.creator_commission_percentage, 0) > 0 THEN
    v_creator_share := v_tx.total_value * (v_settings.creator_commission_percentage / 100.0);
    INSERT INTO public.wallets (user_id, fiat_balance) 
      VALUES (v_coin.creator_id, v_creator_share)
      ON CONFLICT (user_id) DO UPDATE 
        SET fiat_balance = public.wallets.fiat_balance + v_creator_share;
  END IF;

  RETURN jsonb_build_object('ok', true, 'allocated', v_tx.amount);
END;
$$;

-- Deposit completion credits wallet, referral wallet, and referral dashboard exactly once.
CREATE OR REPLACE FUNCTION public.complete_mpesa_deposit(_payment_request_id uuid, _mpesa_receipt text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pr RECORD;
  v_settings RECORD;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  v_referrer_id uuid;
  v_referral_id uuid;
  v_referral_bonus numeric;
  v_referred_by text;
BEGIN
  SELECT * INTO v_pr FROM public.payment_requests WHERE id = _payment_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Payment request not found'); END IF;
  IF v_pr.status = 'completed' THEN
    IF _mpesa_receipt IS NOT NULL AND _mpesa_receipt <> '' AND COALESCE(v_pr.mpesa_receipt, '') <> _mpesa_receipt THEN
      UPDATE public.payment_requests SET mpesa_receipt = _mpesa_receipt, updated_at = now() WHERE id = _payment_request_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'already_completed', true);
  END IF;

  SELECT deposit_fee_percentage, referral_commission_percentage INTO v_settings
    FROM public.site_settings LIMIT 1;

  UPDATE public.payment_requests
    SET status = 'completed',
        mpesa_receipt = COALESCE(NULLIF(_mpesa_receipt, ''), mpesa_receipt),
        result_desc = 'success',
        updated_at = now()
    WHERE id = _payment_request_id;

  IF v_pr.type = 'coin_creation' AND v_pr.coin_id IS NOT NULL THEN
    UPDATE public.coins SET creation_fee_paid = true 
      WHERE id = v_pr.coin_id AND creator_id = v_pr.user_id;
    RETURN jsonb_build_object('ok', true, 'type', 'coin_creation');
  END IF;

  IF v_pr.type = 'deposit' THEN
    v_gross := v_pr.amount;
    v_fee := v_gross * (COALESCE(v_settings.deposit_fee_percentage, 0) / 100.0);
    v_net := GREATEST(0, v_gross - v_fee);

    INSERT INTO public.wallets (user_id, fiat_balance) VALUES (v_pr.user_id, v_net)
      ON CONFLICT (user_id) DO UPDATE 
        SET fiat_balance = public.wallets.fiat_balance + v_net;

    IF v_fee > 0 THEN
      INSERT INTO public.commission_transactions (amount, commission_rate)
        VALUES (v_fee, COALESCE(v_settings.deposit_fee_percentage, 0));
    END IF;

    IF COALESCE(v_settings.referral_commission_percentage, 0) > 0 THEN
      SELECT p1.referred_by, p2.user_id INTO v_referred_by, v_referrer_id
        FROM public.profiles p1
        JOIN public.profiles p2 ON p2.referral_code = p1.referred_by
        WHERE p1.user_id = v_pr.user_id
        LIMIT 1;

      IF v_referrer_id IS NOT NULL AND v_referrer_id <> v_pr.user_id THEN
        INSERT INTO public.referrals (referrer_id, referred_id)
        VALUES (v_referrer_id, v_pr.user_id)
        ON CONFLICT (referred_id) DO NOTHING
        RETURNING id INTO v_referral_id;

        IF v_referral_id IS NULL THEN
          SELECT id INTO v_referral_id
          FROM public.referrals
          WHERE referred_id = v_pr.user_id
          LIMIT 1;
        END IF;

        IF v_referral_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.referral_commissions
          WHERE referral_id = v_referral_id AND transaction_id = _payment_request_id
        ) THEN
          v_referral_bonus := v_gross * (v_settings.referral_commission_percentage / 100.0);
          INSERT INTO public.referral_commissions (referral_id, transaction_id, amount)
          VALUES (v_referral_id, _payment_request_id, v_referral_bonus);

          INSERT INTO public.wallets (user_id, fiat_balance) VALUES (v_referrer_id, v_referral_bonus)
            ON CONFLICT (user_id) DO UPDATE 
              SET fiat_balance = public.wallets.fiat_balance + v_referral_bonus;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'type', v_pr.type);
END;
$$;