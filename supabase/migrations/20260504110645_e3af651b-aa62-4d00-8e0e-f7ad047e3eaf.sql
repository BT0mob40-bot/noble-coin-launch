ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS merchant_request_id text NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_request_id
  ON public.transactions (merchant_request_id)
  WHERE merchant_request_id IS NOT NULL;