import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bot, Loader2, Webhook, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TelegramSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [config, setConfig] = useState({
    bot_token: '',
    chat_id: '',
    bot_username: '',
    webhook_url: '',
    is_active: false,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase.from('telegram_config' as any).select('*').maybeSingle();
    if (data) {
      setConfig({
        bot_token: (data as any).bot_token || '',
        chat_id: (data as any).chat_id || '',
        bot_username: (data as any).bot_username || '',
        webhook_url: (data as any).webhook_url || '',
        is_active: (data as any).is_active || false,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('telegram_config' as any).select('id').maybeSingle();
      if (existing) {
        const { error } = await supabase.from('telegram_config' as any).update(config as any).eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('telegram_config' as any).insert(config as any);
        if (error) throw error;
      }
      toast.success('Telegram configuration saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!config.bot_token) {
      toast.error('Bot token is required');
      return;
    }
    setSettingWebhook(true);
    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
      const res = await fetch(`https://api.telegram.org/bot${config.bot_token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(prev => ({ ...prev, webhook_url: webhookUrl }));
        // Save the webhook URL
        const { data: existing } = await supabase.from('telegram_config' as any).select('id').maybeSingle();
        if (existing) {
          await supabase.from('telegram_config' as any).update({ webhook_url: webhookUrl } as any).eq('id', (existing as any).id);
        }
        toast.success('Webhook set successfully!');
      } else {
        toast.error(data.description || 'Failed to set webhook');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to set webhook');
    } finally {
      setSettingWebhook(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Telegram Bot Configuration
        </CardTitle>
        <CardDescription>Configure your Telegram bot for user registration and trading</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Switch checked={config.is_active} onCheckedChange={(v) => setConfig(prev => ({ ...prev, is_active: v }))} />
          <Label>Bot Active</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input
              type="password"
              placeholder="123456:ABC-DEF..."
              value={config.bot_token}
              onChange={(e) => setConfig(prev => ({ ...prev, bot_token: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Get from @BotFather on Telegram</p>
          </div>
          <div className="space-y-2">
            <Label>Bot Username</Label>
            <Input
              placeholder="@your_bot"
              value={config.bot_username}
              onChange={(e) => setConfig(prev => ({ ...prev, bot_username: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Chat ID (notifications)</Label>
            <Input
              placeholder="-1001234567890"
              value={config.chat_id}
              onChange={(e) => setConfig(prev => ({ ...prev, chat_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input value={config.webhook_url} readOnly className="bg-muted/50" />
          </div>
        </div>

        {config.webhook_url && (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle className="h-3.5 w-3.5" />
            Webhook configured
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Configuration
          </Button>
          <Button variant="outline" onClick={handleSetWebhook} disabled={settingWebhook || !config.bot_token} className="gap-2">
            {settingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
            Set Webhook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
