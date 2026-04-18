import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/lib/site-settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Rocket, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState(0);

  const [searchParams] = useSearchParams();
  const customToken = searchParams.get('token');

  useEffect(() => {
    // Custom SMTP token-based reset (works on ANY domain)
    if (customToken) {
      setIsRecovery(true);
      return;
    }
    // Fallback: Supabase recovery hash flow (built-in Lovable emails)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setIsRecovery(true);
        else {
          toast.error('Invalid or expired reset link');
          navigate('/auth');
        }
      });
    }
  }, [navigate, customToken]);

  const checkStrength = (pwd: string) => {
    let s = 0;
    if (pwd.length >= 6) s++;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    setStrength(s);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    checkStrength(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (customToken) {
        // Custom SMTP token flow — works on any domain
        const { data, error } = await supabase.functions.invoke('reset-password-confirm', {
          body: { token: customToken, password },
        });
        if (error) throw new Error(error.message || 'Reset failed');
        const result = data as any;
        if (result?.ok === false) throw new Error(result.error || 'Reset failed');
      } else {
        // Built-in Supabase recovery
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/auth'), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel - desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="flex items-center gap-3 mb-12">
            <Link to="/" className="flex items-center gap-3">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.site_name} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Rocket className="h-7 w-7 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl font-bold font-display gradient-text">{settings.site_name}</span>
            </Link>
          </div>
          <div className="space-y-4 max-w-md">
            <ShieldCheck className="h-16 w-16 text-primary/60" />
            <h1 className="text-3xl font-bold font-display">Secure Your Account</h1>
            <p className="text-muted-foreground">Choose a strong password to protect your trading account and assets.</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.site_name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Rocket className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-bold font-display gradient-text">{settings.site_name}</span>
            </Link>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>Home</Button>
          </div>

          {success ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold font-display">Password Updated!</h2>
              <p className="text-muted-foreground text-sm">Your password has been changed successfully. Redirecting to sign in...</p>
              <div className="pt-2">
                <Button variant="outline" onClick={() => navigate('/auth')}>Go to Sign In</Button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold font-display">Set New Password</h1>
                <p className="text-muted-foreground text-sm">Choose a strong password for your account</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : 'bg-muted'}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] ${strength >= 4 ? 'text-success' : strength >= 2 ? 'text-warning' : 'text-destructive'}`}>
                        {strengthLabels[strength]}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-destructive">Passwords do not match</p>
                  )}
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Password
                </Button>
              </form>

              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Back to Sign In
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
