import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Radio, Loader2, Trash2, Plus, Shield, Instagram, Youtube, Twitch, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';

export function LiveStreamManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [selectedCoinId, setSelectedCoinId] = useState('');
  const [forceTitle, setForceTitle] = useState('');

  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['admin-live-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *, 
          coins (id, name, symbol, logo_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allCoins } = useQuery({
    queryKey: ['admin-all-coins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coins')
        .select('id, name, symbol')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: forceDialogOpen,
  });

  const handleEndStream = async (streamId: string) => {
    const { error } = await supabase
      .from('live_streams')
      .update({ is_active: false })
      .eq('id', streamId);
    if (error) { toast.error('Failed to end stream'); return; }
    toast.success('Stream ended');
    queryClient.invalidateQueries({ queryKey: ['admin-live-streams'] });
    queryClient.invalidateQueries({ queryKey: ['live-streams'] });
  };

  const handleForceLive = async () => {
    if (!selectedCoinId || !user) return;
    const { error } = await supabase
      .from('live_streams')
      .insert({
        coin_id: selectedCoinId,
        creator_id: user.id,
        title: forceTitle || 'Live Stream',
        admin_override: true,
        fee_paid: 0,
      });
    if (error) { toast.error('Failed to create live stream'); return; }
    toast.success('Coin is now live!');
    setForceDialogOpen(false);
    setSelectedCoinId('');
    setForceTitle('');
    queryClient.invalidateQueries({ queryKey: ['admin-live-streams'] });
    queryClient.invalidateQueries({ queryKey: ['live-streams'] });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Radio className="h-5 w-5 text-destructive" /> Live Streams
        </h3>
        <Dialog open={forceDialogOpen} onOpenChange={setForceDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Shield className="h-4 w-4" />
              Force Live (Admin Override)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Override: Force Coin Live</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Select Coin</Label>
                <Select onValueChange={setSelectedCoinId} value={selectedCoinId}>
                  <SelectTrigger><SelectValue placeholder="Choose a coin" /></SelectTrigger>
                  <SelectContent>
                    {allCoins?.map((coin) => (
                      <SelectItem key={coin.id} value={coin.id}>{coin.name} ({coin.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input value={forceTitle} onChange={(e) => setForceTitle(e.target.value)} placeholder="Admin Featured Live" />
              </div>
              <Button onClick={handleForceLive} disabled={!selectedCoinId} className="w-full gap-2">
                <Radio className="h-4 w-4" /> Make Live (Free Override)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!liveStreams?.length ? (
        <Card className="glass-card"><CardContent className="py-8 text-center text-muted-foreground">No live streams yet</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {liveStreams.map((stream: any) => (
            <Card key={stream.id} className="glass-card">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {stream.coins?.logo_url ? (
                      <img src={stream.coins.logo_url} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {stream.coins?.symbol?.charAt(0) || '?'}
                      </div>
                    )}
                    {stream.is_active && new Date(stream.expires_at) > new Date() && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-destructive rounded-full border-2 border-background animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{stream.coins?.name || 'Unknown'}</span>
                      {stream.admin_override && <Badge variant="outline" className="text-[10px]"><Shield className="h-2.5 w-2.5 mr-1" />Admin</Badge>}
                      {stream.is_active && new Date(stream.expires_at) > new Date() ? (
                        <Badge variant="destructive" className="text-[10px] animate-pulse">LIVE</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Ended</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{stream.title || 'No title'}</span>
                      <div className="flex gap-1">
                        {stream.instagram_username && <Instagram className="h-3 w-3 text-muted-foreground" />}
                        {stream.youtube_username && <Youtube className="h-3 w-3 text-muted-foreground" />}
                        {stream.tiktok_username && <Music className="h-3 w-3 text-muted-foreground" />}
                        {stream.twitch_username && <Twitch className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">KES {stream.fee_paid}</span>
                  {stream.is_active && new Date(stream.expires_at) > new Date() && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleEndStream(stream.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}