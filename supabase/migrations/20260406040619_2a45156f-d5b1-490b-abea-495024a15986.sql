-- Allow authenticated users to insert price_history (for wallet buys/sells done client-side)
CREATE POLICY "Authenticated users can insert price history"
ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (true);
