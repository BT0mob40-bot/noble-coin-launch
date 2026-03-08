import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface PhoneVerificationProps {
  userId: string;
  onVerified: () => void;
  onSkip?: () => void;
}

export function PhoneVerification({ userId, onVerified, onSkip }: PhoneVerificationProps) {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Fetch user's phone
    supabase.from('profiles').select('phone').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data?.phone) setPhone(data.phone); });
  }, [userId]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const sendOtp = async () => {
    if (!phone) { toast.error('Phone number required'); return; }
    setSending(true);
    try {
      // Generate OTP and store
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      await supabase.from('phone_otps').insert({
        user_id: userId,
        phone,
        otp_code: otpCode,
        expires_at: expiresAt,
      } as any);

      // Try to send via SMS edge function (falls back to showing OTP in toast for now)
      try {
        await supabase.functions.invoke('send-sms-otp', {
          body: { phone, otp_code: otpCode },
        });
        toast.success(`OTP sent to ${phone}`);
      } catch {
        // Fallback: show in toast for development
        toast.info(`Dev mode OTP: ${otpCode}`, { duration: 30000 });
      }

      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter complete 6-digit code'); return; }
    setVerifying(true);
    try {
      const { data, error } = await supabase
        .from('phone_otps')
        .select('*')
        .eq('user_id', userId)
        .eq('otp_code', code)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        toast.error('Invalid OTP code');
        setVerifying(false);
        return;
      }

      if (new Date((data as any).expires_at) < new Date()) {
        toast.error('OTP expired. Please request a new one.');
        setVerifying(false);
        return;
      }

      if ((data as any).attempts >= 5) {
        toast.error('Too many attempts. Request a new OTP.');
        setVerifying(false);
        return;
      }

      // Mark verified
      await supabase.from('phone_otps').update({ verified: true } as any).eq('id', (data as any).id);
      await supabase.from('profiles').update({ phone_verified: true } as any).eq('user_id', userId);

      toast.success('Phone verified successfully!');
      onVerified();
    } catch (err: any) {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Phone className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-display">Verify Your Phone</h2>
        <p className="text-muted-foreground text-sm">We'll send a 6-digit code to verify your number</p>
      </div>

      {!otpSent ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
            </div>
          </div>
          <Button variant="hero" className="w-full" onClick={sendOtp} disabled={sending}>
            {sending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : 'Send Verification Code'}
          </Button>
          {onSkip && (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>Skip for now</Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">Enter the code sent to <strong>{phone}</strong></p>
          <div className="flex justify-center gap-2">
            {otp.map((digit, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold"
              />
            ))}
          </div>
          <Button variant="hero" className="w-full" onClick={verifyOtp} disabled={verifying}>
            {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : <><ShieldCheck className="h-4 w-4 mr-2" /> Verify Code</>}
          </Button>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={sendOtp} disabled={countdown > 0 || sending} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" />
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Button>
          </div>
          {onSkip && (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>Skip for now</Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
