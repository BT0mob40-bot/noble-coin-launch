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
  price_change_24h?: number;
  creator_id?: string | null;
}

interface SiteSettings {
  min_buy_amount: number;
  max_buy_amount: number;
  fee_percentage: number;
  admin_commission: number;
  creator_commission_percentage?: number;
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
    min_buy_amount: 100, max_buy_amount: 100000, fee_percentage: 2.5, admin_commission: 2.5,
  });
  const [processing, setProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chart' | 'orderbook' | 'trades'>('chart');
  const [pendingBuyAmount, setPendingBuyAmount] = useState(0);

  const priceMultiplier = coin && coin.initial_price > 0 ? coin.price / coin.initial_price : 1;

  useEffect(() => { if (id) fetchData(); }, [id]);
  useEffect(() => { if (user && coin) fetchUserData(); }, [user, coin]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'buy' && tradingPanelRef.current && !loading) {
      setTimeout(() => {
        tradingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [searchParams, loading, coin]);

  // Realtime coin updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`coin-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coins', filter: `id=eq.${id}` },
        (payload) => { setCoin(payload.new as CoinData); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Realtime transaction status for M-PESA polling
  useEffect(() => {
    if (!currentTransactionId) return;
    const channel = supabase
      .channel(`tx-${currentTransactionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${currentTransactionId}` },
        (payload: any) => {
          if (payload.new.status === 'completed') {
            setPaymentStatus('success');
            fetchUserData();
            fetchData();
          } else if (payload.new.status === 'failed') {
            setPaymentStatus('failed');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentTransactionId]);

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
      if (settingsResult.data) setSettings(settingsResult.data as SiteSettings);
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
    else setUserHolding(0);
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

        // Deduct from wallet
        await supabase.from('wallets').update({ fiat_balance: userFiatBalance - totalWithFee }).eq('user_id', user.id);

        // Commission to admin
        await supabase.from('commission_transactions').insert({ transaction_id: transaction.id, amount: fee, commission_rate: settings.fee_percentage });

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

        // Update coin supply (triggers bonding curve)
        await supabase.from('coins').update({
          circulating_supply: coin.circulating_supply + amount,
          holders_count: existingHolding ? coin.holders_count : coin.holders_count + 1,
        }).eq('id', coin.id);

        // Creator earning
        if (coin.creator_id && coin.creator_id !== user.id && settings.creator_commission_percentage) {
          const creatorEarning = totalValue * (settings.creator_commission_percentage / 100);
          const { data: cw } = await supabase.from('wallets').select('fiat_balance').eq('user_id', coin.creator_id).single();
          if (cw) {
            await supabase.from('wallets').update({ fiat_balance: cw.fiat_balance + creatorEarning }).eq('user_id', coin.creator_id);
          }
        }

        toast.success('Purchase successful!');
        fetchUserData();
        fetchData();
      } else {
        // M-PESA payment
        let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
        if (!formattedPhone || formattedPhone.length < 9) { toast.error('Please enter a valid phone number'); setProcessing(false); return; }

        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({ user_id: user.id, coin_id: coin.id, type: 'buy', amount, price_per_coin: coin.price, total_value: totalValue, phone, status: 'pending' })
          .select().single();
        if (txError) throw txError;

        setCurrentTransactionId(transaction.id);
        setPendingBuyAmount(amount);
        setPaymentStatus('waiting');
        setShowPaymentModal(true);

        const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
          body: { phone: formattedPhone, amount: Math.round(totalWithFee), transactionId: transaction.id, accountReference: `${coin.symbol}-${transaction.id.slice(0, 8)}` },
        });

        if (stkError || (stkData && !stkData.success)) {
          setPaymentStatus('failed');
          return;
        }
        toast.success('Check your phone for M-PESA prompt!');

        // Polling fallback (realtime should handle it but just in case)
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

      // Commission
      await supabase.from('commission_transactions').insert({ transaction_id: transaction.id, amount: fee, commission_rate: settings.fee_percentage });

      // Update holdings
      const newAmount = userHolding - amount;
      if (newAmount <= 0) {
        await supabase.from('holdings').delete().eq('user_id', user.id).eq('coin_id', coin.id);
      } else {
        await supabase.from('holdings').update({ amount: newAmount }).eq('user_id', user.id).eq('coin_id', coin.id);
      }

      // Reduce supply (triggers bonding curve - price goes down!)
      await supabase.from('coins').update({
        circulating_supply: Math.max(0, coin.circulating_supply - amount),
        holders_count: newAmount <= 0 ? Math.max(0, coin.holders_count - 1) : coin.holders_count,
      }).eq('id', coin.id);

      // Credit wallet
      if (toWallet) {
        await supabase.from('wallets').update({ fiat_balance: userFiatBalance + netValue }).eq('user_id', user.id);
        toast.success(`Sold! KES ${netValue.toLocaleString()} added to wallet.`);
      } else {
        toast.success('Sell order placed!');
      }

      // Creator earning on sell too
      if (coin.creator_id && coin.creator_id !== user.id && settings.creator_commission_percentage) {
        const creatorEarning = totalValue * (settings.creator_commission_percentage / 100);
        const { data: cw } = await supabase.from('wallets').select('fiat_balance').eq('user_id', coin.creator_id).single();
        if (cw) {
          await supabase.from('wallets').update({ fiat_balance: cw.fiat_balance + creatorEarning }).eq('user_id', coin.creator_id);
        }
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
      const { data: updatedTx } = await supabase.from('transactions').select('status').eq('id', transactionId).single();
      if (updatedTx?.status === 'completed') {
        setPaymentStatus('success');
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto pt-16 sm:pt-20 pb-24 lg:pb-8 px-2 sm:px-4 md:px-6">
        {/* Back + Multiplier */}
        <div className="flex items-center justify-between mb-3">
          <Link to="/launchpad" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Launchpad</span>
            <span className="sm:hidden">Back</span>
          </Link>
          {priceMultiplier > 1 && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 border border-success/30">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="font-bold text-success text-xs">{priceMultiplier.toFixed(2)}x</span>
            </motion.div>
          )}
        </div>

        {coin.trading_paused && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-2.5 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
            <span className="text-warning font-medium text-xs">Trading is currently paused</span>
          </motion.div>
        )}

        {/* Mobile Buy Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/90 backdrop-blur-lg border-t border-border/50">
          <Button variant="hero" size="lg" className="w-full gap-2 shadow-xl h-11" onClick={scrollToTrading}>
            <ArrowDown className="h-4 w-4" /> Buy {coin.symbol}
          </Button>
        </div>

        {/* Contract Info */}
        {coin.contract_address && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
            <Card className="glass-card">
              <CardContent className="p-2.5 sm:p-4">
                <CoinContractInfo contractAddress={coin.contract_address} coinName={coin.name} coinSymbol={coin.symbol} coinId={coin.id} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Market Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <MarketStats coin={coin} priceChange24h={coin.price_change_24h || 0} />
        </motion.div>

        {/* Main Trading Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-3 sm:gap-4">
          <div className="space-y-3 min-w-0 w-full overflow-hidden">
            {/* Mobile: Tabbed */}
            <div className="lg:hidden w-full">
              <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as typeof mobileTab)}>
                <TabsList className="w-full grid grid-cols-3 h-9">
                  <TabsTrigger value="chart" className="text-[10px] sm:text-xs">Chart</TabsTrigger>
                  <TabsTrigger value="orderbook" className="text-[10px] sm:text-xs">Order Book</TabsTrigger>
                  <TabsTrigger value="trades" className="text-[10px] sm:text-xs">Trades</TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="mt-2">
                  <Card className="glass-card overflow-hidden">
                    <CardContent className="p-1 h-[220px] sm:h-[280px]">
                      <TradingChart symbol={coin.symbol} currentPrice={coin.price} volatility={coin.volatility} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="orderbook" className="mt-2">
                  <Card className="glass-card overflow-hidden">
                    <CardContent className="p-1 h-[260px] overflow-auto">
                      <OrderBook currentPrice={coin.price} symbol={coin.symbol} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="trades" className="mt-2">
                  <Card className="glass-card overflow-hidden">
                    <CardContent className="p-1 h-[260px] overflow-auto">
                      <TradeHistory currentPrice={coin.price} symbol={coin.symbol} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block space-y-4">
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-4 h-[450px]">
                  <TradingChart symbol={coin.symbol} currentPrice={coin.price} volatility={coin.volatility} />
                </CardContent>
              </Card>
              <div className="grid gap-4 grid-cols-2">
                <Card className="glass-card h-[400px] overflow-hidden">
                  <CardContent className="p-4 h-full overflow-auto">
                    <OrderBook currentPrice={coin.price} symbol={coin.symbol} />
                  </CardContent>
                </Card>
                <Card className="glass-card h-[400px] overflow-hidden">
                  <CardContent className="p-4 h-full overflow-auto">
                    <TradeHistory currentPrice={coin.price} symbol={coin.symbol} />
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="glass-card">
              <CardContent className="p-3 sm:p-6">
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
            className="lg:sticky lg:top-20 h-fit mb-20 lg:mb-0 min-w-0 w-full"
            id="trading-panel"
          >
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0 min-h-[450px] sm:min-h-[500px]">
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

      <MpesaPaymentModal
        open={showPaymentModal}
        onOpenChange={(v) => {
          setShowPaymentModal(v);
          if (!v) { setPaymentStatus('waiting'); setCurrentTransactionId(null); }
        }}
        status={paymentStatus}
        coinSymbol={coin.symbol}
        amount={pendingBuyAmount * coin.price}
        onRetry={() => { setPaymentStatus('waiting'); setShowPaymentModal(false); }}
      />
    </div>
  );
}
