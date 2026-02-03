import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout, Type, BarChart3, Megaphone, Loader2, Save, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LandingSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_badge: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_3_title: string;
  feature_3_description: string;
  feature_4_title: string;
  feature_4_description: string;
  stats_tokens: string;
  stats_traders: string;
  stats_volume: string;
  stats_uptime: string;
  cta_title: string;
  cta_subtitle: string;
}

export function LandingPageSettings() {
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          hero_title: data.hero_title || 'Trade Crypto with M-PESA',
          hero_subtitle: data.hero_subtitle || '',
          hero_badge: data.hero_badge || 'Next-Gen Crypto Launchpad',
          feature_1_title: data.feature_1_title || 'Launch Your Token',
          feature_1_description: data.feature_1_description || '',
          feature_2_title: data.feature_2_title || 'Secure Trading',
          feature_2_description: data.feature_2_description || '',
          feature_3_title: data.feature_3_title || 'Instant M-PESA',
          feature_3_description: data.feature_3_description || '',
          feature_4_title: data.feature_4_title || 'Real-Time Prices',
          feature_4_description: data.feature_4_description || '',
          stats_tokens: data.stats_tokens || '100+',
          stats_traders: data.stats_traders || '50K+',
          stats_volume: data.stats_volume || '$10M+',
          stats_uptime: data.stats_uptime || '99.9%',
          cta_title: data.cta_title || 'Join the Revolution',
          cta_subtitle: data.cta_subtitle || '',
        });
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
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update(settings)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert(settings);
        if (error) throw error;
      }

      toast.success('Landing page settings saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof LandingSettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Landing Page Settings
            </CardTitle>
            <CardDescription>
              Customize your landing page content dynamically
            </CardDescription>
          </div>
          <Button variant="hero" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hero" className="space-y-6">
          <TabsList className="grid grid-cols-4 gap-2">
            <TabsTrigger value="hero" className="gap-2">
              <Type className="h-4 w-4" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="cta" className="gap-2">
              <Megaphone className="h-4 w-4" />
              CTA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Badge Text</Label>
                <Input
                  value={settings?.hero_badge || ''}
                  onChange={(e) => updateField('hero_badge', e.target.value)}
                  placeholder="Next-Gen Crypto Launchpad"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Hero Title</Label>
                <Input
                  value={settings?.hero_title || ''}
                  onChange={(e) => updateField('hero_title', e.target.value)}
                  placeholder="Trade Crypto with M-PESA"
                  className="bg-muted/30"
                />
                <p className="text-xs text-muted-foreground">The word "M-PESA" will be highlighted with gradient</p>
              </div>
              <div className="space-y-2">
                <Label>Hero Subtitle</Label>
                <Textarea
                  value={settings?.hero_subtitle || ''}
                  onChange={(e) => updateField('hero_subtitle', e.target.value)}
                  placeholder="The first crypto launchpad designed for Africa..."
                  className="bg-muted/30"
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="grid gap-4 p-4 rounded-lg bg-muted/20">
                <h4 className="font-medium">Feature {num}</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={settings?.[`feature_${num}_title` as keyof LandingSettings] || ''}
                      onChange={(e) => updateField(`feature_${num}_title` as keyof LandingSettings, e.target.value)}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={settings?.[`feature_${num}_description` as keyof LandingSettings] || ''}
                      onChange={(e) => updateField(`feature_${num}_description` as keyof LandingSettings, e.target.value)}
                      className="bg-muted/30"
                    />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tokens Listed</Label>
                <Input
                  value={settings?.stats_tokens || ''}
                  onChange={(e) => updateField('stats_tokens', e.target.value)}
                  placeholder="100+"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Active Traders</Label>
                <Input
                  value={settings?.stats_traders || ''}
                  onChange={(e) => updateField('stats_traders', e.target.value)}
                  placeholder="50K+"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Trading Volume</Label>
                <Input
                  value={settings?.stats_volume || ''}
                  onChange={(e) => updateField('stats_volume', e.target.value)}
                  placeholder="$10M+"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Platform Uptime</Label>
                <Input
                  value={settings?.stats_uptime || ''}
                  onChange={(e) => updateField('stats_uptime', e.target.value)}
                  placeholder="99.9%"
                  className="bg-muted/30"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cta" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>CTA Title</Label>
                <Input
                  value={settings?.cta_title || ''}
                  onChange={(e) => updateField('cta_title', e.target.value)}
                  placeholder="Join the Revolution"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Subtitle</Label>
                <Textarea
                  value={settings?.cta_subtitle || ''}
                  onChange={(e) => updateField('cta_subtitle', e.target.value)}
                  placeholder="Start trading crypto today..."
                  className="bg-muted/30"
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
