
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS email_provider text NOT NULL DEFAULT 'smtp';

COMMENT ON COLUMN public.site_settings.email_provider IS 'smtp or lovable - controls which email system handles password reset and 2FA';
