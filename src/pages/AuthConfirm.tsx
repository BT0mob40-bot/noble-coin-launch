import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('Confirming your email…');

  useEffect(() => {
    const run = async () => {
      const token_hash = params.get('token_hash') || params.get('token');
      const type = (params.get('type') || 'signup') as any;
      const next = params.get('next') || '/';

      // Handle hash-style recovery links (#access_token=...)
      if (!token_hash && window.location.hash.includes('access_token')) {
        setState('success');
        setTimeout(() => navigate(next, { replace: true }), 800);
        return;
      }

      if (!token_hash) {
        setState('error');
        setMessage('Missing confirmation token.');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) {
        setState('error');
        setMessage(error.message || 'Confirmation link is invalid or expired.');
        return;
      }
      setState('success');
      setMessage('Email confirmed! Redirecting…');
      setTimeout(() => navigate(next, { replace: true }), 1000);
    };
    run();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-border/60 text-center space-y-4">
        {state === 'pending' && <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />}
        {state === 'success' && <CheckCircle2 className="h-12 w-12 mx-auto text-success" />}
        {state === 'error' && <XCircle className="h-12 w-12 mx-auto text-destructive" />}
        <h1 className="text-2xl font-semibold">{state === 'success' ? 'Verified' : state === 'error' ? 'Verification failed' : 'Verifying'}</h1>
        <p className="text-muted-foreground">{message}</p>
        {state === 'error' && (
          <Button onClick={() => navigate('/auth', { replace: true })} className="w-full">Back to Sign In</Button>
        )}
      </div>
    </div>
  );
}
