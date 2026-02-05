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
import { Rocket, Loader2, Mail, Lock, AlertCircle, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading } = useAuth();
  const { settings } = useSiteSettings();
  
  // Capture referral code from URL
  useReferral();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check for stored referral code
  useEffect(() => {
    const storedRef = getReferralCode();
    const urlRef = searchParams.get('ref');
    setReferralCode(urlRef || storedRef);
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      // Redirect based on role - admins go to admin panel, users go to dashboard
      // We'll let the auth context handle role loading, then redirect
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const processReferral = async (newUserId: string) => {
    const refCode = getReferralCode();
    if (!refCode) return;

    try {
      // Find the referrer by referral code
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', refCode)
        .maybeSingle();

      if (referrerProfile && referrerProfile.user_id !== newUserId) {
        // Create referral relationship
        await supabase.from('referrals').insert({
          referrer_id: referrerProfile.user_id,
          referred_id: newUserId,
        });

        // Update new user's profile with referred_by
        await supabase
          .from('profiles')
          .update({ referred_by: refCode })
          .eq('user_id', newUserId);

        // Clear the referral code after successful processing
        clearReferralCode();
      }
    } catch (error) {
      console.error('Error processing referral:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate input
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(error.message);
          }
        } else {
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('Account created successfully! You can now sign in.');
          setActiveTab('signin');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
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
            Trade Crypto with<br />
            <span className="gradient-text">M-PESA</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Join thousands of traders on Africa's first crypto launchpad with mobile money integration.
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
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

          {/* Referral Banner */}
          {referralCode && activeTab === 'signup' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3"
            >
              <Gift className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">You've been referred!</p>
                <p className="text-xs text-muted-foreground">Create your account to get started</p>
              </div>
            </motion.div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8">
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
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
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
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters
                    </p>
                  </div>

                  <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}