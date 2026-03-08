
CREATE OR REPLACE FUNCTION public.get_coin_price_changes_24h()
RETURNS TABLE(coin_id uuid, price_change_24h numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH latest_prices AS (
    SELECT DISTINCT ON (ph.coin_id)
      ph.coin_id,
      ph.price as current_price
    FROM price_history ph
    WHERE ph.created_at >= now() - interval '24 hours'
    ORDER BY ph.coin_id, ph.created_at DESC
  ),
  oldest_prices AS (
    SELECT DISTINCT ON (ph.coin_id)
      ph.coin_id,
      ph.price as old_price
    FROM price_history ph
    WHERE ph.created_at >= now() - interval '24 hours'
    ORDER BY ph.coin_id, ph.created_at ASC
  )
  SELECT
    lp.coin_id,
    CASE WHEN op.old_price > 0 
      THEN ROUND(((lp.current_price - op.old_price) / op.old_price * 100)::numeric, 2)
      ELSE 0
    END as price_change_24h
  FROM latest_prices lp
  JOIN oldest_prices op ON lp.coin_id = op.coin_id;
$$;
