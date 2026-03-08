
ALTER TABLE public.coins
  ADD COLUMN IF NOT EXISTS price_change_24h_override numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_price_change_24h_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS volatility_override numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_volatility_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS circulating_supply_override numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_circulating_supply_override boolean NOT NULL DEFAULT false;
