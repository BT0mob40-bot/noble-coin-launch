
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS sell_pressure_multiplier numeric NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS buy_slippage_percentage numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS sell_slippage_percentage numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS max_buy_supply_percentage numeric NOT NULL DEFAULT 25;

CREATE OR REPLACE FUNCTION public.update_coin_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_skip text;
BEGIN
  BEGIN
    v_skip := current_setting('app.skip_price_trigger', true);
  EXCEPTION WHEN OTHERS THEN
    v_skip := NULL;
  END;
  IF v_skip = '1' THEN
    RETURN NEW;
  END IF;
  NEW.price := calculate_bonding_price(NEW.initial_price, NEW.bonding_curve_factor, NEW.circulating_supply);
  NEW.market_cap := NEW.price * NEW.circulating_supply;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_trade(_user_id uuid, _coin_id uuid, _trade_type text, _amount numeric, _use_wallet boolean, _to_wallet boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coin RECORD;
  v_settings RECORD;
  v_wallet_balance numeric;
  v_holding RECORD;
  v_base_price numeric;
  v_exec_price numeric;
  v_total_value numeric;
  v_fee numeric;
  v_creator_share numeric;
  v_net_value numeric;
  v_tx_id uuid;
  v_holders_delta integer := 0;
  v_remaining_supply numeric;
  v_max_buy numeric;
  v_new_circ numeric;
  v_new_base_price numeric;
  v_pressure_factor numeric;
  v_final_price numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Trade amount must be greater than zero';
  END IF;
  IF _trade_type NOT IN ('buy','sell') THEN
    RAISE EXCEPTION 'Invalid trade type';
  END IF;

  SELECT * INTO v_coin FROM public.coins WHERE id = _coin_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coin not found'; END IF;
  IF v_coin.trading_paused THEN RAISE EXCEPTION 'Trading paused for this coin'; END IF;

  SELECT fee_percentage, creator_commission_percentage,
         COALESCE(sell_pressure_multiplier, 1.5)   AS sell_pressure_multiplier,
         COALESCE(buy_slippage_percentage, 0.5)    AS buy_slippage_percentage,
         COALESCE(sell_slippage_percentage, 1.0)   AS sell_slippage_percentage,
         COALESCE(max_buy_supply_percentage, 25)   AS max_buy_supply_percentage
    INTO v_settings FROM public.site_settings LIMIT 1;

  v_base_price := v_coin.price;

  IF _trade_type = 'buy' THEN
    v_remaining_supply := GREATEST(0, COALESCE(v_coin.total_supply, 0) - COALESCE(v_coin.circulating_supply, 0));
    IF v_remaining_supply <= 0 THEN
      RAISE EXCEPTION 'No remaining supply available for purchase';
    END IF;
    IF _amount > v_remaining_supply THEN
      RAISE EXCEPTION 'Requested amount exceeds remaining supply (% available)', v_remaining_supply;
    END IF;
    v_max_buy := v_remaining_supply * (v_settings.max_buy_supply_percentage / 100.0);
    IF v_max_buy > 0 AND _amount > v_max_buy THEN
      RAISE EXCEPTION 'Single trade limited to % percent of remaining supply (max %)',
        v_settings.max_buy_supply_percentage, v_max_buy;
    END IF;

    v_exec_price := v_base_price * (1 + v_settings.buy_slippage_percentage / 100.0);
    v_total_value := _amount * v_exec_price;
    v_fee := v_total_value * (COALESCE(v_settings.fee_percentage, 0) / 100.0);
    v_creator_share := v_total_value * (COALESCE(v_settings.creator_commission_percentage, 0) / 100.0);

    IF _use_wallet THEN
      SELECT fiat_balance INTO v_wallet_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
      IF v_wallet_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
      IF v_wallet_balance < (v_total_value + v_fee) THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
      END IF;
      UPDATE public.wallets SET fiat_balance = fiat_balance - (v_total_value + v_fee) WHERE user_id = _user_id;
    END IF;

    INSERT INTO public.transactions (user_id, coin_id, type, amount, price_per_coin, total_value, status)
      VALUES (_user_id, _coin_id, 'buy', _amount, v_exec_price, v_total_value, 'completed')
      RETURNING id INTO v_tx_id;

    SELECT * INTO v_holding FROM public.holdings WHERE user_id = _user_id AND coin_id = _coin_id FOR UPDATE;
    IF v_holding.id IS NULL THEN
      INSERT INTO public.holdings (user_id, coin_id, amount, average_buy_price)
        VALUES (_user_id, _coin_id, _amount, v_exec_price);
      v_holders_delta := 1;
    ELSE
      UPDATE public.holdings
        SET amount = v_holding.amount + _amount,
            average_buy_price = ((v_holding.amount * v_holding.average_buy_price) + (_amount * v_exec_price)) / (v_holding.amount + _amount),
            updated_at = now()
        WHERE id = v_holding.id;
    END IF;

    v_new_circ := v_coin.circulating_supply + _amount;
    v_new_base_price := public.calculate_bonding_price(v_coin.initial_price, v_coin.bonding_curve_factor, v_new_circ);
    v_final_price := v_new_base_price;

  ELSE
    SELECT * INTO v_holding FROM public.holdings WHERE user_id = _user_id AND coin_id = _coin_id FOR UPDATE;
    IF v_holding.id IS NULL OR v_holding.amount < _amount THEN
      RAISE EXCEPTION 'Insufficient coin balance';
    END IF;
    IF _amount > v_coin.circulating_supply THEN
      RAISE EXCEPTION 'Sell amount exceeds circulating supply';
    END IF;

    v_exec_price := v_base_price * GREATEST(0, 1 - v_settings.sell_slippage_percentage / 100.0);
    v_total_value := _amount * v_exec_price;
    v_fee := v_total_value * (COALESCE(v_settings.fee_percentage, 0) / 100.0);
    v_creator_share := v_total_value * (COALESCE(v_settings.creator_commission_percentage, 0) / 100.0);
    v_net_value := GREATEST(0, v_total_value - v_fee);

    INSERT INTO public.transactions (user_id, coin_id, type, amount, price_per_coin, total_value, status)
      VALUES (_user_id, _coin_id, 'sell', _amount, v_exec_price, v_total_value, 'completed')
      RETURNING id INTO v_tx_id;

    IF v_holding.amount - _amount <= 0 THEN
      DELETE FROM public.holdings WHERE id = v_holding.id;
      v_holders_delta := -1;
    ELSE
      UPDATE public.holdings SET amount = v_holding.amount - _amount, updated_at = now() WHERE id = v_holding.id;
    END IF;

    IF _to_wallet THEN
      INSERT INTO public.wallets (user_id, fiat_balance) VALUES (_user_id, v_net_value)
        ON CONFLICT (user_id) DO UPDATE SET fiat_balance = public.wallets.fiat_balance + v_net_value;
    END IF;

    v_new_circ := GREATEST(0, v_coin.circulating_supply - _amount);
    v_new_base_price := public.calculate_bonding_price(v_coin.initial_price, v_coin.bonding_curve_factor, v_new_circ);

    v_pressure_factor := LEAST(0.5,
      v_settings.sell_pressure_multiplier *
      (_amount / GREATEST(v_coin.circulating_supply, 1)));
    v_final_price := GREATEST(v_coin.initial_price * 0.01, v_new_base_price * (1 - v_pressure_factor));
  END IF;

  PERFORM set_config('app.skip_price_trigger', '1', true);
  UPDATE public.coins
    SET circulating_supply = v_new_circ,
        price = v_final_price,
        market_cap = v_final_price * v_new_circ,
        liquidity = CASE WHEN _trade_type = 'buy'
                         THEN COALESCE(liquidity, 0) + v_total_value
                         ELSE GREATEST(0, COALESCE(liquidity, 0) - v_total_value) END,
        holders_count = GREATEST(0, holders_count + v_holders_delta),
        updated_at = now()
    WHERE id = _coin_id;
  PERFORM set_config('app.skip_price_trigger', '0', true);

  IF v_fee > 0 THEN
    INSERT INTO public.commission_transactions (transaction_id, amount, commission_rate)
      VALUES (v_tx_id, v_fee, COALESCE(v_settings.fee_percentage, 0));
  END IF;

  IF v_coin.creator_id IS NOT NULL AND v_coin.creator_id <> _user_id AND v_creator_share > 0 THEN
    INSERT INTO public.wallets (user_id, fiat_balance) VALUES (v_coin.creator_id, v_creator_share)
      ON CONFLICT (user_id) DO UPDATE SET fiat_balance = public.wallets.fiat_balance + v_creator_share;
  END IF;

  INSERT INTO public.price_history (coin_id, price, volume, trade_type)
    VALUES (_coin_id, v_final_price, v_total_value, _trade_type);

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', v_tx_id,
    'executed_price', v_exec_price,
    'new_market_price', v_final_price,
    'fee', v_fee
  );
END;
$$;

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
  v_remaining_supply numeric;
  v_new_circ numeric;
  v_new_base_price numeric;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Transaction not found'); END IF;

  IF v_tx.status = 'completed' THEN
    IF _mpesa_receipt IS NOT NULL AND _mpesa_receipt <> '' AND COALESCE(v_tx.mpesa_receipt, '') <> _mpesa_receipt THEN
      UPDATE public.transactions
        SET mpesa_receipt = _mpesa_receipt, updated_at = now()
        WHERE id = _transaction_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'already_completed', true);
  END IF;

  SELECT * INTO v_coin FROM public.coins WHERE id = v_tx.coin_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Coin not found'); END IF;

  v_remaining_supply := GREATEST(0, COALESCE(v_coin.total_supply, 0) - COALESCE(v_coin.circulating_supply, 0));
  IF v_tx.amount > v_remaining_supply THEN
    UPDATE public.transactions
      SET status = 'failed',
          mpesa_receipt = COALESCE(NULLIF(_mpesa_receipt, ''), mpesa_receipt),
          updated_at = now()
      WHERE id = _transaction_id;
    RETURN jsonb_build_object('ok', false, 'error', 'Coin supply exhausted');
  END IF;

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

  v_new_circ := v_coin.circulating_supply + v_tx.amount;
  v_new_base_price := public.calculate_bonding_price(v_coin.initial_price, v_coin.bonding_curve_factor, v_new_circ);

  PERFORM set_config('app.skip_price_trigger', '1', true);
  UPDATE public.coins
    SET circulating_supply = v_new_circ,
        price = v_new_base_price,
        market_cap = v_new_base_price * v_new_circ,
        liquidity = COALESCE(liquidity, 0) + v_tx.total_value,
        holders_count = v_holders_count,
        updated_at = now()
    WHERE id = v_tx.coin_id;
  PERFORM set_config('app.skip_price_trigger', '0', true);

  INSERT INTO public.price_history (coin_id, price, volume, trade_type)
    VALUES (v_tx.coin_id, v_new_base_price, v_tx.total_value, 'buy');

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

  RETURN jsonb_build_object('ok', true, 'allocated', v_tx.amount, 'new_market_price', v_new_base_price);
END;
$$;
