
-- SMTP/Email configuration
CREATE TABLE public.smtp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  encryption text NOT NULL DEFAULT 'tls',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view smtp config" ON public.smtp_config FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage smtp config" ON public.smtp_config FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- SMS configuration (Africa's Talking)
CREATE TABLE public.sms_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'africastalking',
  api_key text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  sender_id text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sms config" ON public.sms_config FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage sms config" ON public.sms_config FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- WhatsApp configuration
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'meta',
  api_token text NOT NULL DEFAULT '',
  phone_number_id text NOT NULL DEFAULT '',
  business_account_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whatsapp config" ON public.whatsapp_config FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage whatsapp config" ON public.whatsapp_config FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Notification templates
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL DEFAULT '',
  email_body text NOT NULL DEFAULT '',
  sms_body text NOT NULL DEFAULT '',
  whatsapp_body text NOT NULL DEFAULT '',
  is_email_enabled boolean NOT NULL DEFAULT false,
  is_sms_enabled boolean NOT NULL DEFAULT false,
  is_whatsapp_enabled boolean NOT NULL DEFAULT false,
  variables text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view templates" ON public.notification_templates FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage templates" ON public.notification_templates FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Notification log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT NULL,
  template_slug text DEFAULT NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text DEFAULT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification log" ON public.notification_log FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage notification log" ON public.notification_log FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
