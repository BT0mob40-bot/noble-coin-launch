
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  chat_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage telegram_users" ON public.telegram_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view telegram_users" ON public.telegram_users FOR SELECT USING (is_admin(auth.uid()));
