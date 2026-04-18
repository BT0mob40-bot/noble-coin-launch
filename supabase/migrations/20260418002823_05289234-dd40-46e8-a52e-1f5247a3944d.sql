CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  origin text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_email ON public.password_reset_tokens(email);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- No public policies; only service_role can read/write.