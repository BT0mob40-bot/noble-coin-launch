import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSiteSettings } from '@/lib/site-settings-context';
import { toast } from 'sonner';
import { Loader2, Radio, Wallet, Instagram, Youtube, Twitch, Music } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const goLiveSchema = z.object({
  coin_id: z.string().min(1, 'Please select a coin'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be under 100 characters'),
  description: z.string().optional(),
  instagram_username: z.string().optional(),
  youtube_username: z.string().optional(),
  tiktok_username: z.string().optional(),
  twitch_username: z.string().optional(),
  kick_username: z.string().optional(),
}).refine((data) => {
  // At least one social media username must be provided
  return data.instagram_username || data.youtube_username || data.tiktok_username || 
         data.twitch_username || data.kick_username;
}, {
  message: "At least one social media username is required",
  path: ["instagram_username"]
});

type GoLiveFormData = z.infer<typeof goLiveSchema>;

interface GoLiveDialogProps {
  children: React.ReactNode;
}

export function GoLiveDialog({ children }: GoLiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  const form = useForm<GoLiveFormData>({
    resolver: zodResolver(goLiveSchema),
    defaultValues: {
      coin_id: '',
      title: '',
      description: '',
      instagram_username: '',
      youtube_username: '',
      tiktok_username: '',
      twitch_username: '',
      kick_username: '',
    },
  });

  // Fetch user's coins
  const { data: userCoins } = useQuery({
    queryKey: ['user-coins', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('coins')
        .select('id, name, symbol, logo_url')
        .eq('creator_id', user.id)
        .eq('is_active', true)
        .eq('is_approved', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  // Check wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('fiat_balance')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const onSubmit = async (data: GoLiveFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Check if user has sufficient balance
      if (!wallet || wallet.fiat_balance < settings.live_fee) {
        toast.error(`Insufficient balance. You need KES ${settings.live_fee} to go live.`);
        return;
      }

      // Create live stream
      const { error: streamError } = await supabase
        .from('live_streams')
        .insert({
          coin_id: data.coin_id,
          creator_id: user.id,
          title: data.title,
          description: data.description,
          instagram_username: data.instagram_username || null,
          youtube_username: data.youtube_username || null,
          tiktok_username: data.tiktok_username || null,
          twitch_username: data.twitch_username || null,
          kick_username: data.kick_username || null,
          fee_paid: settings.live_fee,
        });

      if (streamError) throw streamError;

      // Deduct fee from wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ fiat_balance: wallet.fiat_balance - settings.live_fee })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      toast.success('🔴 You are now LIVE! Your coin is featured in the live section.');
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error going live:', error);
      toast.error('Failed to go live. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformIcons = {
    instagram: <Instagram className="h-4 w-4 text-pink-600" />,
    youtube: <Youtube className="h-4 w-4 text-red-600" />,
    tiktok: <Music className="h-4 w-4" />,
    twitch: <Twitch className="h-4 w-4 text-purple-600" />,
    kick: <div className="h-4 w-4 bg-green-600 rounded" />,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            Go Live
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gradient-to-r from-destructive/10 via-destructive/5 to-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">Live Fee: KES {settings.live_fee}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Balance: KES {wallet?.fiat_balance || 0} • Duration: 24 hours
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="coin_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Coin</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose which coin to promote" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userCoins?.map((coin) => (
                        <SelectItem key={coin.id} value={coin.id}>
                          <div className="flex items-center gap-2">
                            {coin.logo_url && (
                              <img src={coin.logo_url} alt={coin.name} className="h-5 w-5 rounded" />
                            )}
                            <span>{coin.name} ({coin.symbol})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., 'Discussing our new token features!'" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Tell viewers what to expect..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Where are you going live? (At least one required)</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="instagram_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {platformIcons.instagram}
                          </div>
                          <Input {...field} placeholder="Instagram @username" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="youtube_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {platformIcons.youtube}
                          </div>
                          <Input {...field} placeholder="YouTube @channel" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiktok_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {platformIcons.tiktok}
                          </div>
                          <Input {...field} placeholder="TikTok @username" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twitch_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {platformIcons.twitch}
                          </div>
                          <Input {...field} placeholder="Twitch username" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kick_username"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {platformIcons.kick}
                          </div>
                          <Input {...field} placeholder="Kick username" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !wallet || wallet.fiat_balance < settings.live_fee}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>🔴 Go Live - KES {settings.live_fee}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}