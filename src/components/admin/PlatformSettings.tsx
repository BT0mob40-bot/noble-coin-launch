import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, Loader2, Save, Globe, CreditCard, Percent,
  Image as ImageIcon, DollarSign, AlertTriangle, Coins, Gift,
  Share2, Search as SearchIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface SiteSettings {
  id: string;
  site_name: string;
  site_description: string | null;
  logo_url: string | null;
  primary_color: string | null;
  fee_percentage: number;
  min_buy_amount: number;
  max_buy_amount: number;
  admin_commission: number;
  coin_creation_fee: number;
  referral_commission_percentage: number;
  creator_commission_percentage: number;
  deposit_fee_percentage: number;
  withdrawal_fee_percentage: number;
  twitter_url: string;
  discord_url: string;
  telegram_url: string;
  instagram_url: string;
  facebook_url: string;
  google_verification_code: string;
  seo_keywords: string;
}

export function PlatformSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          ...data,
          creator_commission_percentage: (data as any).creator_commission_percentage ?? 1,
          deposit_fee_percentage: (data as any).deposit_fee_percentage ?? 0,
          withdrawal_fee_percentage: (data as any).withdrawal_fee_percentage ?? 0,
          twitter_url: (data as any).twitter_url ?? '',
          discord_url: (data as any).discord_url ?? '',
          telegram_url: (data as any).telegram_url ?? '',
          instagram_url: (data as any).instagram_url ?? '',
          facebook_url: (data as any).facebook_url ?? '',
          google_verification_code: (data as any).google_verification_code ?? '',
          seo_keywords: (data as any).seo_keywords ?? '',
        } as SiteSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('site_settings').update({
        site_name: settings.site_name,
        site_description: settings.site_description,
        logo_url: settings.logo_url,
        primary_color: settings.primary_color,
        fee_percentage: settings.fee_percentage,
        min_buy_amount: settings.min_buy_amount,
        max_buy_amount: settings.max_buy_amount,
        admin_commission: settings.admin_commission,
        coin_creation_fee: settings.coin_creation_fee,
        referral_commission_percentage: settings.referral_commission_percentage,
        creator_commission_percentage: settings.creator_commission_percentage,
        deposit_fee_percentage: settings.deposit_fee_percentage,
        withdrawal_fee_percentage: settings.withdrawal_fee_percentage,
        twitter_url: settings.twitter_url,
        discord_url: settings.discord_url,
        telegram_url: settings.telegram_url,
        instagram_url: settings.instagram_url,
        facebook_url: settings.facebook_url,
        google_verification_code: settings.google_verification_code,
        seo_keywords: settings.seo_keywords,
      } as any).eq('id', settings.id);
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `site-logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('coin-logos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('coin-logos').getPublicUrl(fileName);
      setSettings({ ...settings, logo_url: publicUrl });
      toast.success('Logo uploaded!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!settings) return <div className="flex items-center justify-center py-12 text-muted-foreground"><AlertTriangle className="h-5 w-5 mr-2" />Failed to load settings</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Branding */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Globe className="h-5 w-5 text-primary" />Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Site Name</Label>
              <Input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Primary Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={settings.primary_color || '#00d4ff'} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                <Input value={settings.primary_color || '#00d4ff'} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Site Description</Label>
            <Textarea value={settings.site_description || ''} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Site Logo</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-muted/50 border flex items-center justify-center overflow-hidden flex-shrink-0">
                {settings.logo_url ? <img src={settings.logo_url} alt="Logo" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading} asChild><span>{uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</> : 'Upload Logo'}</span></Button>
                </Label>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Config */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><CreditCard className="h-5 w-5 text-primary" />Trading & Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm"><Percent className="h-4 w-4" />Transaction Fee</Label>
              <span className="text-lg font-bold text-primary">{settings.fee_percentage}%</span>
            </div>
            <Slider value={[settings.fee_percentage]} onValueChange={(v) => setSettings({ ...settings, fee_percentage: v[0] })} min={0} max={10} step={0.1} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Min Buy (KES)</Label>
              <Input type="number" value={settings.min_buy_amount} onChange={(e) => setSettings({ ...settings, min_buy_amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Max Buy (KES)</Label>
              <Input type="number" value={settings.max_buy_amount} onChange={(e) => setSettings({ ...settings, max_buy_amount: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Deposit Fee %</Label>
              <Input type="number" step="0.1" value={settings.deposit_fee_percentage} onChange={(e) => setSettings({ ...settings, deposit_fee_percentage: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Withdrawal Fee %</Label>
              <Input type="number" step="0.1" value={settings.withdrawal_fee_percentage} onChange={(e) => setSettings({ ...settings, withdrawal_fee_percentage: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coin Creation & Commissions */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Coins className="h-5 w-5 text-warning" />Commissions & Referrals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
          <div className="space-y-2">
            <Label className="text-sm">Coin Creation Gas Fee (KES)</Label>
            <Input type="number" value={settings.coin_creation_fee} onChange={(e) => setSettings({ ...settings, coin_creation_fee: parseFloat(e.target.value) || 0 })} className="font-mono" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Creator Commission %</Label>
              <span className="text-lg font-bold text-accent">{settings.creator_commission_percentage}%</span>
            </div>
            <Slider value={[settings.creator_commission_percentage]} onValueChange={(v) => setSettings({ ...settings, creator_commission_percentage: v[0] })} min={0} max={10} step={0.5} />
            <p className="text-xs text-muted-foreground">Coin creators earn this % on every trade of their coin</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm"><Gift className="h-4 w-4 text-success" />Referral Commission</Label>
              <span className="text-lg font-bold text-success">{settings.referral_commission_percentage}%</span>
            </div>
            <Slider value={[settings.referral_commission_percentage]} onValueChange={(v) => setSettings({ ...settings, referral_commission_percentage: v[0] })} min={0} max={50} step={0.5} />
            <p className="text-xs text-muted-foreground">Referrers earn this % of referred user deposits</p>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Share2 className="h-5 w-5 text-primary" />Social Links</CardTitle>
          <CardDescription className="text-xs">Displayed in footer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Twitter / X</Label>
              <Input placeholder="https://twitter.com/..." value={settings.twitter_url} onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telegram</Label>
              <Input placeholder="https://t.me/..." value={settings.telegram_url} onChange={(e) => setSettings({ ...settings, telegram_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Discord</Label>
              <Input placeholder="https://discord.gg/..." value={settings.discord_url} onChange={(e) => setSettings({ ...settings, discord_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Instagram</Label>
              <Input placeholder="https://instagram.com/..." value={settings.instagram_url} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Facebook</Label>
              <Input placeholder="https://facebook.com/..." value={settings.facebook_url} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><SearchIcon className="h-5 w-5 text-primary" />SEO & Search</CardTitle>
          <CardDescription className="text-xs">Search engine optimization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
          <div className="space-y-1.5">
            <Label className="text-xs">Google Search Console Verification Code</Label>
            <Input placeholder="e.g. abc123xyz" value={settings.google_verification_code} onChange={(e) => setSettings({ ...settings, google_verification_code: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">Paste the content value from Google Search Console HTML tag verification</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SEO Keywords</Label>
            <Textarea placeholder="crypto, trading, m-pesa, launchpad, kenya..." value={settings.seo_keywords} onChange={(e) => setSettings({ ...settings, seo_keywords: e.target.value })} rows={2} />
            <p className="text-[10px] text-muted-foreground">Comma-separated keywords for search engines</p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2" size="lg">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save All Settings</>}
        </Button>
      </div>
    </div>
  );
}
