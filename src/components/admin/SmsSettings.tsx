import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Phone, Loader2, Save, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface SmsConfig {
  id?: string;
  provider: string;
  api_key: string;
  username: string;
  sender_id: string | null;
  is_active: boolean;
}

const defaults: SmsConfig = { provider: 'africastalking', api_key: '', username: '', sender_id: null, is_active: false };

export function SmsSettings() {
  const [config, setConfig] = useState<SmsConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from('sms_config').select('*').maybeSingle().then(({ data }) => {
      if (data) setConfig(data as any);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { provider: config.provider, api_key: config.api_key, username: config.username, sender_id: config.sender_id, is_active: config.is_active };
    let error;
    if (config.id) {
      ({ error } = await supabase.from('sms_config').update(payload as any).eq('id', config.id));
    } else {
      const res = await supabase.from('sms_config').insert(payload as any).select().single();
      error = res.error;
      if (res.data) setConfig(res.data as any);
    }
    if (error) toast.error('Failed to save'); else toast.success('SMS settings saved!');
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testPhone) { toast.error('Enter a phone number'); return; }
    setTesting(true);
    toast.info('Test SMS feature will be available once the SMS edge function is deployed');
    setTesting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Phone className="h-5 w-5 text-success" /> Africa's Talking SMS</CardTitle>
          <CardDescription className="text-xs">
            SMS integration for OTP, notifications, and alerts via{' '}
            <a href="https://africastalking.com/sms/bulksms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
              Africa's Talking <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch checked={config.is_active} onCheckedChange={v => setConfig({...config, is_active: v})} />
            <div>
              <Label className="text-sm font-medium">Enable SMS Notifications</Label>
              <p className="text-[10px] text-muted-foreground">Activate Africa's Talking SMS sending</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
              <Input type="password" placeholder="Your AT API Key" value={config.api_key} onChange={e => setConfig({...config, api_key: e.target.value})} />
              <p className="text-[9px] text-muted-foreground">Find in AT Dashboard → Settings → API Key</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input placeholder="sandbox or your app username" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
              <p className="text-[9px] text-muted-foreground">Use "sandbox" for testing</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Sender ID (Optional)</Label>
              <Input placeholder="e.g. MYAPP" value={config.sender_id || ''} onChange={e => setConfig({...config, sender_id: e.target.value || null})} />
              <p className="text-[9px] text-muted-foreground">Custom sender ID. Leave empty to use default shortcode.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Send className="h-5 w-5 text-primary" /> Test SMS</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-2">
            <Input placeholder="+254712345678" value={testPhone} onChange={e => setTestPhone(e.target.value)} className="max-w-xs" />
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="gap-1">
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save SMS Settings
        </Button>
      </div>
    </div>
  );
}
