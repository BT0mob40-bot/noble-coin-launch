
-- Price history table to track real price changes from trades
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id uuid NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  volume numeric NOT NULL DEFAULT 0,
  trade_type text NOT NULL DEFAULT 'buy',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast time-range queries
CREATE INDEX idx_price_history_coin_time ON public.price_history (coin_id, created_at DESC);

-- RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read price history (public market data)
CREATE POLICY "Anyone can view price history"
  ON public.price_history FOR SELECT
  USING (true);

-- Service role / admins can insert
CREATE POLICY "Service role can insert price history"
  ON public.price_history FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
