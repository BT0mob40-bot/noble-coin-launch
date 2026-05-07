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
import { Rocket, Loader2, Mail, Lock, AlertCircle, Gift, Phone, User, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';
import { SocialLogin } from '@/components/auth/SocialLogin';

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

type AuthStep = 'auth' | 'phone_verify' | '2fa_setup' | '2fa_verify';

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

  // OTP login state
  const [otpStage, setOtpStage] = useState<'request' | 'verify'>('request');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Verification flow state
  const [authStep, setAuthStep] = useState<AuthStep>('auth');
  const [verificationSettings, setVerificationSettings] = useState({
    require_phone_verification: false,
    require_2fa: false,
    allow_2fa_optional: true,
  });

  useEffect(() => {
    const storedRef = getReferralCode();
    const urlRef = searchParams.get('ref');
    setReferralCode(urlRef || storedRef);
  }, [searchParams]);

  // Fetch verification settings
  useEffect(() => {
    supabase.from('site_settings').select('require_phone_verification, require_2fa, allow_2fa_optional').maybeSingle()
      .then(({ data }) => {
        if (data) setVerificationSettings(data as any);
      });
  }, []);

  // Handle post-login verification flow
  useEffect(() => {
    if (user && !loading && authStep === 'auth') {
      checkVerificationSteps(user.id);
    }
  }, [user, loading, authStep]);

  const checkVerificationSteps = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('phone_verified, two_factor_enabled, phone').eq('user_id', userId).maybeSingle();
    
    if (!profile) { navigate('/dashboard', { replace: true }); return; }

    // Check phone verification
    if (verificationSettings.require_phone_verification && !profile.phone_verified && profile.phone) {
      setAuthStep('phone_verify');
      return;
    }

    // Check 2FA
    if (verificationSettings.require_2fa && !profile.two_factor_enabled) {
      setAuthStep('2fa_setup');
      return;
    }

    if (profile.two_factor_enabled) {
      setAuthStep('2fa_verify');
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  const processReferral = async (newUserId: string) => {
    const refCode = getReferralCode();
    if (!refCode) return;

    // Server-side claim is idempotent and updates both profile + referral row.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await (supabase.rpc as any)('claim_referral', { _referral_code: refCode });
        if (error) throw error;
        if (data?.ok || data?.already_claimed || data?.reason === 'invalid_referrer') {
          clearReferralCode();
          sessionStorage.setItem(`ref_processed_${newUserId}`, '1');
          return;
        }
      } catch (error) {
        console.warn(`Referral attempt ${attempt + 1} failed:`, error);
      }
      // Backoff before retry — let the handle_new_user trigger finish
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { toast.error('Enter your email'); return; }
    setForgotLoading(true);
    try {
      // Check email provider preference
      const { data: siteData } = await supabase.from('site_settings').select('email_provider').maybeSingle();
      const provider = (siteData as any)?.email_provider || 'smtp';

      if (provider === 'smtp') {
        const { data, error } = await supabase.functions.invoke('smtp-email', {
          body: {
            type: 'password_reset',
            email: forgotEmail,
            redirect_to: `${window.location.origin}/reset-password`,
            origin: window.location.origin,
          },
        });

        // Edge function now always returns 200 with { ok, error } — surface real error
        if (error) throw new Error(error.message || 'Failed to invoke email function');
        const result = data as any;
        if (result?.ok === false) throw new Error(result.error || 'SMTP send failed');
        // Fall through to Lovable built-in if provider says so
        if (result?.provider === 'lovable') {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (resetErr) throw resetErr;
        }
      } else {
        // Use default Lovable/Supabase emails
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      }
      toast.success('Password reset link sent to your email!');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpEmail) { toast.error('Enter your email'); return; }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-login-otp', {
        body: { email: otpEmail, origin: window.location.origin, create_user: true },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any).error || 'Failed to send OTP');
      toast.success('Code sent! Check your email.');
      setOtpStage('verify');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) { toast.error('Enter the 6-digit code'); return; }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;
      if (!data.session) throw new Error('No session created');
      toast.success('Signed in!');
      // useEffect on user will handle the rest of the verification flow
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired code');
    } finally {
      setOtpLoading(false);
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
        }
        // Post-login checks handled by useEffect
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message.includes('already registered') ? 'This email is already registered.' : error.message);
        } else {
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

  // After sign in, update profile if we have stored signup data + retry referral
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem('signup_profile_data');
      if (stored) {
        const { fullName, phone } = JSON.parse(stored);
        supabase.from('profiles').update({ full_name: fullName, phone } as any).eq('user_id', user.id).then(() => {
          localStorage.removeItem('signup_profile_data');
        });
      }
      // Always retry referral on login if a code is still pending and not yet processed
      if (getReferralCode() && !sessionStorage.getItem(`ref_processed_${user.id}`)) {
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

  // Verification steps
  if (authStep === 'phone_verify' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <PhoneVerification
          userId={user.id}
          onVerified={() => {
            if (verificationSettings.require_2fa) {
              setAuthStep('2fa_setup');
            } else {
              navigate('/dashboard', { replace: true });
            }
          }}
          onSkip={verificationSettings.require_phone_verification ? undefined : () => navigate('/dashboard', { replace: true })}
        />
      </div>
    );
  }

  if (authStep === '2fa_setup' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <TwoFactorSetup
          userId={user.id}
          onComplete={() => navigate('/dashboard', { replace: true })}
          onSkip={verificationSettings.require_2fa ? undefined : () => navigate('/dashboard', { replace: true })}
        />
      </div>
    );
  }

  if (authStep === '2fa_verify' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <TwoFactorVerify
          userId={user.id}
          onVerified={() => navigate('/dashboard', { replace: true })}
        />
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
          <div className="flex items-center justify-between mb-12">
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
            <Button variant="outline" onClick={() => navigate('/')} className="text-sm">
              Home
            </Button>
          </div>
          <h1 className="text-4xl font-bold font-display mb-4">
            Trade Crypto with<br /><span className="gradient-text">M-PESA</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Join thousands of traders on Africa's first crypto launchpad with mobile money integration.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
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
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="text-sm">
              Home
            </Button>
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
                <TabsTrigger value="signin">{activeTab === 'signup' ? 'Sign Up' : 'Sign In'}</TabsTrigger>
                <TabsTrigger value="otp">Email Code</TabsTrigger>
              </TabsList>

              <TabsContent value="otp">
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold font-display">Login with Email Code</h2>
                    <p className="text-muted-foreground text-sm">
                      {otpStage === 'request'
                        ? 'We will email you a 6-digit code'
                        : `Enter the code sent to ${otpEmail}`}
                    </p>
                  </div>
                  {otpStage === 'request' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="you@example.com" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} className="pl-10" />
                        </div>
                      </div>
                      <Button variant="hero" className="w-full" onClick={handleSendOtp} disabled={otpLoading}>
                        {otpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Send Code
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>6-digit code</Label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="123456"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="pl-10 tracking-widest text-center text-lg font-mono"
                          />
                        </div>
                      </div>
                      <Button variant="hero" className="w-full" onClick={handleVerifyOtp} disabled={otpLoading}>
                        {otpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Verify & Sign In
                      </Button>
                      <div className="flex justify-between text-xs">
                        <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setOtpStage('request'); setOtpCode(''); }}>
                          Use different email
                        </button>
                        <button type="button" className="text-primary hover:underline" onClick={handleSendOtp} disabled={otpLoading}>
                          Resend code
                        </button>
                      </div>
                    </div>
                  )}
                  <SocialLogin />
                </div>
              </TabsContent>

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
                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => { setActiveTab('signup'); setError(null); }} className="text-primary font-medium hover:underline">
                      Create account
                    </button>
                  </p>
                  <SocialLogin />
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
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setActiveTab('signin'); setError(null); }} className="text-primary font-medium hover:underline">
                      Sign in
                    </button>
                  </p>
                  <SocialLogin />
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
