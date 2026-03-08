import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { useSiteSettings } from '@/lib/site-settings-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Mail, Key, MessageCircle, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; email: string | null }>({ full_name: null, phone: null, email: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('user_id', user!.id)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('user_id', user!.id);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      setProfile(prev => ({ ...prev, full_name: fullName, phone }));
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);

    // First verify current/temporary password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });

    if (signInError) {
      toast.error('Current password is incorrect');
      setChangingPassword(false);
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(`Failed to change password: ${error.message}`);
    } else {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  const telegramBotUrl = settings.telegram_url || '#';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="w-full max-w-2xl mx-auto pt-20 pb-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold font-display mb-6">My Profile</h1>

          {/* Personal Information */}
          <Card className="glass-card mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 mt-1 p-2.5 rounded-md bg-muted/30 border border-border/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.email}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="254712345678" className="mt-1" />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="glass-card mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" /> Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Enter your current or temporary password (from Telegram bot) and set a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-xs text-muted-foreground">Current / Temporary Password</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-xs text-muted-foreground">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="mt-1" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword} variant="outline" className="w-full">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Link Telegram */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" /> Telegram Bot
              </CardTitle>
              <CardDescription className="text-xs">
                Link your Telegram account to trade, check portfolio, and reset your password via our bot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href={telegramBotUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Open Telegram Bot
                </Button>
              </a>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Use <code>/link {user?.email} YourPassword</code> in the bot to connect your account.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
