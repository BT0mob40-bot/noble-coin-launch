CREATE TABLE IF NOT EXISTS public.email_login_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  code_hash text NOT NULL,
  token_hash text NOT NULL,
  origin text,
  attempts integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_login_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_login_otps_email_active
  ON public.email_login_otps (lower(email), expires_at DESC)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_requests_fast_status
  ON public.payment_requests (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_checkout
  ON public.payment_requests (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_fast_status
  ON public.transactions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_checkout
  ON public.transactions (mpesa_receipt) WHERE mpesa_receipt IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_merchant
  ON public.transactions (merchant_request_id) WHERE merchant_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status_created
  ON public.wallet_withdrawals (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals (referrer_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_one_referred
  ON public.referrals (referred_id);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referral
  ON public.referral_commissions (referral_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.bootstrap_user_record(
  _user_id uuid,
  _email text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _referral_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(trim(coalesce(_referral_code, '')));
  v_referrer_id uuid;
  v_referral_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user id';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, phone)
  VALUES (_user_id, _email, NULLIF(_full_name, ''), NULLIF(_phone, ''))
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.wallets (user_id, fiat_balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_code <> '' THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_code
    LIMIT 1;

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> _user_id THEN
      UPDATE public.profiles
      SET referred_by = COALESCE(NULLIF(referred_by, ''), v_code),
          updated_at = now()
      WHERE user_id = _user_id;

      INSERT INTO public.referrals (referrer_id, referred_id)
      VALUES (v_referrer_id, _user_id)
      ON CONFLICT (referred_id) DO NOTHING
      RETURNING id INTO v_referral_id;

      IF v_referral_id IS NULL THEN
        SELECT id INTO v_referral_id FROM public.referrals WHERE referred_id = _user_id LIMIT 1;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_id', v_referral_id, 'referrer_id', v_referrer_id);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_user_record(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_record(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap(
  _referral_code text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN public.bootstrap_user_record(v_user_id, v_email, _full_name, _phone, _referral_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_referral(_referral_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_code text := upper(trim(coalesce(_referral_code, '')));
  v_referrer_id uuid;
  v_existing_code text;
  v_referral_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.ensure_user_bootstrap(NULL, NULL, NULL);

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

CREATE OR REPLACE FUNCTION public.reject_non_market_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trade_type IS NULL OR NEW.trade_type NOT IN ('buy', 'sell') THEN
    RAISE EXCEPTION 'Only verified market buy/sell trades can be charted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_non_market_price_history ON public.price_history;
CREATE TRIGGER trg_reject_non_market_price_history
BEFORE INSERT OR UPDATE ON public.price_history
FOR EACH ROW
EXECUTE FUNCTION public.reject_non_market_price_history();

DROP POLICY IF EXISTS "Authenticated users can insert price history" ON public.price_history;
DROP POLICY IF EXISTS "Edge functions can insert price history" ON public.price_history;
CREATE POLICY "Only verified market engine can insert price history"
ON public.price_history
FOR INSERT
WITH CHECK (((auth.jwt() ->> 'role') = 'service_role') AND trade_type IN ('buy', 'sell'));
