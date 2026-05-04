CREATE OR REPLACE FUNCTION public.process_mpesa_withdrawal_result(
  _withdrawal_id uuid,
  _success boolean,
  _mpesa_receipt text,
  _result_desc text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_w RECORD;
BEGIN
  SELECT * INTO v_w FROM public.wallet_withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal not found'); END IF;

  IF v_w.status IN ('completed', 'rejected') THEN
    RETURN jsonb_build_object('ok', true, 'already_final', true, 'status', v_w.status);
  END IF;

  IF _success THEN
    IF v_w.status <> 'completed' THEN
      UPDATE public.wallet_withdrawals
      SET status = 'completed',
          mpesa_receipt = COALESCE(NULLIF(_mpesa_receipt, ''), mpesa_receipt),
          admin_note = COALESCE(NULLIF(_result_desc, ''), 'Sent to M-PESA'),
          updated_at = now()
      WHERE id = _withdrawal_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'status', 'completed');
  END IF;

  IF v_w.status <> 'failed' THEN
    UPDATE public.wallet_withdrawals
    SET status = 'failed',
        mpesa_receipt = COALESCE(NULLIF(_mpesa_receipt, ''), mpesa_receipt),
        admin_note = COALESCE(NULLIF(_result_desc, ''), 'M-PESA payout failed'),
        updated_at = now()
    WHERE id = _withdrawal_id;

    INSERT INTO public.wallets (user_id, fiat_balance)
    VALUES (v_w.user_id, v_w.amount)
    ON CONFLICT (user_id) DO UPDATE
      SET fiat_balance = public.wallets.fiat_balance + v_w.amount;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'failed', 'refunded', v_w.amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_mpesa_withdrawal_result(uuid, boolean, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.process_mpesa_withdrawal_result(uuid, boolean, text, text) TO service_role;