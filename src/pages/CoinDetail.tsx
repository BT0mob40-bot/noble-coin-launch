import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { SpiralLoader } from '@/components/ui/spiral-loader';
import { TradingChart } from '@/components/trading/TradingChart';
import { OrderBook } from '@/components/trading/OrderBook';
import { TradeHistory } from '@/components/trading/TradeHistory';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { MarketStats } from '@/components/trading/MarketStats';
import { CoinInfo } from '@/components/trading/CoinInfo';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  price: number;
  market_cap: number | null;
  liquidity: number;
  holders_count: number;
  volatility: number;
  total_supply: number;
  circulating_supply: number;
  burned_supply?: number;
  is_trending: boolean;
  is_featured: boolean;
  trading_paused: boolean;
  logo_url: string | null;
  whitepaper_url: string | null;
}

interface SiteSettings {
  min_buy_amount: number;
  max_buy_amount: number;
  fee_percentage: number;
  admin_commission: number;
}

export default function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [userHolding, setUserHolding] = useState<number>(0);
  const [userFiatBalance, setUserFiatBalance] = useState<number>(0);
  const [settings, setSettings] = useState<SiteSettings>({
    min_buy_amount: 100,
    max_buy_amount: 100000,
    fee_percentage: 2.5,
    admin_commission: 2.5,
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (user && coin) {
      fetchUserData();
    }
  }, [user, coin]);

  // Real-time subscription for coin price updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`coin-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coins',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Real-time coin update:', payload.new);
          setCoin(payload.new as CoinData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coinResult, settingsResult] = await Promise.all([
        supabase.from('coins').select('*').eq('id', id).maybeSingle(),
        supabase.from('site_settings').select('min_buy_amount, max_buy_amount, fee_percentage, admin_commission').maybeSingle(),
      ]);

      if (coinResult.error) throw coinResult.error;
      if (!coinResult.data) {
        navigate('/launchpad');
        return;
      }
      setCoin(coinResult.data);

      if (settingsResult.data) {
        setSettings(settingsResult.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/launchpad');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!user || !coin) return;
    
    // Fetch holding
    const { data: holdingData } = await supabase
      .from('holdings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('coin_id', coin.id)
      .maybeSingle();

    if (holdingData) {
      setUserHolding(holdingData.amount);
    }

    // Fetch wallet
    const { data: walletData } = await supabase
      .from('wallets')
      .select('fiat_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletData) {
      setUserFiatBalance(walletData.fiat_balance);
    }
  };

  const handleBuy = async (amount: number, phone: string, useWallet: boolean) => {
    if (!user || !coin) {
      toast.error('Please sign in to buy coins');
      return;
    }

    const totalValue = amount * coin.price;
    const fee = totalValue * (settings.fee_percentage / 100);
    const totalWithFee = totalValue + fee;

    setProcessing(true);
    try {
      if (useWallet) {
        // Buy with wallet balance
        if (totalWithFee > userFiatBalance) {
          toast.error('Insufficient wallet balance');
          setProcessing(false);
          return;
        }

        // Create transaction
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            coin_id: coin.id,
            type: 'buy',
            amount: amount,
            price_per_coin: coin.price,
            total_value: totalValue,
            status: 'completed',
          })
          .select()
          .single();

        if (txError) throw txError;

        // Deduct from wallet
        await supabase
          .from('wallets')
          .update({ fiat_balance: userFiatBalance - totalWithFee })
          .eq('user_id', user.id);

        // Add commission record
        await supabase
          .from('commission_transactions')
          .insert({
            transaction_id: transaction.id,
            amount: fee,
            commission_rate: settings.fee_percentage,
          });

        // Update holdings
        const { data: existingHolding } = await supabase
          .from('holdings')
          .select('id, amount, average_buy_price')
          .eq('user_id', user.id)
          .eq('coin_id', coin.id)
          .maybeSingle();

        if (existingHolding) {
          const newAmount = existingHolding.amount + amount;
          const newAvgPrice = ((existingHolding.amount * existingHolding.average_buy_price) + (amount * coin.price)) / newAmount;
          await supabase
            .from('holdings')
            .update({ amount: newAmount, average_buy_price: newAvgPrice })
            .eq('id', existingHolding.id);
        } else {
          await supabase
            .from('holdings')
            .insert({
              user_id: user.id,
              coin_id: coin.id,
              amount: amount,
              average_buy_price: coin.price,
            });
        }

        // Update coin circulating supply (triggers bonding curve)
        await supabase
          .from('coins')
          .update({ 
            circulating_supply: coin.circulating_supply + amount,
            holders_count: existingHolding ? coin.holders_count : coin.holders_count + 1
          })
          .eq('id', coin.id);

        toast.success('Purchase successful!');
        fetchUserData();
        fetchData();
      } else {
        // Buy with M-PESA
        let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
        if (!formattedPhone || formattedPhone.length < 9) {
          toast.error('Please enter a valid phone number');
          setProcessing(false);
          return;
        }

        // Create transaction record
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            coin_id: coin.id,
            type: 'buy',
            amount: amount,
            price_per_coin: coin.price,
            total_value: totalValue,
            phone: phone,
            status: 'pending',
          })
          .select()
          .single();

        if (txError) throw txError;

        // Show payment modal
        setCurrentTransactionId(transaction.id);
        setShowPaymentModal(true);
        setWaitingForPayment(true);

        // Initiate STK Push
        const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
          body: {
            phone: formattedPhone,
            amount: Math.round(totalWithFee),
            transactionId: transaction.id,
            accountReference: `${coin.symbol}-${transaction.id.slice(0, 8)}`,
          },
        });

        if (stkError || !stkData?.success) {
          console.error('STK Push error:', stkError);
          toast.error(stkData?.error || 'Failed to initiate M-PESA payment');
          setWaitingForPayment(false);
          setShowPaymentModal(false);
          return;
        }

        toast.success('Check your phone for M-PESA prompt!');
        startPolling(transaction.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transaction');
      setWaitingForPayment(false);
      setShowPaymentModal(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleSell = async (amount: number, toWallet: boolean) => {
    if (!user || !coin) {
      toast.error('Please sign in to sell coins');
      return;
    }

    if (amount > userHolding) {
      toast.error('Insufficient balance');
      return;
    }

    setProcessing(true);
    try {
      const totalValue = amount * coin.price;
      const fee = totalValue * (settings.fee_percentage / 100);
      const netValue = totalValue - fee;

      // Create transaction
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          coin_id: coin.id,
          type: 'sell',
          amount: amount,
          price_per_coin: coin.price,
          total_value: totalValue,
          status: 'completed',
        })
        .select()
        .single();

      if (error) throw error;

      // Add commission record
      await supabase
        .from('commission_transactions')
        .insert({
          transaction_id: transaction.id,
          amount: fee,
          commission_rate: settings.fee_percentage,
        });

      // Deduct from holdings
      const newAmount = userHolding - amount;
      if (newAmount <= 0) {
        await supabase
          .from('holdings')
          .delete()
          .eq('user_id', user.id)
          .eq('coin_id', coin.id);
      } else {
        await supabase
          .from('holdings')
          .update({ amount: newAmount })
          .eq('user_id', user.id)
          .eq('coin_id', coin.id);
      }

      // Update coin circulating supply (triggers bonding curve)
      await supabase
        .from('coins')
        .update({ 
          circulating_supply: coin.circulating_supply - amount,
          holders_count: newAmount <= 0 ? coin.holders_count - 1 : coin.holders_count
        })
        .eq('id', coin.id);

      if (toWallet) {
        // Add to fiat wallet
        await supabase
          .from('wallets')
          .update({ fiat_balance: userFiatBalance + netValue })
          .eq('user_id', user.id);
        toast.success(`Sold! KES ${netValue.toLocaleString()} added to your wallet.`);
      } else {
        // In production, this would trigger B2C payment
        toast.success('Sell order placed! Funds will be sent to your M-PESA.');
      }

      fetchUserData();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transaction');
    } finally {
      setProcessing(false);
    }
  };

  const startPolling = (transactionId: string) => {
    const checkStatus = async () => {
      const { data: updatedTx } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transactionId)
        .single();

      if (updatedTx?.status === 'completed') {
        setWaitingForPayment(false);
        setShowPaymentModal(false);
        toast.success('Payment successful! Coins added to your wallet.');
        fetchUserData();
        fetchData();
      } else if (updatedTx?.status === 'failed') {
        setWaitingForPayment(false);
        setShowPaymentModal(false);
        toast.error('Payment failed or was cancelled.');
      } else {
        setTimeout(checkStatus, 3000);
      }
    };

    setTimeout(checkStatus, 5000);
  };

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

  if (!coin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-20 pb-8">
        {/* Back Button */}
        <Link 
          to="/launchpad" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Launchpad
        </Link>

        {/* Trading Paused Warning */}
        {coin.trading_paused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-warning" />
            <span className="text-warning font-medium">Trading is currently paused for this coin</span>
          </motion.div>
        )}

        {/* Market Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <MarketStats coin={coin} />
        </motion.div>

        {/* Main Trading Layout */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left Column - Chart & Order Book */}
          <div className="space-y-4">
            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-4 h-[450px]">
                  <TradingChart 
                    symbol={coin.symbol} 
                    currentPrice={coin.price} 
                    volatility={coin.volatility} 
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Order Book & Trade History */}
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="glass-card h-[400px]">
                  <CardContent className="p-4 h-full">
                    <OrderBook currentPrice={coin.price} symbol={coin.symbol} />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="glass-card h-[400px]">
                  <CardContent className="p-4 h-full">
                    <TradeHistory currentPrice={coin.price} symbol={coin.symbol} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Coin Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card">
                <CardContent className="p-6">
                  <CoinInfo coin={coin} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Trading Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-20 h-fit"
          >
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0 h-[650px]">
                <TradingPanel
                  symbol={coin.symbol}
                  currentPrice={coin.price}
                  userBalance={userHolding}
                  userFiatBalance={userFiatBalance}
                  minBuyAmount={settings.min_buy_amount}
                  maxBuyAmount={settings.max_buy_amount}
                  feePercentage={settings.fee_percentage}
                  onBuy={handleBuy}
                  onSell={handleSell}
                  processing={processing}
                  isAuthenticated={!!user}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Payment</DialogTitle>
            <DialogDescription>
              Please check your phone and enter your M-PESA PIN
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-8">
            {waitingForPayment ? (
              <>
                <SpiralLoader size="lg" />
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-center text-muted-foreground"
                >
                  Waiting for payment confirmation...
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mt-2 text-sm text-primary"
                >
                  Do not close this window
                </motion.p>
              </>
            ) : (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
