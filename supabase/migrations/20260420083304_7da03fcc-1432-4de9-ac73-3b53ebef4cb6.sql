-- Atomic trade execution function
CREATE OR REPLACE FUNCTION public.execute_trade(
  _user_id uuid,
  _coin_id uuid,
  _trade_type text,        -- 'buy' or 'sell'
  _amount numeric,
  _use_wallet boolean,     -- buys: true=use fiat wallet, false=external (mpesa already paid)
  _to_wallet boolean       -- sells: true=credit fiat wallet
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coin RECORD;
  v_settings RECORD;
  v_wallet_balance numeric;
  v_holding RECORD;
  v_total_value numeric;
  v_fee numeric;
  v_creator_share numeric;
  v_net_value numeric;
  v_tx_id uuid;
  v_holders_delta integer := 0;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT * INTO v_coin FROM public.coins WHERE id = _coin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coin not found'; END IF;
  IF v_coin.trading_paused THEN RAISE EXCEPTION 'Trading paused for this coin'; END IF;

  SELECT fee_percentage, creator_commission_percentage
    INTO v_settings FROM public.site_settings LIMIT 1;

  v_total_value := _amount * v_coin.price;
  v_fee := v_total_value * (COALESCE(v_settings.fee_percentage, 0) / 100.0);
  v_creator_share := v_total_value * (COALESCE(v_settings.creator_commission_percentage, 0) / 100.0);

  IF _trade_type = 'buy' THEN
    IF _use_wallet THEN
      SELECT fiat_balance INTO v_wallet_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
      IF v_wallet_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
      IF v_wallet_balance < (v_total_value + v_fee) THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
      END IF;
      UPDATE public.wallets SET fiat_balance = fiat_balance - (v_total_value + v_fee) WHERE user_id = _user_id;
    END IF;

    INSERT INTO public.transactions (user_id, coin_id, type, amount, price_per_coin, total_value, status)
      VALUES (_user_id, _coin_id, 'buy', _amount, v_coin.price, v_total_value, 'completed')
      RETURNING id INTO v_tx_id;

    SELECT * INTO v_holding FROM public.holdings WHERE user_id = _user_id AND coin_id = _coin_id FOR UPDATE;
    IF v_holding.id IS NULL THEN
      INSERT INTO public.holdings (user_id, coin_id, amount, average_buy_price)
        VALUES (_user_id, _coin_id, _amount, v_coin.price);
      v_holders_delta := 1;
    ELSE
      UPDATE public.holdings
        SET amount = v_holding.amount + _amount,
            average_buy_price = ((v_holding.amount * v_holding.average_buy_price) + (_amount * v_coin.price)) / (v_holding.amount + _amount),
            updated_at = now()
        WHERE id = v_holding.id;
    END IF;

    UPDATE public.coins
      SET circulating_supply = circulating_supply + _amount,
          liquidity = COALESCE(liquidity, 0) + v_total_value,
          holders_count = GREATEST(0, holders_count + v_holders_delta),
          updated_at = now()
      WHERE id = _coin_id;

  ELSIF _trade_type = 'sell' THEN
    SELECT * INTO v_holding FROM public.holdings WHERE user_id = _user_id AND coin_id = _coin_id FOR UPDATE;
    IF v_holding.id IS NULL OR v_holding.amount < _amount THEN
      RAISE EXCEPTION 'Insufficient coin balance';
    END IF;

    v_net_value := v_total_value - v_fee;

    INSERT INTO public.transactions (user_id, coin_id, type, amount, price_per_coin, total_value, status)
      VALUES (_user_id, _coin_id, 'sell', _amount, v_coin.price, v_total_value, 'completed')
      RETURNING id INTO v_tx_id;

    IF v_holding.amount - _amount <= 0 THEN
      DELETE FROM public.holdings WHERE id = v_holding.id;
      v_holders_delta := -1;
    ELSE
      UPDATE public.holdings SET amount = v_holding.amount - _amount, updated_at = now() WHERE id = v_holding.id;
    END IF;

    UPDATE public.coins
      SET circulating_supply = GREATEST(0, circulating_supply - _amount),
          liquidity = GREATEST(0, COALESCE(liquidity, 0) - v_total_value),
          holders_count = GREATEST(0, holders_count + v_holders_delta),
          updated_at = now()
      WHERE id = _coin_id;

    IF _to_wallet THEN
      INSERT INTO public.wallets (user_id, fiat_balance) VALUES (_user_id, v_net_value)
        ON CONFLICT (user_id) DO UPDATE SET fiat_balance = public.wallets.fiat_balance + v_net_value;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid trade type';
  END IF;

  -- Commission ledger
  IF v_fee > 0 THEN
    INSERT INTO public.commission_transactions (transaction_id, amount, commission_rate)
      VALUES (v_tx_id, v_fee, COALESCE(v_settings.fee_percentage, 0));
  END IF;

  -- Creator share
  IF v_coin.creator_id IS NOT NULL AND v_coin.creator_id <> _user_id AND v_creator_share > 0 THEN
    INSERT INTO public.wallets (user_id, fiat_balance) VALUES (v_coin.creator_id, v_creator_share)
      ON CONFLICT (user_id) DO UPDATE SET fiat_balance = public.wallets.fiat_balance + v_creator_share;
  END IF;

  -- Price history (price reflects post-trade due to bonding curve trigger)
  INSERT INTO public.price_history (coin_id, price, volume, trade_type)
    SELECT id, price, v_total_value, _trade_type FROM public.coins WHERE id = _coin_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id, 'fee', v_fee);
END;
$$;

-- Ensure wallets has unique constraint on user_id for ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_key'
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_price_history_coin_created ON public.price_history(coin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_coin ON public.holdings(coin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_coin_created ON public.transactions(coin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coins_active_approved ON public.coins(is_active, is_approved) WHERE is_active = true;

GRANT EXECUTE ON FUNCTION public.execute_trade(uuid, uuid, text, numeric, boolean, boolean) TO authenticated;