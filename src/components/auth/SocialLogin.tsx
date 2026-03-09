import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chrome, MessageCircle } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { useSiteSettings } from '@/lib/site-settings-context';
import { toast } from 'sonner';

export function SocialLogin() {
  const [loading, setLoading] = useState<string | null>(null);
  const { settings } = useSiteSettings();

  const handleGoogleSignIn = async () => {
    if (!settings.google_auth_enabled) {
      toast.error('Google sign-in is currently disabled');
      return;
    }

    try {
      setLoading('google');
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });

      if (error) {
        console.error('Google sign-in error:', error);
        toast.error('Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setLoading(null);
    }
  };

  const handleTelegramSignIn = async () => {
    if (!settings.telegram_auth_enabled) {
      toast.error('Telegram sign-in is currently disabled');
      return;
    }

    try {
      setLoading('telegram');
      // Telegram auth flow - redirect to bot with start parameter
      const botUsername = 'your_bot_username'; // This should come from settings
      const authUrl = `https://t.me/${botUsername}?start=auth`;
      window.open(authUrl, '_blank', 'width=400,height=600');
    } catch (error) {
      console.error('Telegram sign-in error:', error);
      toast.error('Failed to sign in with Telegram');
    } finally {
      setLoading(null);
    }
  };

  const hasEnabledProviders = settings.google_auth_enabled || settings.telegram_auth_enabled;

  if (!hasEnabledProviders) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid gap-3">
        {settings.google_auth_enabled && (
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading === 'google'}
            className="w-full"
          >
            {loading === 'google' ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>
        )}

        {settings.telegram_auth_enabled && (
          <Button
            variant="outline"
            onClick={handleTelegramSignIn}
            disabled={loading === 'telegram'}
            className="w-full"
          >
            {loading === 'telegram' ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            Continue with Telegram
          </Button>
        )}
      </div>
    </div>
  );
}