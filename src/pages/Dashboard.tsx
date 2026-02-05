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
import { 
  Wallet, 
  TrendingUp, 
  History, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Package,
  RefreshCw,
  Gift
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

interface WalletData {
  fiat_balance: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch holdings with coin data
      const { data: holdingsData } = await supabase
        .from('holdings')
        .select(`
          id,
          amount,
          average_buy_price,
          coin:coins(id, name, symbol, price, logo_url)
        `)
        .eq('user_id', user?.id);

      // Fetch transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          price_per_coin,
          total_value,
          status,
          created_at,
          coin:coins(name, symbol)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('fiat_balance')
        .eq('user_id', user?.id)
        .single();

      if (holdingsData) {
        setHoldings(holdingsData as unknown as Holding[]);
      }
      if (txData) {
        setTransactions(txData as unknown as Transaction[]);
      }
      if (walletData) {
        setWallet(walletData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPortfolioValue = holdings.reduce((acc, h) => {
    return acc + (h.amount * (h.coin?.price || 0));
  }, 0);

  const totalInvested = holdings.reduce((acc, h) => {
    return acc + (h.amount * h.average_buy_price);
  }, 0);

  const totalPnL = totalPortfolioValue - totalInvested;
  const pnlPercentage = totalInvested > 0 ? ((totalPnL / totalInvested) * 100) : 0;

  const totalNetWorth = (wallet?.fiat_balance || 0) + totalPortfolioValue;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 w-fit">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </motion.div>

        {/* Portfolio Stats - Responsive Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          {/* Fiat Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="col-span-2 sm:col-span-1"
          >
            {user && wallet && (
              <WalletCard 
                fiatBalance={wallet.fiat_balance} 
                userId={user.id}
                onBalanceChange={fetchData}
              />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Crypto Portfolio
                </CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">
                  KES {totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {holdings.length} coins held
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total P&L
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className={`text-lg sm:text-2xl font-bold flex items-center gap-1 sm:gap-2 ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {totalPnL >= 0 ? <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" />}
                  KES {Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Net Worth
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold gradient-text">
                  KES {totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fiat + Crypto
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Holdings & Transactions - Responsive Tabs */}
        <Tabs defaultValue="holdings" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="holdings" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Crypto </span>Holdings
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Transaction </span>History
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
              Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : holdings.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 sm:py-12 text-center">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No holdings yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Start building your portfolio by purchasing coins
                  </p>
                  <Link to="/launchpad">
                    <Button variant="hero" size="sm">Explore Launchpad</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {holdings.map((holding) => {
                  const currentValue = holding.amount * (holding.coin?.price || 0);
                  const costBasis = holding.amount * holding.average_buy_price;
                  const pnl = currentValue - costBasis;
                  const pnlPercent = costBasis > 0 ? ((pnl / costBasis) * 100) : 0;

                  return (
                    <motion.div
                      key={holding.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Link to={`/coin/${holding.coin?.id}`}>
                        <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {holding.coin?.logo_url ? (
                                  <img 
                                    src={holding.coin.logo_url} 
                                    alt={holding.coin.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base truncate">{holding.coin?.name}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {holding.amount.toLocaleString()} {holding.coin?.symbol}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Value</p>
                                <p className="font-semibold text-sm sm:text-base">
                                  KES {currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">P&L</p>
                                <p className={`font-semibold text-sm sm:text-base ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                </p>
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
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 sm:py-12 text-center">
                  <History className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Your transaction history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {transactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="glass-card">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              tx.type === 'buy' 
                                ? 'bg-success/10 text-success' 
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              {tx.type === 'buy' ? (
                                <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium capitalize text-sm sm:text-base truncate">{tx.type} {tx.coin?.symbol}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm sm:text-base">
                              {tx.amount.toLocaleString()} {tx.coin?.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              KES {tx.total_value.toLocaleString()}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            tx.status === 'completed' 
                              ? 'bg-success/10 text-success'
                              : tx.status === 'pending'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {tx.status}
                          </div>
                        </div>
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