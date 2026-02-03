import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Coins, Plus, Trash2, Loader2, Search, Star, TrendingUp, 
  CheckCircle, AlertCircle, Flame, Users, BarChart3, Pause, Play 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CoinFormDialog } from './CoinFormDialog';

interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  initial_price: number;
  bonding_curve_factor: number;
  total_supply: number;
  circulating_supply: number;
  burned_supply: number;
  market_cap: number | null;
  liquidity: number;
  holders_count: number;
  is_active: boolean;
  is_featured: boolean;
  is_trending: boolean;
  trading_paused: boolean;
  logo_url: string | null;
  description: string | null;
}

interface CoinManagementProps {
  userId: string;
  isSuperAdmin: boolean;
}

export function CoinManagement({ userId, isSuperAdmin }: CoinManagementProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCoin, setShowCreateCoin] = useState(false);
  const [showBurnDialog, setShowBurnDialog] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [burnAmount, setBurnAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoins(data || []);
    } catch (error) {
      console.error('Error fetching coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoin = async (coinId: string, updates: Partial<Coin>) => {
    try {
      const { error } = await supabase
        .from('coins')
        .update(updates)
        .eq('id', coinId);

      if (error) throw error;
      toast.success('Coin updated successfully!');
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update coin');
    }
  };

  const handleDeleteCoin = async (coinId: string) => {
    if (!confirm('Are you sure you want to delete this coin? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('coins')
        .delete()
        .eq('id', coinId);

      if (error) throw error;
      toast.success('Coin deleted successfully!');
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coin');
    }
  };

  const handleBurnCoins = async () => {
    if (!selectedCoin || !burnAmount) return;

    const amount = parseFloat(burnAmount);
    if (amount <= 0 || amount > selectedCoin.circulating_supply) {
      toast.error('Invalid burn amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('coins')
        .update({
          circulating_supply: selectedCoin.circulating_supply - amount,
          burned_supply: (selectedCoin.burned_supply || 0) + amount,
        })
        .eq('id', selectedCoin.id);

      if (error) throw error;

      toast.success(`Burned ${amount.toLocaleString()} ${selectedCoin.symbol} tokens!`);
      setShowBurnDialog(false);
      setBurnAmount('');
      setSelectedCoin(null);
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to burn coins');
    }
  };

  const filteredCoins = coins.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Coin Management
            </CardTitle>
            <CardDescription>Create, edit, and manage token listings</CardDescription>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48 bg-muted/30"
              />
            </div>
            <Button variant="hero" className="gap-2" onClick={() => setShowCreateCoin(true)}>
              <Plus className="h-4 w-4" />
              Create Coin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coin</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supply</TableHead>
                  <TableHead>Market Cap</TableHead>
                  <TableHead>Holders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoins.map((coin) => (
                  <TableRow key={coin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                          {coin.logo_url ? (
                            <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                          ) : (
                            <Coins className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{coin.name}</p>
                          <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      KES {coin.price.toFixed(6)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Circ: {(coin.circulating_supply / 1000000).toFixed(2)}M</p>
                        <p className="text-muted-foreground">
                          Burned: {(coin.burned_supply / 1000000).toFixed(2)}M
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      KES {((coin.market_cap || 0) / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {coin.holders_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={coin.is_active ? 'default' : 'secondary'} className="text-xs">
                          {coin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {coin.trading_paused && (
                          <Badge variant="outline" className="text-xs text-warning border-warning/50">
                            Paused
                          </Badge>
                        )}
                        {coin.is_featured && (
                          <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">
                            <Star className="h-3 w-3 mr-1" /> Featured
                          </Badge>
                        )}
                        {coin.is_trending && (
                          <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/50">
                            <Flame className="h-3 w-3 mr-1" /> Trending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateCoin(coin.id, { is_featured: !coin.is_featured })}
                          title="Toggle Featured"
                        >
                          <Star className={`h-4 w-4 ${coin.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateCoin(coin.id, { is_trending: !coin.is_trending })}
                          title="Toggle Trending"
                        >
                          <TrendingUp className={`h-4 w-4 ${coin.is_trending ? 'text-success' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateCoin(coin.id, { trading_paused: !coin.trading_paused })}
                          title="Toggle Trading"
                        >
                          {coin.trading_paused ? (
                            <Play className="h-4 w-4 text-success" />
                          ) : (
                            <Pause className="h-4 w-4 text-warning" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateCoin(coin.id, { is_active: !coin.is_active })}
                          title="Toggle Active"
                        >
                          {coin.is_active ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCoin(coin);
                            setShowBurnDialog(true);
                          }}
                          title="Burn Tokens"
                          className="text-orange-400 hover:text-orange-400"
                        >
                          <Flame className="h-4 w-4" />
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCoin(coin.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete Coin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Coin Dialog */}
      <CoinFormDialog
        open={showCreateCoin}
        onOpenChange={setShowCreateCoin}
        onSuccess={fetchCoins}
        userId={userId}
      />

      {/* Burn Dialog */}
      <Dialog open={showBurnDialog} onOpenChange={setShowBurnDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              Burn {selectedCoin?.symbol} Tokens
            </DialogTitle>
            <DialogDescription>
              Permanently remove tokens from circulation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available to Burn:</span>
                <span className="font-mono font-medium">
                  {selectedCoin?.circulating_supply.toLocaleString()} {selectedCoin?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Already Burned:</span>
                <span className="font-mono text-orange-400">
                  {selectedCoin?.burned_supply.toLocaleString()} {selectedCoin?.symbol}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount to Burn</Label>
              <Input
                type="number"
                placeholder="0"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                className="bg-muted/30"
                max={selectedCoin?.circulating_supply}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBurnDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleBurnCoins}
                disabled={!burnAmount || parseFloat(burnAmount) <= 0}
              >
                <Flame className="h-4 w-4" />
                Burn Tokens
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
