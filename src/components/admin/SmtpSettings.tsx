import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Loader2, Save, Server, ShieldCheck, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SmtpConfig {
  id?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: string;
  is_active: boolean;
}

const defaults: SmtpConfig = {
  host: '', port: 587, username: '', password: '', from_email: '', from_name: '', encryption: 'tls', is_active: false,
};

export function SmtpSettings() {
  const [config, setConfig] = useState<SmtpConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from('smtp_config').select('*').maybeSingle().then(({ data }) => {
      if (data) setConfig(data as any);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { host: config.host, port: config.port, username: config.username, password: config.password, from_email: config.from_email, from_name: config.from_name, encryption: config.encryption, is_active: config.is_active };
    let error;
    if (config.id) {
      ({ error } = await supabase.from('smtp_config').update(payload as any).eq('id', config.id));
    } else {
      const res = await supabase.from('smtp_config').insert(payload as any).select().single();
      error = res.error;
      if (res.data) setConfig(res.data as any);
    }
    if (error) toast.error('Failed to save'); else toast.success('SMTP settings saved!');
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testEmail) { toast.error('Enter a test email'); return; }
    setTesting(true);
    toast.info('Test email feature will be available once SMTP edge function is deployed');
    setTesting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Server className="h-5 w-5 text-primary" /> SMTP Configuration</CardTitle>
          <CardDescription className="text-xs">Configure your email server for sending notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch checked={config.is_active} onCheckedChange={v => setConfig({...config, is_active: v})} />
            <div>
              <Label className="text-sm font-medium">Enable Email Notifications</Label>
              <p className="text-[10px] text-muted-foreground">Activate SMTP email sending</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Host</Label>
              <Input placeholder="smtp.gmail.com" value={config.host} onChange={e => setConfig({...config, host: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Port</Label>
              <Input type="number" value={config.port} onChange={e => setConfig({...config, port: parseInt(e.target.value) || 587})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input type="password" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Email</Label>
              <Input placeholder="noreply@yourdomain.com" value={config.from_email} onChange={e => setConfig({...config, from_email: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Name</Label>
              <Input placeholder="Your Platform" value={config.from_name} onChange={e => setConfig({...config, from_name: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs">Encryption</Label>
            <Select value={config.encryption} onValueChange={v => setConfig({...config, encryption: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Send className="h-5 w-5 text-primary" /> Test Email</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-2">
            <Input placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="max-w-xs" />
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="gap-1">
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save SMTP Settings
        </Button>
      </div>
    </div>
  );
}
