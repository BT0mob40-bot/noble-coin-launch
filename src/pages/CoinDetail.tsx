import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SpiralLoader } from '@/components/ui/spiral-loader';
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  Droplet, 
  FileText,
  Loader2,
  ShoppingCart,
  Wallet,
  Star,
  ExternalLink,
  Phone
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  is_trending: boolean;
  is_featured: boolean;
  trading_paused: boolean;
  logo_url: string | null;
  whitepaper_url: string | null;
}

export default function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [userHolding, setUserHolding] = useState<number>(0);

  useEffect(() => {
    if (id) {
      fetchCoin();
    }
  }, [id]);

  useEffect(() => {
    if (user && coin) {
      fetchUserHolding();
    }
  }, [user, coin]);

  const fetchCoin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coins')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/launchpad');
        return;
      }
      setCoin(data);
    } catch (error) {
      console.error('Error fetching coin:', error);
      navigate('/launchpad');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHolding = async () => {
    if (!user || !coin) return;
    
    const { data } = await supabase
      .from('holdings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('coin_id', coin.id)
      .maybeSingle();

    if (data) {
      setUserHolding(data.amount);
    }
  };

  const handleBuy = async () => {
    if (!user || !coin) {
      toast.error('Please sign in to buy coins');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Format and validate phone number
    let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (!formattedPhone || formattedPhone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    try {
      // Create transaction record
      const totalValue = amountNum * coin.price;
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          coin_id: coin.id,
          type: 'buy',
          amount: amountNum,
          price_per_coin: coin.price,
          total_value: totalValue,
          phone: phone,
          status: 'pending',
        })
        .select()
        .single();

      if (txError) throw txError;

      // Close buy modal and show payment modal
      setShowBuyModal(false);
      setShowPaymentModal(true);
      setWaitingForPayment(true);

      // Initiate STK Push
      const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: formattedPhone,
          amount: Math.round(totalValue),
          transactionId: transaction.id,
          accountReference: `${coin.symbol}-${transaction.id.slice(0, 8)}`,
        },
      });

      if (stkError) {
        console.error('STK Push error:', stkError);
        toast.error('Failed to initiate M-PESA payment');
        setWaitingForPayment(false);
        setShowPaymentModal(false);
        return;
      }

      if (!stkData?.success) {
        toast.error(stkData?.error || 'Failed to send STK Push');
        setWaitingForPayment(false);
        setShowPaymentModal(false);
        return;
      }

      toast.success('Check your phone for M-PESA prompt!');

      // Poll for transaction status
      const checkStatus = async () => {
        const { data: updatedTx } = await supabase
          .from('transactions')
          .select('status')
          .eq('id', transaction.id)
          .single();

        if (updatedTx?.status === 'completed') {
          setWaitingForPayment(false);
          setShowPaymentModal(false);
          toast.success('Payment successful! Coins added to your wallet.');
          fetchUserHolding();
          setAmount('');
          setPhone('');
        } else if (updatedTx?.status === 'failed') {
          setWaitingForPayment(false);
          setShowPaymentModal(false);
          toast.error('Payment failed or was cancelled.');
        } else {
          // Still pending, check again after 3 seconds
          setTimeout(checkStatus, 3000);
        }
      };

      // Start polling after 5 seconds
      setTimeout(checkStatus, 5000);

    } catch (error: any) {
      toast.error(error.message || 'Failed to process transaction');
      setWaitingForPayment(false);
      setShowPaymentModal(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleSell = async () => {
    if (!user || !coin) {
      toast.error('Please sign in to sell coins');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > userHolding) {
      toast.error('Insufficient balance');
      return;
    }

    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    try {
      const totalValue = amountNum * coin.price;
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        coin_id: coin.id,
        type: 'sell',
        amount: amountNum,
        price_per_coin: coin.price,
        total_value: totalValue,
        phone: phone,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Sell order placed! Funds will be sent to your M-PESA.');
      setShowSellModal(false);
      setAmount('');
      setPhone('');
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

  if (!coin) {
    return null;
  }

  const marketCap = coin.market_cap || coin.price * coin.circulating_supply;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back Button */}
          <Link 
            to="/launchpad" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Launchpad
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                {coin.logo_url ? (
                  <img src={coin.logo_url} alt={coin.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <span className="text-2xl font-bold gradient-text">{coin.symbol[0]}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold font-display">{coin.name}</h1>
                  {coin.is_featured && (
                    <Badge className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                      <Star className="h-3 w-3" /> Featured
                    </Badge>
                  )}
                  {coin.is_trending && (
                    <Badge className="gap-1 bg-success/10 text-success border-success/20">
                      <TrendingUp className="h-3 w-3" /> Trending
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">{coin.symbol}</p>
              </div>
            </div>

            <div className="flex gap-3">
              {user ? (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="gap-2"
                    onClick={() => setShowBuyModal(true)}
                    disabled={coin.trading_paused}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Buy
                  </Button>
                  {userHolding > 0 && (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="gap-2"
                      onClick={() => setShowSellModal(true)}
                      disabled={coin.trading_paused}
                    >
                      <Wallet className="h-5 w-5" />
                      Sell
                    </Button>
                  )}
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="hero" size="lg">Sign In to Trade</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Price Card */}
          <Card className="glass-card mb-8">
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                  <p className="text-3xl font-bold gradient-text">
                    KES {coin.price.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                  <p className="text-2xl font-bold">
                    KES {(marketCap / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Liquidity</p>
                  <p className="text-2xl font-bold">
                    KES {coin.liquidity.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Volatility</p>
                  <p className="text-2xl font-bold">
                    {coin.volatility.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Holders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{coin.holders_count.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Droplet className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Circulating Supply</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(coin.circulating_supply / 1000000).toFixed(2)}M / {(coin.total_supply / 1000000).toFixed(0)}M
                </p>
              </CardContent>
            </Card>

            {user && userHolding > 0 && (
              <Card className="glass-card border-primary/50">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{userHolding.toLocaleString()} {coin.symbol}</p>
                  <p className="text-sm text-muted-foreground">
                    ≈ KES {(userHolding * coin.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Description & Whitepaper */}
          <div className="grid gap-6 md:grid-cols-2">
            {coin.description && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>About {coin.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{coin.description}</p>
                </CardContent>
              </Card>
            )}

            {coin.whitepaper_url && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Whitepaper
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={coin.whitepaper_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    View Whitepaper <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </main>

      {/* Buy Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy {coin.symbol}</DialogTitle>
            <DialogDescription>
              Purchase {coin.name} with M-PESA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount ({coin.symbol})</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amount && (
                <p className="text-sm text-muted-foreground">
                  Total: KES {(parseFloat(amount) * coin.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>M-PESA Phone Number</Label>
              <Input
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyModal(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleBuy} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Buy Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Modal */}
      <Dialog open={showSellModal} onOpenChange={setShowSellModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell {coin.symbol}</DialogTitle>
            <DialogDescription>
              Sell {coin.name} and receive M-PESA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Available: {userHolding.toLocaleString()} {coin.symbol}
            </p>
            <div className="space-y-2">
              <Label>Amount ({coin.symbol})</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={userHolding}
              />
              {amount && (
                <p className="text-sm text-muted-foreground">
                  You'll receive: KES {(parseFloat(amount) * coin.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>M-PESA Phone Number</Label>
              <Input
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSellModal(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSell} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sell Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Processing Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !waitingForPayment && setShowPaymentModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">M-PESA Payment</DialogTitle>
            <DialogDescription className="text-center">
              {waitingForPayment ? 'Waiting for payment confirmation...' : 'Payment status'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-8">
            {waitingForPayment ? (
              <>
                <SpiralLoader size="lg" text="Check your phone for M-PESA prompt" />
                <div className="mt-6 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{phone}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your M-PESA PIN to complete the payment
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Processing complete</p>
            )}
          </div>
          {!waitingForPayment && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
