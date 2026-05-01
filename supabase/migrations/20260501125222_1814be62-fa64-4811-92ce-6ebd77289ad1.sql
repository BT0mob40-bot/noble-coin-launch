DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'referrals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'referral_commissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_commissions;
  END IF;
END $$;

ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.referral_commissions REPLICA IDENTITY FULL;