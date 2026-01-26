import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  History, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Package
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

export default function Dashboard() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

      if (holdingsData) {
        setHoldings(holdingsData as unknown as Holding[]);
      }
      if (txData) {
        setTransactions(txData as unknown as Transaction[]);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold font-display mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email?.split('@')[0]}
          </p>
        </motion.div>

        {/* Portfolio Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Portfolio Value
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total P&L
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-2 ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {totalPnL >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  KES {Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invested
                </CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all positions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Holdings & Transactions */}
        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="holdings" className="gap-2">
              <Coins className="h-4 w-4" />
              Holdings
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <History className="h-4 w-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : holdings.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your portfolio by purchasing coins
                  </p>
                  <Link to="/launchpad">
                    <Button variant="hero">Explore Launchpad</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
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
                      <Card className="glass-card hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                {holding.coin?.logo_url ? (
                                  <img 
                                    src={holding.coin.logo_url} 
                                    alt={holding.coin.name}
                                    className="h-8 w-8 rounded-lg object-cover"
                                  />
                                ) : (
                                  <Coins className="h-6 w-6 text-primary" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold">{holding.coin?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {holding.amount.toLocaleString()} {holding.coin?.symbol}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                KES {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              <p className={`text-sm ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground">
                    Your transaction history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              tx.type === 'buy' 
                                ? 'bg-success/10 text-success' 
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              {tx.type === 'buy' ? (
                                <ArrowDownRight className="h-5 w-5" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium capitalize">{tx.type} {tx.coin?.symbol}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {tx.amount.toLocaleString()} {tx.coin?.symbol}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              KES {tx.total_value.toLocaleString()}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
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
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
