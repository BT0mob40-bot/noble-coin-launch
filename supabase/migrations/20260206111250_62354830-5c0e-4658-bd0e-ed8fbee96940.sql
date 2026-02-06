
-- Add contract_address to coins for sharing/searching
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS contract_address text;

-- Generate a unique contract address for existing coins
UPDATE public.coins SET contract_address = '0x' || encode(decode(replace(id::text, '-', ''), 'hex'), 'hex') WHERE contract_address IS NULL;

-- Create function to auto-generate contract address on coin creation
CREATE OR REPLACE FUNCTION public.generate_contract_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_address IS NULL THEN
    NEW.contract_address := '0x' || encode(gen_random_bytes(20), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS auto_contract_address ON public.coins;
CREATE TRIGGER auto_contract_address
  BEFORE INSERT ON public.coins
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contract_address();
