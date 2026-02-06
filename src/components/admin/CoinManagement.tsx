import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Coins, Plus, Trash2, Loader2, Search, Star, TrendingUp,
  CheckCircle, AlertCircle, Flame, Users, Pause, Play, Eye, EyeOff, Edit2, Copy
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
  is_approved: boolean;
  approval_status: string | null;
  creation_fee_paid: boolean;
  trading_paused: boolean;
  logo_url: string | null;
  description: string | null;
  contract_address: string | null;
  creator_id: string | null;
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
  const [showHoldersDialog, setShowHoldersDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [burnAmount, setBurnAmount] = useState('');
  const [holdersCount, setHoldersCount] = useState('');
  const [initialPrice, setInitialPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchCoins(); }, []);

  const fetchCoins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('coins').select('*').order('created_at', { ascending: false });
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
      const { error } = await supabase.from('coins').update(updates).eq('id', coinId);
      if (error) throw error;
      toast.success('Coin updated!');
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update coin');
    }
  };

  const handleDeleteCoin = async (coinId: string) => {
    if (!confirm('Delete this coin permanently?')) return;
    try {
      const { error } = await supabase.from('coins').delete().eq('id', coinId);
      if (error) throw error;
      toast.success('Coin deleted!');
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coin');
    }
  };

  const handleBurnCoins = async () => {
    if (!selectedCoin || !burnAmount) return;
    const amount = parseFloat(burnAmount);
    if (amount <= 0 || amount > selectedCoin.circulating_supply) { toast.error('Invalid burn amount'); return; }

    try {
      const { error } = await supabase.from('coins').update({
        circulating_supply: selectedCoin.circulating_supply - amount,
        burned_supply: (selectedCoin.burned_supply || 0) + amount,
      }).eq('id', selectedCoin.id);
      if (error) throw error;
      toast.success(`Burned ${amount.toLocaleString()} ${selectedCoin.symbol}!`);
      setShowBurnDialog(false); setBurnAmount(''); setSelectedCoin(null);
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to burn coins');
    }
  };

  const handleUpdateHolders = async () => {
    if (!selectedCoin || !holdersCount) return;
    try {
      const { error } = await supabase.from('coins').update({
        holders_count: parseInt(holdersCount),
      }).eq('id', selectedCoin.id);
      if (error) throw error;
      toast.success('Holders count updated!');
      setShowHoldersDialog(false); setHoldersCount(''); setSelectedCoin(null);
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApproveCoin = async () => {
    if (!selectedCoin) return;
    const price = parseFloat(initialPrice);
    if (!price || price <= 0) { toast.error('Please set a valid initial price'); return; }

    try {
      const { error } = await supabase.from('coins').update({
        is_approved: true,
        approval_status: 'approved',
        initial_price: price,
        price: price,
        is_active: true,
      }).eq('id', selectedCoin.id);
      if (error) throw error;
      toast.success(`${selectedCoin.name} approved!`);
      setShowApproveDialog(false); setInitialPrice(''); setSelectedCoin(null);
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRejectCoin = async (coinId: string) => {
    try {
      const { error } = await supabase.from('coins').update({
        approval_status: 'rejected',
        is_active: false,
      }).eq('id', coinId);
      if (error) throw error;
      toast.success('Coin rejected');
      fetchCoins();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyContract = async (address: string) => {
    await navigator.clipboard.writeText(address);
    toast.success('Contract address copied!');
  };

  const filteredCoins = coins.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.contract_address && c.contract_address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingCoins = filteredCoins.filter(c => c.approval_status === 'pending' && c.creation_fee_paid);
  const unpaidCoins = filteredCoins.filter(c => !c.creation_fee_paid);
  const activeCoins = filteredCoins.filter(c => c.approval_status !== 'pending' || !c.creation_fee_paid);

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Coins className="h-5 w-5" />
              Coin Management
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Create, edit, and manage token listings</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coins or contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-56 bg-muted/30 h-9"
              />
            </div>
            <Button variant="hero" className="gap-2 h-9" onClick={() => setShowCreateCoin(true)}>
              <Plus className="h-4 w-4" />
              Create Coin
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Pending Approvals */}
          {isSuperAdmin && pendingCoins.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Pending Approval ({pendingCoins.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingCoins.map((coin) => (
                  <Card key={coin.id} className="border-warning/30 bg-warning/5 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                        {coin.logo_url ? (
                          <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                        ) : (
                          <Coins className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{coin.name}</p>
                        <p className="text-xs text-muted-foreground">{coin.symbol}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto text-warning border-warning/50 text-xs">
                        Pending
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => { setSelectedCoin(coin); setShowApproveDialog(true); }}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRejectCoin(coin.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coin</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="hidden sm:table-cell">Supply</TableHead>
                    <TableHead className="hidden md:table-cell">Holders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCoins.map((coin) => (
                    <TableRow key={coin.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {coin.logo_url ? (
                              <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                            ) : (
                              <Coins className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{coin.name}</p>
                            <p className="text-xs text-muted-foreground">{coin.symbol}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">
                        KES {coin.price.toFixed(6)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="text-xs">
                          <p>Circ: {(coin.circulating_supply / 1000000).toFixed(2)}M</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3" />
                          {coin.holders_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {!coin.creation_fee_paid && (
                            <Badge variant="outline" className="text-xs text-destructive border-destructive/50">
                              Unpaid
                            </Badge>
                          )}
                          {coin.approval_status === 'pending' && (
                            <Badge variant="outline" className="text-xs text-warning border-warning/50">
                              Pending
                            </Badge>
                          )}
                          {coin.is_approved && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                          {coin.is_featured && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">
                              <Star className="h-3 w-3 mr-0.5" />
                            </Badge>
                          )}
                          {coin.is_trending && (
                            <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/50">
                              <Flame className="h-3 w-3 mr-0.5" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          {/* Contract address copy */}
                          {coin.contract_address && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyContract(coin.contract_address!)} title="Copy Contract">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Super Admin only actions */}
                          {isSuperAdmin && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateCoin(coin.id, { is_featured: !coin.is_featured })} title="Toggle Featured">
                                <Star className={`h-3.5 w-3.5 ${coin.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateCoin(coin.id, { is_trending: !coin.is_trending })} title="Toggle Trending">
                                <TrendingUp className={`h-3.5 w-3.5 ${coin.is_trending ? 'text-success' : ''}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateCoin(coin.id, { trading_paused: !coin.trading_paused })} title="Toggle Trading">
                                {coin.trading_paused ? <Play className="h-3.5 w-3.5 text-success" /> : <Pause className="h-3.5 w-3.5 text-warning" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateCoin(coin.id, { is_active: !coin.is_active })} title="Toggle Active">
                                {coin.is_active ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedCoin(coin); setHoldersCount(String(coin.holders_count)); setShowHoldersDialog(true); }} title="Edit Holders">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-400 hover:text-orange-400" onClick={() => { setSelectedCoin(coin); setShowBurnDialog(true); }} title="Burn Tokens">
                            <Flame className="h-3.5 w-3.5" />
                          </Button>
                          {isSuperAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCoin(coin.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CoinFormDialog open={showCreateCoin} onOpenChange={setShowCreateCoin} onSuccess={fetchCoins} userId={userId} isSuperAdmin={isSuperAdmin} />

      {/* Burn Dialog */}
      <Dialog open={showBurnDialog} onOpenChange={setShowBurnDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-400" /> Burn {selectedCoin?.symbol}</DialogTitle>
            <DialogDescription>Permanently remove tokens from circulation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              Available: <span className="font-mono font-medium">{selectedCoin?.circulating_supply.toLocaleString()} {selectedCoin?.symbol}</span>
            </div>
            <div className="space-y-2">
              <Label>Amount to Burn</Label>
              <Input type="number" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} className="bg-muted/30" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowBurnDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleBurnCoins} disabled={!burnAmount || parseFloat(burnAmount) <= 0}>
                <Flame className="h-4 w-4" /> Burn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Holders Dialog */}
      <Dialog open={showHoldersDialog} onOpenChange={setShowHoldersDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Edit Holders - {selectedCoin?.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Holders Count</Label>
              <Input type="number" value={holdersCount} onChange={(e) => setHoldersCount(e.target.value)} className="bg-muted/30" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowHoldersDialog(false)}>Cancel</Button>
              <Button variant="hero" className="flex-1" onClick={handleUpdateHolders}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Coin Dialog - Super Admin sets initial price */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /> Approve {selectedCoin?.name}</DialogTitle>
            <DialogDescription>Set the initial price for this coin. After approval, price will be driven by market activity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Initial Price (KES)</Label>
              <Input
                type="number"
                placeholder="0.001"
                value={initialPrice}
                onChange={(e) => setInitialPrice(e.target.value)}
                className="bg-muted/30 text-lg font-mono"
                step="0.000001"
              />
              <p className="text-xs text-muted-foreground">This sets the starting price. Market activity and bonding curve will adjust it dynamically.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
              <Button variant="success" className="flex-1 gap-2" onClick={handleApproveCoin} disabled={!initialPrice || parseFloat(initialPrice) <= 0}>
                <CheckCircle className="h-4 w-4" /> Approve & List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
