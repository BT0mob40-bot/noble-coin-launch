import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletCard } from '@/components/wallet/WalletCard';
import { ReferralCard } from '@/components/referral/ReferralCard';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, TrendingUp, History, Coins, ArrowUpRight, ArrowDownRight,
  Loader2, Package, RefreshCw, Gift, DollarSign, ArrowDownToLine, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Holding {
  id: string;
  amount: number;
  average_buy_price: number;
  coin: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    logo_url: string | null;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  price_per_coin: number;
  total_value: number;
  status: string;
  created_at: string;
  coin: {
    name: string;
    symbol: string;
  };
}

interface Withdrawal {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  phone: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [fiatBalance, setFiatBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // Realtime updates for holdings and wallet
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holdings', filter: `user_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_withdrawals', filter: `user_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [holdingsRes, txRes, walletRes, withdrawalRes] = await Promise.all([
        supabase.from('holdings').select('id, amount, average_buy_price, coin:coins(id, name, symbol, price, logo_url)').eq('user_id', user?.id),
        supabase.from('transactions').select('id, type, amount, price_per_coin, total_value, status, created_at, coin:coins(name, symbol)').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('wallets').select('fiat_balance').eq('user_id', user?.id!).maybeSingle(),
        supabase.from('wallet_withdrawals').select('*').eq('user_id', user?.id!).order('created_at', { ascending: false }).limit(20),
      ]);
      if (holdingsRes.data) setHoldings(holdingsRes.data as unknown as Holding[]);
      if (txRes.data) setTransactions(txRes.data as unknown as Transaction[]);
      if (withdrawalRes.data) setWithdrawals(withdrawalRes.data as Withdrawal[]);
      
      if (walletRes.data) {
        setFiatBalance(walletRes.data.fiat_balance);
      } else if (!walletRes.error || walletRes.error.code === 'PGRST116') {
        const { data: newWallet } = await supabase.from('wallets').upsert({ user_id: user?.id!, fiat_balance: 0 }, { onConflict: 'user_id' }).select('fiat_balance').single();
        if (newWallet) setFiatBalance(newWallet.fiat_balance);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPortfolioValue = holdings.reduce((acc, h) => acc + (h.amount * (h.coin?.price || 0)), 0);
  const totalInvested = holdings.reduce((acc, h) => acc + (h.amount * h.average_buy_price), 0);
  const totalPnL = totalPortfolioValue - totalInvested;
  const pnlPercentage = totalInvested > 0 ? ((totalPnL / totalInvested) * 100) : 0;
  const totalNetWorth = fiatBalance + totalPortfolioValue;

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'approved' || w.status === 'processing');

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    if (status === 'pending' || status === 'approved' || status === 'processing') return <Clock className="h-3.5 w-3.5 text-warning" />;
    return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'bg-success/10 text-success border-success/30';
    if (status === 'pending' || status === 'approved' || status === 'processing') return 'bg-warning/10 text-warning border-warning/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      
      <main className="w-full max-w-7xl mx-auto pt-16 sm:pt-20 pb-16 px-2 sm:px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6"
        >
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display mb-0.5">Portfolio</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 w-fit text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </motion.div>

        {/* Pending Withdrawals Alert */}
        {pendingWithdrawals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 text-warning text-xs sm:text-sm">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{pendingWithdrawals.length} withdrawal{pendingWithdrawals.length > 1 ? 's' : ''} pending approval</span>
              <span className="text-muted-foreground ml-auto font-mono">
                KES {pendingWithdrawals.reduce((s, w) => s + Number(w.amount), 0).toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}

        {/* Portfolio Stats */}
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="col-span-2 lg:col-span-1">
            {user && (
              <WalletCard fiatBalance={fiatBalance} userId={user.id} onBalanceChange={fetchData} />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-2.5 sm:p-4 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Crypto Assets</CardTitle>
                <Coins className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-2.5 pt-0 sm:p-4 sm:pt-0">
                <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono">
                  KES {totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{holdings.length} coins</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-2.5 sm:p-4 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">P&L</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-2.5 pt-0 sm:p-4 sm:pt-0">
                <div className={`text-base sm:text-xl lg:text-2xl font-bold font-mono flex items-center gap-1 ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {totalPnL >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  KES {Math.abs(totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className={`text-[10px] sm:text-xs mt-0.5 ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-2.5 sm:p-4 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Net Worth</CardTitle>
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-2.5 pt-0 sm:p-4 sm:pt-0">
                <div className="text-base sm:text-xl lg:text-2xl font-bold gradient-text font-mono">
                  KES {totalNetWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Fiat + Crypto</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Holdings, Transactions, Withdrawals, Referrals */}
        <Tabs defaultValue="holdings" className="space-y-3 sm:space-y-4">
          <TabsList className="w-full grid grid-cols-4 h-9 sm:h-10">
            <TabsTrigger value="holdings" className="gap-1 text-[10px] sm:text-xs">
              <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Holdings
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1 text-[10px] sm:text-xs">
              <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> History
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-1 text-[10px] sm:text-xs relative">
              <ArrowDownToLine className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Withdrawals
              {pendingWithdrawals.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning text-[9px] text-warning-foreground flex items-center justify-center font-bold">
                  {pendingWithdrawals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1 text-[10px] sm:text-xs">
              <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : holdings.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 sm:py-12 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm sm:text-base font-semibold mb-1">No holdings yet</h3>
                  <p className="text-muted-foreground mb-3 text-xs sm:text-sm">Start building your portfolio</p>
                  <Link to="/launchpad"><Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground">Explore Launchpad</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {holdings.map((holding) => {
                  const currentValue = holding.amount * (holding.coin?.price || 0);
                  const costBasis = holding.amount * holding.average_buy_price;
                  const pnl = currentValue - costBasis;
                  const pnlPercent = costBasis > 0 ? ((pnl / costBasis) * 100) : 0;
                  return (
                    <motion.div key={holding.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Link to={`/coin/${holding.coin?.id}`}>
                        <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer">
                          <CardContent className="p-2.5 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {holding.coin?.logo_url ? <img src={holding.coin.logo_url} alt={holding.coin.name} className="h-full w-full object-cover" /> : <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-xs sm:text-sm truncate">{holding.coin?.name}</h4>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">{holding.amount.toLocaleString()} {holding.coin?.symbol}</p>
                              </div>
                              <div className={`text-right ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {pnl >= 0 ? <ArrowUpRight className="h-4 w-4 ml-auto" /> : <ArrowDownRight className="h-4 w-4 ml-auto" />}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Value</p>
                                <p className="font-semibold text-xs sm:text-sm font-mono">KES {currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              </div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Avg Buy</p>
                                <p className="font-mono text-xs">{holding.average_buy_price.toFixed(4)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">P&L</p>
                                <p className={`font-semibold text-xs sm:text-sm ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>{pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : transactions.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 text-center">
                  <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm font-semibold mb-1">No transactions yet</h3>
                  <p className="text-muted-foreground text-xs">Your transaction history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {transactions.map((tx) => (
                  <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="glass-card">
                      <CardContent className="p-2.5 sm:p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'buy' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {tx.type === 'buy' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium capitalize text-xs sm:text-sm truncate">{tx.type} {tx.coin?.symbol}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-xs sm:text-sm font-mono">{tx.amount.toLocaleString()} {tx.coin?.symbol}</p>
                            <p className="text-[10px] text-muted-foreground">KES {tx.total_value.toLocaleString()}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${statusColor(tx.status)}`}>
                            {tx.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdrawals">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : withdrawals.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 text-center">
                  <ArrowDownToLine className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm font-semibold mb-1">No withdrawals yet</h3>
                  <p className="text-muted-foreground text-xs">Your withdrawal history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {withdrawals.map((w) => (
                  <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="glass-card">
                      <CardContent className="p-2.5 sm:p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {statusIcon(w.status)}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs sm:text-sm">Withdraw to {w.phone}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(w.created_at).toLocaleDateString()} {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-xs sm:text-sm font-mono">KES {Number(w.amount).toLocaleString()}</p>
                            <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground">
                              <span>Fee: KES {Number(w.fee_amount).toLocaleString()}</span>
                              <span>→</span>
                              <span className="text-foreground font-medium">KES {Number(w.net_amount).toLocaleString()}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(w.status)}`}>
                            {w.status}
                          </Badge>
                        </div>
                        {w.admin_note && w.status === 'rejected' && (
                          <div className="mt-2 p-2 rounded bg-destructive/5 border border-destructive/10 text-[10px] text-destructive">
                            Reason: {w.admin_note}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            {user && <ReferralCard userId={user.id} />}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
