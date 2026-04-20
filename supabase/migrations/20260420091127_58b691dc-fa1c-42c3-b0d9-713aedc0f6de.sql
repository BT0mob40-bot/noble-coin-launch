CREATE OR REPLACE FUNCTION public.complete_mpesa_buy(
  _transaction_id uuid,
  _mpesa_receipt text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SELECT * INTO v_tx FROM transactions WHERE id = _transaction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Transaction not found'); END IF;

  IF v_tx.status = 'completed' AND v_tx.mpesa_receipt IS NOT NULL AND v_tx.mpesa_receipt NOT LIKE 'ws_CO_%' THEN
    RETURN jsonb_build_object('ok', true, 'already_completed', true);
  END IF;

  SELECT * INTO v_coin FROM coins WHERE id = v_tx.coin_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Coin not found'); END IF;

  SELECT fee_percentage, creator_commission_percentage INTO v_settings
    FROM site_settings LIMIT 1;

  UPDATE transactions
    SET status = 'completed',
        mpesa_receipt = COALESCE(_mpesa_receipt, mpesa_receipt),
        updated_at = now()
    WHERE id = _transaction_id;

  SELECT * INTO v_holding FROM holdings 
    WHERE user_id = v_tx.user_id AND coin_id = v_tx.coin_id FOR UPDATE;

  IF v_holding.id IS NULL THEN
    INSERT INTO holdings (user_id, coin_id, amount, average_buy_price)
      VALUES (v_tx.user_id, v_tx.coin_id, v_tx.amount, v_tx.price_per_coin);
    v_holders_delta := 1;
  ELSE
    UPDATE holdings
      SET amount = v_holding.amount + v_tx.amount,
          average_buy_price = ((v_holding.amount * v_holding.average_buy_price) 
            + (v_tx.amount * v_tx.price_per_coin)) / (v_holding.amount + v_tx.amount),
          updated_at = now()
      WHERE id = v_holding.id;
  END IF;

  SELECT count(*) INTO v_holders_count FROM holdings 
    WHERE coin_id = v_tx.coin_id AND amount > 0;

  UPDATE coins
    SET circulating_supply = circulating_supply + v_tx.amount,
        liquidity = COALESCE(liquidity, 0) + v_tx.total_value,
        holders_count = v_holders_count,
        updated_at = now()
    WHERE id = v_tx.coin_id;

  INSERT INTO price_history (coin_id, price, volume, trade_type)
    SELECT id, price, v_tx.total_value, 'buy' FROM coins WHERE id = v_tx.coin_id;

  IF COALESCE(v_settings.fee_percentage, 0) > 0 THEN
    INSERT INTO commission_transactions (transaction_id, amount, commission_rate)
      VALUES (_transaction_id, v_tx.total_value * (v_settings.fee_percentage / 100.0), v_settings.fee_percentage);
  END IF;

  IF v_coin.creator_id IS NOT NULL 
     AND v_coin.creator_id <> v_tx.user_id 
     AND COALESCE(v_settings.creator_commission_percentage, 0) > 0 THEN
    v_creator_share := v_tx.total_value * (v_settings.creator_commission_percentage / 100.0);
    INSERT INTO wallets (user_id, fiat_balance) 
      VALUES (v_coin.creator_id, v_creator_share)
      ON CONFLICT (user_id) DO UPDATE 
        SET fiat_balance = wallets.fiat_balance + v_creator_share;
  END IF;

  RETURN jsonb_build_object('ok', true, 'allocated', v_tx.amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_mpesa_deposit(
  _payment_request_id uuid,
  _mpesa_receipt text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr RECORD;
  v_settings RECORD;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  v_referrer_id uuid;
  v_referral_bonus numeric;
BEGIN
  SELECT * INTO v_pr FROM payment_requests WHERE id = _payment_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Payment request not found'); END IF;
  IF v_pr.status = 'completed' THEN RETURN jsonb_build_object('ok', true, 'already_completed', true); END IF;

  SELECT deposit_fee_percentage, referral_commission_percentage INTO v_settings
    FROM site_settings LIMIT 1;

  UPDATE payment_requests
    SET status = 'completed',
        mpesa_receipt = COALESCE(_mpesa_receipt, mpesa_receipt),
        result_desc = 'success',
        updated_at = now()
    WHERE id = _payment_request_id;

  IF v_pr.type = 'coin_creation' AND v_pr.coin_id IS NOT NULL THEN
    UPDATE coins SET creation_fee_paid = true 
      WHERE id = v_pr.coin_id AND creator_id = v_pr.user_id;
    RETURN jsonb_build_object('ok', true, 'type', 'coin_creation');
  END IF;

  IF v_pr.type = 'deposit' THEN
    v_gross := v_pr.amount;
    v_fee := v_gross * (COALESCE(v_settings.deposit_fee_percentage, 0) / 100.0);
    v_net := GREATEST(0, v_gross - v_fee);

    INSERT INTO wallets (user_id, fiat_balance) VALUES (v_pr.user_id, v_net)
      ON CONFLICT (user_id) DO UPDATE 
        SET fiat_balance = wallets.fiat_balance + v_net;

    IF v_fee > 0 THEN
      INSERT INTO commission_transactions (amount, commission_rate)
        VALUES (v_fee, COALESCE(v_settings.deposit_fee_percentage, 0));
    END IF;

    IF COALESCE(v_settings.referral_commission_percentage, 0) > 0 THEN
      SELECT p2.user_id INTO v_referrer_id
        FROM profiles p1
        JOIN profiles p2 ON p2.referral_code = p1.referred_by
        WHERE p1.user_id = v_pr.user_id;
      IF v_referrer_id IS NOT NULL THEN
        v_referral_bonus := v_gross * (v_settings.referral_commission_percentage / 100.0);
        INSERT INTO wallets (user_id, fiat_balance) VALUES (v_referrer_id, v_referral_bonus)
          ON CONFLICT (user_id) DO UPDATE 
            SET fiat_balance = wallets.fiat_balance + v_referral_bonus;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'type', v_pr.type);
END;
$$;