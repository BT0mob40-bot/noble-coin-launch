import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Chrome, MessageCircle, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SocialAuthSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    google_auth_enabled: false,
    telegram_auth_enabled: false,
  });

  const [telegramConfig, setTelegramConfig] = useState({
    bot_username: '',
    bot_token: '',
    chat_id: '',
  });

  const fetchSettings = async () => {
    try {
      // Fetch site settings
      const { data: siteData, error: siteError } = await supabase
        .from('site_settings')
        .select('google_auth_enabled, telegram_auth_enabled')
        .maybeSingle();

      if (siteError) throw siteError;

      if (siteData) {
        setSettings({
          google_auth_enabled: siteData.google_auth_enabled ?? false,
          telegram_auth_enabled: siteData.telegram_auth_enabled ?? false,
        });
      }

      // Fetch telegram config
      const { data: telegramData, error: telegramError } = await supabase
        .from('telegram_config')
        .select('bot_username, bot_token, chat_id')
        .maybeSingle();

      if (telegramError && telegramError.code !== 'PGRST116') throw telegramError;

      if (telegramData) {
        setTelegramConfig({
          bot_username: telegramData.bot_username || '',
          bot_token: telegramData.bot_token || '',
          chat_id: telegramData.chat_id || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load social auth settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Update site settings
      const { error: siteError } = await supabase
        .from('site_settings')
        .update(settings)
        .eq('id', (await supabase.from('site_settings').select('id').maybeSingle()).data?.id);

      if (siteError) throw siteError;

      // Update telegram config if telegram is enabled
      if (settings.telegram_auth_enabled) {
        const { error: telegramError } = await supabase
          .from('telegram_config')
          .upsert({
            ...telegramConfig,
            auth_enabled: true,
            is_active: true,
          });

        if (telegramError) throw telegramError;
      }

      toast.success('Social auth settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save social auth settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Social Login Settings
          </CardTitle>
          <CardDescription>
            Configure social authentication providers for your platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-b-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Chrome className="h-5 w-5" />
          Social Login Settings
        </CardTitle>
        <CardDescription>
          Configure social authentication providers for your platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Social login providers must be configured in your backend settings for them to work properly.
          </AlertDescription>
        </Alert>

        {/* Google OAuth */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Chrome className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="text-base font-medium">Google OAuth</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to sign in with their Google account
                </p>
              </div>
            </div>
            <Switch
              checked={settings.google_auth_enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, google_auth_enabled: checked }))
              }
            />
          </div>
        </div>

        <Separator />

        {/* Telegram Auth */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <div>
                <Label className="text-base font-medium">Telegram Bot Auth</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to sign in through your Telegram bot
                </p>
              </div>
            </div>
            <Switch
              checked={settings.telegram_auth_enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, telegram_auth_enabled: checked }))
              }
            />
          </div>

          {settings.telegram_auth_enabled && (
            <div className="ml-8 space-y-4 border-l-2 border-muted pl-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bot_username">Bot Username</Label>
                  <Input
                    id="bot_username"
                    placeholder="@your_bot_username"
                    value={telegramConfig.bot_username}
                    onChange={(e) =>
                      setTelegramConfig(prev => ({ ...prev, bot_username: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="chat_id">Chat ID</Label>
                  <Input
                    id="chat_id"
                    placeholder="-1001234567890"
                    value={telegramConfig.chat_id}
                    onChange={(e) =>
                      setTelegramConfig(prev => ({ ...prev, chat_id: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bot_token">Bot Token</Label>
                <Input
                  id="bot_token"
                  type="password"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={telegramConfig.bot_token}
                  onChange={(e) =>
                    setTelegramConfig(prev => ({ ...prev, bot_token: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}