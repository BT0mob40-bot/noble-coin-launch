import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  Loader2, 
  Save, 
  Globe, 
  CreditCard,
  Percent,
  Image as ImageIcon,
  DollarSign,
  AlertTriangle,
  Coins,
  Gift
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
}

export function PlatformSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as SiteSettings);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('site_settings')
          .insert({
            site_name: 'CryptoLaunch',
            site_description: 'Your Gateway to Digital Assets',
            fee_percentage: 2.5,
            min_buy_amount: 100,
            max_buy_amount: 100000,
            primary_color: '#00d4ff',
            admin_commission: 2.5,
            coin_creation_fee: 5000,
            referral_commission_percentage: 5,
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings as SiteSettings);
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
      const { error } = await supabase
        .from('site_settings')
        .update({
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
        })
        .eq('id', settings.id);

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

      const { error: uploadError } = await supabase.storage
        .from('coin-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coin-logos')
        .getPublicUrl(fileName);

      setSettings({ ...settings, logo_url: publicUrl });
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <AlertTriangle className="h-5 w-5 mr-2" />
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Branding Settings */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Branding & Appearance
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Customize your platform's identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Site Name</Label>
              <Input
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                placeholder="CryptoLaunch"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.primary_color || '#00d4ff'}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-12 sm:w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primary_color || '#00d4ff'}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  placeholder="#00d4ff"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Site Description</Label>
            <Textarea
              value={settings.site_description || ''}
              onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              placeholder="Your Gateway to Digital Assets"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Site Logo</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-muted/50 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading} asChild>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Logo'
                      )}
                    </span>
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Settings */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Trading Configuration
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Set transaction limits and fees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Fee Percentage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Percent className="h-4 w-4" />
                Transaction Fee
              </Label>
              <span className="text-lg font-bold text-primary">{settings.fee_percentage}%</span>
            </div>
            <Slider
              value={[settings.fee_percentage]}
              onValueChange={(value) => setSettings({ ...settings, fee_percentage: value[0] })}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Applied to all buy and sell transactions
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Minimum Buy Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                Min Buy Amount (KES)
              </Label>
              <Input
                type="number"
                value={settings.min_buy_amount}
                onChange={(e) => setSettings({ ...settings, min_buy_amount: parseFloat(e.target.value) || 0 })}
                placeholder="100"
              />
            </div>

            {/* Maximum Buy Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                Max Buy Amount (KES)
              </Label>
              <Input
                type="number"
                value={settings.max_buy_amount}
                onChange={(e) => setSettings({ ...settings, max_buy_amount: parseFloat(e.target.value) || 0 })}
                placeholder="100000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coin Creation & Referral Settings */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Coins className="h-5 w-5 text-warning" />
            Coin Creation & Referrals
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Configure gas fees and referral commissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Gas Fee */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-warning" />
              Coin Creation Gas Fee (KES)
            </Label>
            <Input
              type="number"
              value={settings.coin_creation_fee}
              onChange={(e) => setSettings({ ...settings, coin_creation_fee: parseFloat(e.target.value) || 0 })}
              placeholder="5000"
              className="text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Admins must pay this fee via M-PESA when creating new coins
            </p>
          </div>

          {/* Referral Commission */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-success" />
                Referral Commission
              </Label>
              <span className="text-lg font-bold text-success">{settings.referral_commission_percentage}%</span>
            </div>
            <Slider
              value={[settings.referral_commission_percentage]}
              onValueChange={(value) => setSettings({ ...settings, referral_commission_percentage: value[0] })}
              min={0}
              max={20}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Users earn this percentage on trades made by their referrals
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <DollarSign className="h-4 w-4" />
              Revenue Summary
            </div>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>• Transaction Fee: {settings.fee_percentage}% on all trades</li>
              <li>• Gas Fee: KES {settings.coin_creation_fee.toLocaleString()} per coin created</li>
              <li>• Referral Payout: {settings.referral_commission_percentage}% to referrers</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end pb-4"
      >
        <Button onClick={handleSave} disabled={saving} className="gap-2" size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}