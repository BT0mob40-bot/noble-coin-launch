import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { generateTOTP } from './TwoFactorSetup';

interface TwoFactorVerifyProps {
  userId: string;
  onVerified: () => void;
}

export function TwoFactorVerify({ userId, onVerified }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setVerifying(true);

    // Fetch user's 2FA secret
    const { data: profile } = await supabase.from('profiles')
      .select('two_factor_secret')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile || !(profile as any).two_factor_secret) {
      toast.error('2FA not configured');
      setVerifying(false);
      return;
    }

    const secret = (profile as any).two_factor_secret;
    const now = Math.floor(Date.now() / 30000);
    const valid = [now - 1, now, now + 1].some(t => generateTOTP(secret, t) === code);

    if (!valid) {
      toast.error('Invalid code. Try again.');
      setVerifying(false);
      return;
    }

    toast.success('Verified!');
    onVerified();
    setVerifying(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-display">Two-Factor Authentication</h2>
        <p className="text-muted-foreground text-sm">Enter the code from your authenticator app</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">6-Digit Code</Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl font-bold tracking-widest h-14"
            autoFocus
          />
        </div>

        <Button variant="hero" className="w-full" onClick={handleVerify} disabled={verifying}>
          {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : 'Verify & Continue'}
        </Button>

        <p className="text-[10px] text-center text-muted-foreground">
          Open your authenticator app to get the current code
        </p>
      </div>
    </motion.div>
  );
}
