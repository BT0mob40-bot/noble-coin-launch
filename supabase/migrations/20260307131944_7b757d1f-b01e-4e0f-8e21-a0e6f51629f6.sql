ALTER TABLE public.mpesa_config
  ADD COLUMN IF NOT EXISTS initiator_name text,
  ADD COLUMN IF NOT EXISTS security_credential text,
  ADD COLUMN IF NOT EXISTS b2c_command_id text DEFAULT 'BusinessPayment',
  ADD COLUMN IF NOT EXISTS b2c_result_url text,
  ADD COLUMN IF NOT EXISTS b2c_timeout_url text;