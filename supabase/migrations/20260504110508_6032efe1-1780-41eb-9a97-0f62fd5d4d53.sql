DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payment_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallet_withdrawals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_withdrawals;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'performance_metrics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_metrics;
  END IF;
END $$;

ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;
ALTER TABLE public.wallet_withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.performance_metrics REPLICA IDENTITY FULL;

REVOKE EXECUTE ON FUNCTION public.complete_mpesa_buy(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.complete_mpesa_deposit(uuid, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.complete_mpesa_buy(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_mpesa_deposit(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;