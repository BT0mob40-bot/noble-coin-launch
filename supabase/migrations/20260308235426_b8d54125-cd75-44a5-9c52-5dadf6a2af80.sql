-- Add live streaming fee to site settings
ALTER TABLE public.site_settings 
ADD COLUMN live_fee numeric NOT NULL DEFAULT 1000;

-- Create live_streams table to track active live sessions
CREATE TABLE public.live_streams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coin_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  fee_paid numeric NOT NULL DEFAULT 0,
  admin_override boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Social media platforms and usernames
  instagram_username text,
  youtube_username text,  
  tiktok_username text,
  twitch_username text,
  kick_username text,
  
  -- Additional metadata
  title text,
  description text
);

-- Enable RLS on live_streams
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_streams
CREATE POLICY "Anyone can view active live streams" 
ON public.live_streams 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Coin creators can create live streams" 
ON public.live_streams 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own live streams" 
ON public.live_streams 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Admins can manage all live streams" 
ON public.live_streams 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create function to automatically expire live streams
CREATE OR REPLACE FUNCTION public.expire_live_streams()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_streams 
  SET is_active = false 
  WHERE is_active = true AND expires_at <= now();
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();