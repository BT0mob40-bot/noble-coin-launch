import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Loader2, Save, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppConfig {
  id?: string;
  provider: string;
  api_token: string;
  phone_number_id: string;
  business_account_id: string;
  is_active: boolean;
}

const defaults: WhatsAppConfig = { provider: 'meta', api_token: '', phone_number_id: '', business_account_id: '', is_active: false };

export function WhatsAppSettings() {
  const [config, setConfig] = useState<WhatsAppConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from('whatsapp_config').select('*').maybeSingle().then(({ data }) => {
      if (data) setConfig(data as any);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { provider: config.provider, api_token: config.api_token, phone_number_id: config.phone_number_id, business_account_id: config.business_account_id, is_active: config.is_active };
    let error;
    if (config.id) {
      ({ error } = await supabase.from('whatsapp_config').update(payload as any).eq('id', config.id));
    } else {
      const res = await supabase.from('whatsapp_config').insert(payload as any).select().single();
      error = res.error;
      if (res.data) setConfig(res.data as any);
    }
    if (error) toast.error('Failed to save'); else toast.success('WhatsApp settings saved!');
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testPhone) { toast.error('Enter a phone number'); return; }
    setTesting(true);
    toast.info('Test WhatsApp feature will be available once the WhatsApp edge function is deployed');
    setTesting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-5 w-5 text-success" /> WhatsApp Business API</CardTitle>
          <CardDescription className="text-xs">
            Send notifications via{' '}
            <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
              Meta WhatsApp Cloud API <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch checked={config.is_active} onCheckedChange={v => setConfig({...config, is_active: v})} />
            <div>
              <Label className="text-sm font-medium">Enable WhatsApp Notifications</Label>
              <p className="text-[10px] text-muted-foreground">Activate WhatsApp Cloud API messaging</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Permanent Access Token</Label>
              <Input type="password" placeholder="Your permanent access token" value={config.api_token} onChange={e => setConfig({...config, api_token: e.target.value})} />
              <p className="text-[9px] text-muted-foreground">Generate from Meta Business Settings → System Users</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number ID</Label>
              <Input placeholder="e.g. 123456789012345" value={config.phone_number_id} onChange={e => setConfig({...config, phone_number_id: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Account ID</Label>
              <Input placeholder="e.g. 123456789012345" value={config.business_account_id} onChange={e => setConfig({...config, business_account_id: e.target.value})} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Send className="h-5 w-5 text-primary" /> Test WhatsApp</CardTitle>
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save WhatsApp Settings
        </Button>
      </div>
    </div>
  );
}
