import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useStkPolling } from '@/hooks/use-stk-polling';
import { ArrowLeft, Loader2, AlertCircle, ArrowDown, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PriceAlertDialog } from '@/components/trading/PriceAlertDialog';
import { usePushNotifications, usePriceAlerts } from '@/hooks/use-push-notifications';
import { useLiveMarketMetrics } from '@/hooks/use-live-market-metrics';

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
  // Override fields
  use_market_cap_override?: boolean;
  market_cap_override?: number | null;
  use_liquidity_override?: boolean;
  liquidity_override?: number | null;
  use_holders_override?: boolean;
  holders_override?: number | null;
  use_price_change_24h_override?: boolean;
  price_change_24h_override?: number | null;
  use_volatility_override?: boolean;
  volatility_override?: number | null;
  use_circulating_supply_override?: boolean;
  circulating_supply_override?: number | null;
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
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [userHolding, setUserHolding] = useState<number>(0);
  const [userFiatBalance, setUserFiatBalance] = useState<number>(0);
  const [settings, setSettings] = useState<SiteSettings>({
    min_buy_amount: 100, max_buy_amount: 100000, fee_percentage: 2.5, admin_commission: 2.5,
  });
  const [processing, setProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chart' | 'orderbook' | 'trades'>('chart');
  const [pendingBuyAmount, setPendingBuyAmount] = useState(0);
  const { sendLocalNotification } = usePushNotifications(user?.id);
  const { checkAlerts } = usePriceAlerts();

  // STK Polling hook - replaces manual polling
  useStkPolling({
    checkoutRequestId,
    transactionId: pendingTransactionId,
    enabled: showPaymentModal && paymentStatus === 'waiting' && !!checkoutRequestId,
    onComplete: useCallback(() => {
      setPaymentStatus('success');
      fetchUserData();
      fetchData();
    }, []),
    onFailed: useCallback((desc?: string) => {
      setPaymentStatus('failed');
      if (desc) console.log('Payment failed:', desc);
    }, []),
    onTimeout: useCallback(() => {
      setPaymentStatus('timeout');
    }, []),
  });

  const priceMultiplier = coin && coin.initial_price > 0 ? coin.price / coin.initial_price : 1;

  // Live market-driven metrics (used when no admin override)
  const live = useLiveMarketMetrics(coin?.id, coin?.price || 0, !!coin?.id);

  const displayMarketCap = coin?.use_market_cap_override && coin.market_cap_override != null
    ? coin.market_cap_override
    : (coin ? coin.price * (coin.circulating_supply || 0) : 0);
  const displayLiquidity = coin?.use_liquidity_override && coin.liquidity_override != null
    ? coin.liquidity_override
    : (live.loaded ? live.liquidityKes : coin?.liquidity ?? 0);
  const displayHolders = coin?.use_holders_override && coin.holders_override != null
    ? coin.holders_override
    : (live.loaded ? live.holders : coin?.holders_count ?? 0);
  const displayPriceChange = coin?.use_price_change_24h_override && coin?.price_change_24h_override != null
    ? coin.price_change_24h_override
    : (live.loaded ? live.priceChange24h : coin?.price_change_24h || 0);
  const displayVolatility = coin?.use_volatility_override && coin?.volatility_override != null
    ? coin.volatility_override
    : (live.loaded ? live.volatilityPct : coin?.volatility ?? 0);
  const displayCirculating = coin?.use_circulating_supply_override && coin?.circulating_supply_override != null
    ? coin.circulating_supply_override : coin?.circulating_supply;

  const isAnyOverridden = !!(
    coin?.use_market_cap_override || coin?.use_liquidity_override || coin?.use_holders_override ||
    coin?.use_price_change_24h_override || coin?.use_volatility_override || coin?.use_circulating_supply_override
  );

  useEffect(() => { if (id) fetchData(); }, [id]);
  useEffect(() => { if (user && coin) fetchUserData(); }, [user, coin]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'buy' && tradingPanelRef.current && !loading) {
      setTimeout(() => tradingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
    }
  }, [searchParams, loading, coin]);

  // Realtime coin updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`coin-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coins', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as CoinData;
          setCoin(updated);
          // Check price alerts
          const triggered = checkAlerts(updated.id, updated.price);
          triggered.forEach(alert => {
            sendLocalNotification(
              `🔔 ${alert.coinSymbol} Price Alert`,
              `${alert.coinSymbol} is now ${alert.direction === 'above' ? 'above' : 'below'} KES ${alert.targetPrice} — Current: KES ${updated.price.toFixed(6)}`
            );
            toast.info(`${alert.coinSymbol} hit KES ${alert.targetPrice}!`);
          });
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
      if (settingsResult.data) setSettings(settingsResult.data as SiteSettings);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load coin data');
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
    setUserHolding(holdingRes.data?.amount || 0);
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

        // Atomic single-RPC trade — fast & race-safe
        const { error: rpcErr } = await (supabase.rpc as any)('execute_trade', {
          _user_id: user.id,
          _coin_id: coin.id,
          _trade_type: 'buy',
          _amount: amount,
          _use_wallet: true,
          _to_wallet: false,
        });
        if (rpcErr) throw rpcErr;

        toast.success('Purchase successful!');
        sendLocalNotification('✅ Trade Confirmed', `Bought ${amount.toLocaleString()} ${coin.symbol} for KES ${totalValue.toLocaleString()}`);
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

        setPendingTransactionId(transaction.id);
        setPendingBuyAmount(amount);
        setPaymentStatus('waiting');
        setShowPaymentModal(true);

        const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
          body: { phone: formattedPhone, amount: Math.round(totalWithFee), transactionId: transaction.id, accountReference: `${coin.symbol}-${transaction.id.slice(0, 8)}` },
        });

        if (stkError || (stkData && !stkData.success)) {
          await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
          setPaymentStatus('failed');
          return;
        }

        // Store the checkoutRequestId for polling
        if (stkData?.checkoutRequestId) {
          setCheckoutRequestId(stkData.checkoutRequestId);
        }

        toast.success('Check your phone for M-PESA prompt!');
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

      const { error: rpcErr } = await (supabase.rpc as any)('execute_trade', {
        _user_id: user.id,
        _coin_id: coin.id,
        _trade_type: 'sell',
        _amount: amount,
        _use_wallet: false,
        _to_wallet: toWallet,
      });
      if (rpcErr) throw rpcErr;

      if (toWallet) {
        toast.success(`Sold! KES ${netValue.toLocaleString()} added to wallet.`);
        sendLocalNotification('💰 Sell Confirmed', `Sold ${amount.toLocaleString()} ${coin.symbol} for KES ${netValue.toLocaleString()}`);
      } else {
        toast.success('Sell order placed!');
        sendLocalNotification('📤 Sell Order', `Sell order for ${amount.toLocaleString()} ${coin.symbol} placed`);
      }

      fetchUserData();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transaction');
    } finally {
      setProcessing(false);
    }
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

  // Build display coin with overrides applied
  const displayCoin = {
    ...coin,
    market_cap: displayMarketCap ?? coin.market_cap,
    liquidity: displayLiquidity ?? coin.liquidity,
    holders_count: displayHolders ?? coin.holders_count,
    volatility: displayVolatility ?? coin.volatility,
    circulating_supply: displayCirculating ?? coin.circulating_supply,
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto pt-16 sm:pt-20 pb-24 lg:pb-8 px-2 sm:px-4 md:px-6">
        <div className="flex items-center justify-between mb-3">
          <Link to="/launchpad" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Launchpad</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            {priceMultiplier > 1 && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 border border-success/30">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="font-bold text-success text-xs">{priceMultiplier.toFixed(2)}x</span>
              </motion.div>
            )}
            <PriceAlertDialog
              coinId={coin.id}
              coinName={coin.name}
              coinSymbol={coin.symbol}
              currentPrice={coin.price}
            />
          </div>
        </div>

        {coin.trading_paused && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-2.5 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
            <span className="text-warning font-medium text-xs">Trading is currently paused</span>
          </motion.div>
        )}

        {/* Mobile Buy Button - above bottom nav */}
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 p-3 bg-background/90 backdrop-blur-lg border-t border-border/50">
          <Button variant="hero" size="lg" className="w-full gap-2 shadow-xl h-11" onClick={scrollToTrading}>
            <ArrowDown className="h-4 w-4" /> Buy {coin.symbol}
          </Button>
        </div>

        {coin.contract_address && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
            <Card className="glass-card">
              <CardContent className="p-2.5 sm:p-4">
                <CoinContractInfo contractAddress={coin.contract_address} coinName={coin.name} coinSymbol={coin.symbol} coinId={coin.id} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <MarketStats coin={displayCoin} priceChange24h={displayPriceChange} />
        </motion.div>

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
                  <Card className="glass-card overflow-hidden"><CardContent className="p-1 h-[220px] sm:h-[280px]"><TradingChart symbol={coin.symbol} currentPrice={coin.price} volatility={coin.volatility} coinId={coin.id} isOverridden={isAnyOverridden} /></CardContent></Card>
                </TabsContent>
                <TabsContent value="orderbook" className="mt-2">
                  <Card className="glass-card overflow-hidden"><CardContent className="p-1 h-[260px] overflow-auto"><OrderBook currentPrice={coin.price} symbol={coin.symbol} coinId={coin.id} isOverridden={isAnyOverridden} /></CardContent></Card>
                </TabsContent>
                <TabsContent value="trades" className="mt-2">
                  <Card className="glass-card overflow-hidden"><CardContent className="p-1 h-[260px] overflow-auto"><TradeHistory currentPrice={coin.price} symbol={coin.symbol} coinId={coin.id} isOverridden={isAnyOverridden} /></CardContent></Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block space-y-4">
              <Card className="glass-card overflow-hidden"><CardContent className="p-4 h-[450px]"><TradingChart symbol={coin.symbol} currentPrice={coin.price} volatility={coin.volatility} coinId={coin.id} isOverridden={isAnyOverridden} /></CardContent></Card>
              <div className="grid gap-4 grid-cols-2">
                <Card className="glass-card h-[400px] overflow-hidden"><CardContent className="p-4 h-full overflow-auto"><OrderBook currentPrice={coin.price} symbol={coin.symbol} coinId={coin.id} isOverridden={isAnyOverridden} /></CardContent></Card>
                <Card className="glass-card h-[400px] overflow-hidden"><CardContent className="p-4 h-full overflow-auto"><TradeHistory currentPrice={coin.price} symbol={coin.symbol} coinId={coin.id} isOverridden={isAnyOverridden} /></CardContent></Card>
              </div>
            </div>

            <Card className="glass-card"><CardContent className="p-3 sm:p-6"><CoinInfo coin={displayCoin} /></CardContent></Card>
          </div>

          <motion.div ref={tradingPanelRef} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-20 h-fit mb-20 lg:mb-0 min-w-0 w-full" id="trading-panel">
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
          if (!v) { setPaymentStatus('waiting'); setCheckoutRequestId(null); setPendingTransactionId(null); }
        }}
        status={paymentStatus}
        coinSymbol={coin.symbol}
        amount={pendingBuyAmount * coin.price}
        onRetry={() => { setPaymentStatus('waiting'); setShowPaymentModal(false); setCheckoutRequestId(null); setPendingTransactionId(null); }}
      />
    </div>
  );
}
