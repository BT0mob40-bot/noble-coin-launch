import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ShieldCheck, ShieldOff, Smartphone, Mail, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TwoFactorSetup, generateTOTP } from './TwoFactorSetup';

interface Props {
  userId: string;
  email: string;
}

export function TwoFactorManager({ userId, email }: Props) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [method, setMethod] = useState<'totp' | 'email'>('totp');
  const [showSetup, setShowSetup] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    supabase.from('profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEnabled(!!data.two_factor_enabled);
          // Email-based 2FA stores 'EMAIL' as marker in two_factor_secret
          setMethod(data.two_factor_secret === 'EMAIL' ? 'email' : 'totp');
        }
        setLoading(false);
      });
  }, [userId]);

  const sendEmailCode = async () => {
    setSending(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    try {
      const { data, error } = await supabase.functions.invoke('smtp-email', {
        body: { type: '2fa_code', email, code, origin: window.location.origin },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any).error);
      toast.success('Verification code sent to your email');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send code');
      setSentCode(null);
    }
    setSending(false);
  };

  const verifyAndEnableEmail = async () => {
    if (emailCode !== sentCode) {
      toast.error('Invalid code');
      return;
    }
    setVerifying(true);
    const { error } = await supabase.from('profiles').update({
      two_factor_enabled: true,
      two_factor_secret: 'EMAIL',
    }).eq('user_id', userId);
    if (error) toast.error('Failed to enable');
    else {
      toast.success('Email 2FA enabled!');
      setEnabled(true);
      setMethod('email');
      setSentCode(null);
      setEmailCode('');
    }
    setVerifying(false);
  };

  const disable2FA = async () => {
    setDisabling(true);
    const { error } = await supabase.from('profiles').update({
      two_factor_enabled: false,
      two_factor_secret: null,
    }).eq('user_id', userId);
    if (error) toast.error('Failed to disable');
    else {
      toast.success('2FA disabled');
      setEnabled(false);
    }
    setDisabling(false);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (showSetup) {
    return (
      <Card className="glass-card mb-4">
        <CardContent className="pt-6">
          <TwoFactorSetup
            userId={userId}
            onComplete={() => { setShowSetup(false); setEnabled(true); setMethod('totp'); }}
            onSkip={() => setShowSetup(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {enabled ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-xs">
          {enabled
            ? `Active — ${method === 'email' ? 'Email codes' : 'Authenticator app (TOTP)'}`
            : 'Add an extra layer of security to your account'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <Button variant="destructive" size="sm" onClick={disable2FA} disabled={disabling} className="w-full">
            {disabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
            Disable 2FA
          </Button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={method === 'totp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMethod('totp')}
                className="gap-1"
              >
                <Smartphone className="h-3.5 w-3.5" /> Authenticator
              </Button>
              <Button
                variant={method === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMethod('email')}
                className="gap-1"
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
            </div>

            {method === 'totp' ? (
              <Button onClick={() => setShowSetup(true)} className="w-full">
                <Smartphone className="h-4 w-4 mr-2" /> Set up Authenticator App
              </Button>
            ) : (
              <div className="space-y-3">
                {!sentCode ? (
                  <Button onClick={sendEmailCode} disabled={sending} className="w-full">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    Send Verification Code to {email}
                  </Button>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">Enter 6-digit code from email</Label>
                    <Input
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="text-center text-lg tracking-widest font-mono"
                    />
                    <Button onClick={verifyAndEnableEmail} disabled={verifying || emailCode.length !== 6} className="w-full">
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Verify & Enable
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSentCode(null); setEmailCode(''); }} className="w-full">
                      Resend / Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
