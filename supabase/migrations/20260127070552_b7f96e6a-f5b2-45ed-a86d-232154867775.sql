-- Create storage bucket for coin logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('coin-logos', 'coin-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view coin logos
CREATE POLICY "Anyone can view coin logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'coin-logos');

-- Policy: Admins can upload coin logos  
CREATE POLICY "Admins can upload coin logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'coin-logos' AND public.is_admin(auth.uid()));

-- Policy: Admins can update coin logos
CREATE POLICY "Admins can update coin logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'coin-logos' AND public.is_admin(auth.uid()));

-- Policy: Admins can delete coin logos
CREATE POLICY "Admins can delete coin logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'coin-logos' AND public.is_admin(auth.uid()));