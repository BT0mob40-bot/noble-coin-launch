
-- Scheduled notifications table
CREATE TABLE public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'once', -- once, hourly, daily, weekly, monthly
  target text NOT NULL DEFAULT 'all', -- all, specific
  target_user_ids text[] NOT NULL DEFAULT '{}',
  channels text[] NOT NULL DEFAULT '{}',
  template_slug text,
  subject text DEFAULT '',
  email_body text DEFAULT '',
  sms_body text DEFAULT '',
  whatsapp_body text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scheduled notifications"
  ON public.scheduled_notifications FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage scheduled notifications"
  ON public.scheduled_notifications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Enable pg_cron and pg_net extensions for scheduled execution
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
