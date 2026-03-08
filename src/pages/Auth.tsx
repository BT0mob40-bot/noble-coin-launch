import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useSiteSettings } from '@/lib/site-settings-context';
import { useReferral, getReferralCode, clearReferralCode } from '@/hooks/use-referral';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, Loader2, Mail, Lock, AlertCircle, Gift, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(9, 'Phone number is required'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading } = useAuth();
  const { settings } = useSiteSettings();
  useReferral();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const storedRef = getReferralCode();
    const urlRef = searchParams.get('ref');
    setReferralCode(urlRef || storedRef);
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const processReferral = async (newUserId: string) => {
    const refCode = getReferralCode();
    if (!refCode) return;
    try {
      const { data: referrerProfile } = await supabase.from('profiles').select('user_id').eq('referral_code', refCode).maybeSingle();
      if (referrerProfile && referrerProfile.user_id !== newUserId) {
        await supabase.from('referrals').insert({ referrer_id: referrerProfile.user_id, referred_id: newUserId });
        await supabase.from('profiles').update({ referred_by: refCode }).eq('user_id', newUserId);
        clearReferralCode();
      }
    } catch (error) { console.error('Error processing referral:', error); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { toast.error('Enter your email'); return; }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email!');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (activeTab === 'signin') {
      const result = signInSchema.safeParse({ email, password });
      if (!result.success) { setError(result.error.errors[0].message); return; }
    } else {
      const result = signUpSchema.safeParse({ email, password, fullName, phone });
      if (!result.success) { setError(result.error.errors[0].message); return; }
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message.includes('Invalid login credentials') ? 'Invalid email or password.' : error.message);
        } else {
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message.includes('already registered') ? 'This email is already registered.' : error.message);
        } else {
          // Update profile with full name and phone after signup
          // This will be done after email confirmation via the handle_new_user trigger
          // Store locally for now
          const tempData = { fullName, phone };
          localStorage.setItem('signup_profile_data', JSON.stringify(tempData));
          setSuccess('Account created! Please check your email to verify, then sign in.');
          setActiveTab('signin');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // After sign in, update profile if we have stored signup data
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem('signup_profile_data');
      if (stored) {
        const { fullName, phone } = JSON.parse(stored);
        supabase.from('profiles').update({ full_name: fullName, phone }).eq('user_id', user.id).then(() => {
          localStorage.removeItem('signup_profile_data');
        });
        processReferral(user.id);
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <Link to="/" className="flex items-center gap-3 mb-12">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_name} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Rocket className="h-7 w-7 text-primary-foreground" />
              </div>
            )}
            <span className="text-2xl font-bold font-display gradient-text">{settings.site_name}</span>
          </Link>
          <h1 className="text-4xl font-bold font-display mb-4">
            Trade Crypto with<br /><span className="gradient-text">M-PESA</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Join thousands of traders on Africa's first crypto launchpad with mobile money integration.
          </p>
          {settings.telegram_url && (
            <a href={settings.telegram_url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline text-sm">
              🤖 Trade via Telegram Bot
            </a>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
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
          </div>

          {referralCode && activeTab === 'signup' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
              <Gift className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">You've been referred!</p>
                <p className="text-xs text-muted-foreground">Create your account to get started</p>
              </div>
            </motion.div>
          )}

          {/* Forgot Password Overlay */}
          {showForgotPassword ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-bold font-display">Forgot Password</h2>
                <p className="text-muted-foreground text-sm">Enter your email to receive a reset link</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button variant="hero" className="w-full" onClick={handleForgotPassword} disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                  Back to Sign In
                </Button>
              </div>
            </motion.div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold font-display">Welcome Back</h2>
                    <p className="text-muted-foreground text-sm">Sign in to access your portfolio</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">{success}</div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold font-display">Create Account</h2>
                    <p className="text-muted-foreground text-sm">Start trading crypto with M-PESA</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                      </div>
                      <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : 'Create Account'}
                    </Button>
                  </form>
                  <p className="text-xs text-center text-muted-foreground">
                    By creating an account, you agree to our{' '}
                    <Link to="/terms" className="text-primary hover:underline">Terms</Link>{' '}and{' '}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </div>
    </div>
  );
}
