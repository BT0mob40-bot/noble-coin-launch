import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TradingChart } from '@/components/trading/TradingChart';
import { OrderBook } from '@/components/trading/OrderBook';
import { TradeHistory } from '@/components/trading/TradeHistory';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { MarketStats } from '@/components/trading/MarketStats';
import { CoinInfo } from '@/components/trading/CoinInfo';
import { MpesaPaymentModal } from '@/components/trading/MpesaPaymentModal';
import { CoinContractInfo } from '@/components/coins/CoinContractInfo';
import { ArrowLeft, Loader2, AlertCircle, ArrowDown, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  price: number;
  initial_price: number;
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
  contract_address?: string | null;
}

interface SiteSettings {
  min_buy_amount: number;
  max_buy_amount: number;
  fee_percentage: number;
  admin_commission: number;
}

type PaymentStatus = 'waiting' | 'success' | 'failed' | 'timeout';

export default function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tradingPanelRef = useRef<HTMLDivElement>(null);
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('waiting');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
  const [mobileTab, setMobileTab] = useState<'chart' | 'orderbook' | 'trades'>('chart');

  // Multiplier calculation
  const priceMultiplier = coin && coin.initial_price > 0
    ? coin.price / coin.initial_price
    : 1;

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (user && coin) fetchUserData();
  }, [user, coin]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'buy' && tradingPanelRef.current && !loading) {
      setTimeout(() => {
        tradingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [searchParams, loading, coin]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`coin-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'coins',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setCoin(payload.new as CoinData);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coinResult, settingsResult] = await Promise.all([
        supabase.from('coins').select('*').eq('id', id).maybeSingle(),
        supabase.from('site_settings').select('min_buy_amount, max_buy_amount, fee_percentage, admin_commission').maybeSingle(),
      ]);
      if (coinResult.error) throw coinResult.error;
      if (!coinResult.data) { navigate('/launchpad'); return; }
      setCoin(coinResult.data as CoinData);
      if (settingsResult.data) setSettings(settingsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/launchpad');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!user || !coin) return;
    const [holdingRes, walletRes] = await Promise.all([
      supabase.from('holdings').select('amount').eq('user_id', user.id).eq('coin_id', coin.id).maybeSingle(),
      supabase.from('wallets').select('fiat_balance').eq('user_id', user.id).maybeSingle(),
    ]);
    if (holdingRes.data) setUserHolding(holdingRes.data.amount);
    if (walletRes.data) setUserFiatBalance(walletRes.data.fiat_balance);
  };

  const scrollToTrading = () => {
    tradingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBuy = async (amount: number, phone: string, useWallet: boolean) => {
    if (!user || !coin) { toast.error('Please sign in to buy coins'); return; }

    const totalValue = amount * coin.price;
    const fee = totalValue * (settings.fee_percentage / 100);
    const totalWithFee = totalValue + fee;

    setProcessing(true);
    try {
      if (useWallet) {
        if (totalWithFee > userFiatBalance) { toast.error('Insufficient wallet balance'); setProcessing(false); return; }

        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({ user_id: user.id, coin_id: coin.id, type: 'buy', amount, price_per_coin: coin.price, total_value: totalValue, status: 'completed' })
          .select().single();
        if (txError) throw txError;

        // Deduct wallet, add commission, update holdings, update coin supply
        await Promise.all([
          supabase.from('wallets').update({ fiat_balance: userFiatBalance - totalWithFee }).eq('user_id', user.id),
          supabase.from('commission_transactions').insert({ transaction_id: transaction.id, amount: fee, commission_rate: settings.fee_percentage }),
        ]);

        // Update holdings
        const { data: existingHolding } = await supabase
          .from('holdings').select('id, amount, average_buy_price')
          .eq('user_id', user.id).eq('coin_id', coin.id).maybeSingle();

        if (existingHolding) {
          const newAmount = existingHolding.amount + amount;
          const newAvgPrice = ((existingHolding.amount * existingHolding.average_buy_price) + (amount * coin.price)) / newAmount;
          await supabase.from('holdings').update({ amount: newAmount, average_buy_price: newAvgPrice }).eq('id', existingHolding.id);
        } else {
          await supabase.from('holdings').insert({ user_id: user.id, coin_id: coin.id, amount, average_buy_price: coin.price });
        }

        await supabase.from('coins').update({
          circulating_supply: coin.circulating_supply + amount,
          holders_count: existingHolding ? coin.holders_count : coin.holders_count + 1,
        }).eq('id', coin.id);

        toast.success('Purchase successful! Coins added to your portfolio.');
        fetchUserData();
        fetchData();
      } else {
        // M-PESA buy
        let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
        if (!formattedPhone || formattedPhone.length < 9) { toast.error('Please enter a valid phone number'); setProcessing(false); return; }

        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({ user_id: user.id, coin_id: coin.id, type: 'buy', amount, price_per_coin: coin.price, total_value: totalValue, phone, status: 'pending' })
          .select().single();
        if (txError) throw txError;

        setCurrentTransactionId(transaction.id);
        setPaymentStatus('waiting');
        setShowPaymentModal(true);

        const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
          body: { phone: formattedPhone, amount: Math.round(totalWithFee), transactionId: transaction.id, accountReference: `${coin.symbol}-${transaction.id.slice(0, 8)}` },
        });

        if (stkError || !stkData?.success) {
          setPaymentStatus('failed');
          return;
        }

        toast.success('Check your phone for M-PESA prompt!');
        startPolling(transaction.id, amount);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transaction');
      setPaymentStatus('failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleSell = async (amount: number, toWallet: boolean) => {
    if (!user || !coin) { toast.error('Please sign in to sell coins'); return; }
    if (amount > userHolding) { toast.error('Insufficient balance'); return; }

    setProcessing(true);
    try {
      const totalValue = amount * coin.price;
      const fee = totalValue * (settings.fee_percentage / 100);
      const netValue = totalValue - fee;

      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({ user_id: user.id, coin_id: coin.id, type: 'sell', amount, price_per_coin: coin.price, total_value: totalValue, status: 'completed' })
        .select().single();
      if (error) throw error;

      await supabase.from('commission_transactions').insert({ transaction_id: transaction.id, amount: fee, commission_rate: settings.fee_percentage });

      const newAmount = userHolding - amount;
      if (newAmount <= 0) {
        await supabase.from('holdings').delete().eq('user_id', user.id).eq('coin_id', coin.id);
      } else {
        await supabase.from('holdings').update({ amount: newAmount }).eq('user_id', user.id).eq('coin_id', coin.id);
      }

      await supabase.from('coins').update({
        circulating_supply: coin.circulating_supply - amount,
        holders_count: newAmount <= 0 ? coin.holders_count - 1 : coin.holders_count,
      }).eq('id', coin.id);

      if (toWallet) {
        await supabase.from('wallets').update({ fiat_balance: userFiatBalance + netValue }).eq('user_id', user.id);
        toast.success(`Sold! KES ${netValue.toLocaleString()} added to your wallet.`);
      } else {
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

  const startPolling = (transactionId: string, buyAmount: number) => {
    let attempts = 0;
    const maxAttempts = 40;

    const checkStatus = async () => {
      attempts++;
      const { data: updatedTx } = await supabase
        .from('transactions').select('status').eq('id', transactionId).single();

      if (updatedTx?.status === 'completed') {
        setPaymentStatus('success');
        // Auto-allocate holdings
        if (coin && user) {
          const { data: existingHolding } = await supabase
            .from('holdings').select('id, amount, average_buy_price')
            .eq('user_id', user.id).eq('coin_id', coin.id).maybeSingle();

          if (existingHolding) {
            const newAmt = existingHolding.amount + buyAmount;
            const newAvg = ((existingHolding.amount * existingHolding.average_buy_price) + (buyAmount * coin.price)) / newAmt;
            await supabase.from('holdings').update({ amount: newAmt, average_buy_price: newAvg }).eq('id', existingHolding.id);
          } else {
            await supabase.from('holdings').insert({ user_id: user.id, coin_id: coin.id, amount: buyAmount, average_buy_price: coin.price });
          }

          await supabase.from('coins').update({
            circulating_supply: coin.circulating_supply + buyAmount,
            holders_count: existingHolding ? coin.holders_count : coin.holders_count + 1,
          }).eq('id', coin.id);
        }
        fetchUserData();
        fetchData();
      } else if (updatedTx?.status === 'failed') {
        setPaymentStatus('failed');
      } else if (attempts >= maxAttempts) {
        setPaymentStatus('timeout');
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

  if (!coin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-20 pb-24 lg:pb-8 px-3 sm:px-6">
        {/* Back + Multiplier */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/launchpad"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Launchpad</span>
            <span className="sm:hidden">Back</span>
          </Link>

          {/* Price Multiplier */}
          {priceMultiplier > 1 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/30"
            >
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="font-bold text-success text-sm">
                {priceMultiplier.toFixed(2)}x
              </span>
            </motion.div>
          )}
        </div>

        {/* Trading Paused Warning */}
        {coin.trading_paused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
            <span className="text-warning font-medium text-sm">Trading is currently paused</span>
          </motion.div>
        )}

        {/* Mobile Buy Button - Fixed at bottom */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <Button
            variant="hero"
            size="lg"
            className="w-full gap-2 shadow-xl"
            onClick={scrollToTrading}
          >
            <ArrowDown className="h-5 w-5" />
            Buy {coin.symbol}
          </Button>
        </div>

        {/* Contract Info */}
        {coin.contract_address && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="glass-card">
              <CardContent className="p-3 sm:p-4">
                <CoinContractInfo
                  contractAddress={coin.contract_address}
                  coinName={coin.name}
                  coinSymbol={coin.symbol}
                  coinId={coin.id}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Market Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <MarketStats coin={coin} />
        </motion.div>

        {/* Main Trading Layout */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Mobile: Tabbed Chart/OrderBook/Trades */}
            <div className="lg:hidden">
              <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as typeof mobileTab)}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
                  <TabsTrigger value="orderbook" className="text-xs">Order Book</TabsTrigger>
                  <TabsTrigger value="trades" className="text-xs">Trades</TabsTrigger>
                </TabsList>
                <TabsContent value="chart">
                  <Card className="glass-card overflow-hidden">
                    <CardContent className="p-2 h-[280px]">
                      <TradingChart symbol={coin.symbol} currentPrice={coin.price} volatility={coin.volatility} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="orderbook">
                  <Card className="glass-card">
                    <CardContent className="p-2 h-[300px]">
                      <OrderBook currentPrice={coin.price} symbol={coin.symbol} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="trades">
                  <Card className="glass-card">
                    <CardContent className="p-2 h-[300px]">
                      <TradeHistory currentPrice={coin.price} symbol={coin.symbol} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: Stacked layout */}
            <div className="hidden lg:block space-y-4">
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-4 h-[450px]">
                  <TradingChart symbol={coin.symbol} currentPrice={coin.price} volatility={coin.volatility} />
                </CardContent>
              </Card>

              <div className="grid gap-4 grid-cols-2">
                <Card className="glass-card h-[400px]">
                  <CardContent className="p-4 h-full">
                    <OrderBook currentPrice={coin.price} symbol={coin.symbol} />
                  </CardContent>
                </Card>
                <Card className="glass-card h-[400px]">
                  <CardContent className="p-4 h-full">
                    <TradeHistory currentPrice={coin.price} symbol={coin.symbol} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Coin Info */}
            <Card className="glass-card">
              <CardContent className="p-4 sm:p-6">
                <CoinInfo coin={coin} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trading Panel */}
          <motion.div
            ref={tradingPanelRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-20 h-fit mb-20 lg:mb-0"
            id="trading-panel"
          >
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0 h-[550px] sm:h-[650px]">
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

      {/* M-PESA Payment Modal */}
      <MpesaPaymentModal
        open={showPaymentModal}
        onOpenChange={(v) => {
          setShowPaymentModal(v);
          if (!v) {
            setPaymentStatus('waiting');
            setCurrentTransactionId(null);
          }
        }}
        status={paymentStatus}
        coinSymbol={coin.symbol}
        amount={0}
        onRetry={() => {
          setPaymentStatus('waiting');
          setShowPaymentModal(false);
        }}
      />
    </div>
  );
}
