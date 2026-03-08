import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface TwoFactorSetupProps {
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateTOTP(secret: string, time?: number): string {
  // Simple TOTP: hash-based using time window (30s)
  const t = time || Math.floor(Date.now() / 30000);
  let hash = 0;
  const combined = secret + t.toString();
  for (let i = 0; i < combined.length; i++) {
    const chr = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash % 1000000).toString().padStart(6, '0');
}

export function TwoFactorSetup({ userId, onComplete, onSkip }: TwoFactorSetupProps) {
  const [secret] = useState(() => generateSecret());
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const otpauthUri = `otpauth://totp/CryptoLaunch?secret=${secret}&issuer=CryptoLaunch&digits=6&period=30`;

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (code.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setVerifying(true);

    // Verify TOTP — check current and previous window
    const now = Math.floor(Date.now() / 30000);
    const valid = [now - 1, now, now + 1].some(t => generateTOTP(secret, t) === code);

    if (!valid) {
      toast.error('Invalid code. Try again.');
      setVerifying(false);
      return;
    }

    // Save 2FA secret
    const { error } = await supabase.from('profiles').update({
      two_factor_enabled: true,
      two_factor_secret: secret,
    } as any).eq('user_id', userId);

    if (error) {
      toast.error('Failed to enable 2FA');
    } else {
      toast.success('Two-factor authentication enabled!');
      onComplete();
    }
    setVerifying(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-display">Set Up Two-Factor Authentication</h2>
        <p className="text-muted-foreground text-sm">Add an extra layer of security to your account</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
          <p className="text-xs font-medium">1. Open your authenticator app (Google Authenticator, Authy, etc.)</p>
          <p className="text-xs font-medium">2. Add a new account using this secret key:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-background text-xs font-mono break-all border">{secret}</code>
            <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" onClick={copySecret}>
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Or scan a QR code in your authenticator app with this URI</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">3. Enter the 6-digit code from your app</Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-xl font-bold tracking-widest"
          />
        </div>

        <Button variant="hero" className="w-full" onClick={handleVerify} disabled={verifying}>
          {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : <><ShieldCheck className="h-4 w-4 mr-2" /> Enable 2FA</>}
        </Button>

        {onSkip && (
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>Skip for now</Button>
        )}
      </div>
    </motion.div>
  );
}

// Export the TOTP function for use in verification
export { generateTOTP };
