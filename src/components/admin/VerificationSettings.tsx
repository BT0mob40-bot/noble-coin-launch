import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, Phone, Key, Loader2, Save, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationConfig {
  require_email_verification: boolean;
  require_phone_verification: boolean;
  require_2fa: boolean;
  allow_2fa_optional: boolean;
  email_provider: string;
}

export function VerificationSettings() {
  const [config, setConfig] = useState<VerificationConfig>({
    require_email_verification: true,
    require_phone_verification: false,
    require_2fa: false,
    allow_2fa_optional: true,
    email_provider: 'smtp',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('require_email_verification, require_phone_verification, require_2fa, allow_2fa_optional, email_provider').maybeSingle()
      .then(({ data }) => {
        if (data) setConfig(data as any);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').update({
      require_email_verification: config.require_email_verification,
      require_phone_verification: config.require_phone_verification,
      require_2fa: config.require_2fa,
      allow_2fa_optional: config.allow_2fa_optional,
    } as any).neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) toast.error('Failed to save');
    else toast.success('Verification settings saved!');
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="glass-card">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" /> Verification & Security</CardTitle>
        <CardDescription className="text-xs">Control which verification steps users must complete</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        {/* Current email provider info */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] text-muted-foreground">
            Email provider: <strong className="text-foreground">{config.email_provider === 'lovable' ? 'Built-in (Lovable)' : 'Custom SMTP'}</strong> — Change in Integrations → Email / SMTP
          </span>
        </div>

        {/* Email Verification */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Email Verification</Label>
              <Switch checked={config.require_email_verification} onCheckedChange={v => setConfig({...config, require_email_verification: v})} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Users must verify email before signing in.</p>
          </div>
        </div>

        {/* Phone Verification */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="p-2 rounded-lg bg-success/10 mt-0.5">
            <Phone className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Phone OTP Verification</Label>
              <Switch checked={config.require_phone_verification} onCheckedChange={v => setConfig({...config, require_phone_verification: v})} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Users must verify phone number via SMS OTP after login.</p>
            {config.require_phone_verification && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-warning">
                <AlertTriangle className="h-3 w-3" />
                Ensure Africa's Talking SMS is configured in Integrations
              </div>
            )}
          </div>
        </div>

        {/* 2FA Required */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="p-2 rounded-lg bg-warning/10 mt-0.5">
            <Key className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Require 2FA (TOTP)</Label>
              <Switch checked={config.require_2fa} onCheckedChange={v => setConfig({...config, require_2fa: v})} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Force all users to set up two-factor authentication.</p>
          </div>
        </div>

        {/* Optional 2FA */}
        {!config.require_2fa && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="p-2 rounded-lg bg-accent/10 mt-0.5">
              <ShieldCheck className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Allow Optional 2FA</Label>
                <Switch checked={config.allow_2fa_optional} onCheckedChange={v => setConfig({...config, allow_2fa_optional: v})} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Let users optionally enable 2FA from their profile settings.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Security Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
