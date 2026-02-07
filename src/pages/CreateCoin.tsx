import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { CoinFormDialog } from '@/components/admin/CoinFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Coins, Loader2, Phone, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SpiralLoader } from '@/components/ui/spiral-loader';

interface UserCoin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  approval_status: string | null;
  creation_fee_paid: boolean;
  is_approved: boolean;
  logo_url: string | null;
  contract_address: string | null;
}

export default function CreateCoin() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [myCoins, setMyCoins] = useState<UserCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingCoinId, setPayingCoinId] = useState<string | null>(null);
  const [payPhone, setPayPhone] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [gasFee, setGasFee] = useState(5000);

  useEffect(() => {
    if (user) fetchMyCoins();
  }, [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('coin_creation_fee').maybeSingle();
      if (data?.coin_creation_fee) setGasFee(data.coin_creation_fee);
    };
    fetchSettings();
  }, []);

  const fetchMyCoins = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('coins')
        .select('id, name, symbol, price, approval_status, creation_fee_paid, is_approved, logo_url, contract_address')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      setMyCoins(data || []);
    } catch (err) {
      console.error('Error fetching coins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = async () => {
    if (user) {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'coin_creator')
        .maybeSingle();

      if (!existingRole) {
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'coin_creator' });
      }
    }
    fetchMyCoins();
  };

  const handlePayGasFee = async () => {
    if (!payingCoinId || !payPhone || payPhone.length < 9) {
      toast.error('Enter a valid phone number');
      return;
    }

    setPayProcessing(true);
    try {
      let formattedPhone = payPhone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1);
      else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: formattedPhone,
          amount: Math.round(gasFee),
          transactionId: payingCoinId,
          accountReference: `GAS-PAY`,
          type: 'coin_creation',
        },
      });

      if (stkError || (stkData && !stkData.success)) {
        toast.error('Failed to send STK push. Try again.');
        setPayProcessing(false);
        return;
      }

      toast.success('Check your phone for M-PESA prompt!');

      // Poll for payment
      let attempts = 0;
      const maxAttempts = 40;
      const checkPayment = async () => {
        attempts++;
        const { data: coin } = await supabase.from('coins').select('creation_fee_paid').eq('id', payingCoinId).single();
        if (coin?.creation_fee_paid) {
          toast.success('Gas fee paid! Coin is now pending approval.');
          setShowPayDialog(false);
          setPayProcessing(false);
          setPayPhone('');
          setPayingCoinId(null);
          fetchMyCoins();
          return;
        }
        if (attempts >= maxAttempts) {
          toast.error('Payment timed out. Please try again.');
          setPayProcessing(false);
          return;
        }
        setTimeout(checkPayment, 3000);
      };
      setTimeout(checkPayment, 5000);
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
      setPayProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display mb-1">Create Coin</h1>
              <p className="text-muted-foreground text-sm">Launch your own token on the platform</p>
            </div>
            <Button variant="hero" className="gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Coin</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </motion.div>

        <div>
          <h2 className="text-lg font-semibold mb-4">My Coins</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : myCoins.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No coins yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">Create your first coin and start your crypto journey</p>
                <Button variant="hero" onClick={() => setShowDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Coin
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myCoins.map((coin) => (
                <Card key={coin.id} className="glass-card hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                        {coin.logo_url ? (
                          <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                        ) : (
                          <Coins className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{coin.name}</h4>
                        <p className="text-xs text-muted-foreground">{coin.symbol}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        !coin.creation_fee_paid
                          ? 'bg-destructive/10 text-destructive'
                          : coin.approval_status === 'pending'
                          ? 'bg-warning/10 text-warning'
                          : coin.is_approved
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {!coin.creation_fee_paid ? 'Unpaid' : coin.approval_status === 'pending' ? 'Pending' : coin.is_approved ? 'Active' : 'Rejected'}
                      </div>
                    </div>
                    {coin.contract_address && (
                      <p className="text-xs font-mono text-muted-foreground truncate mb-2">{coin.contract_address}</p>
                    )}
                    {/* Pay button for unpaid coins */}
                    {!coin.creation_fee_paid && (
                      <Button
                        variant="hero"
                        size="sm"
                        className="w-full gap-2 mt-1"
                        onClick={() => {
                          setPayingCoinId(coin.id);
                          setShowPayDialog(true);
                        }}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Pay Gas Fee (KES {gasFee.toLocaleString()})
                      </Button>
                    )}
                    {coin.is_approved && (
                      <Link to={`/coin/${coin.id}`}>
                        <Button variant="outline" size="sm" className="w-full mt-1">View Coin</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <CoinFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={handleCreateSuccess}
        userId={user.id}
        isSuperAdmin={false}
      />

      {/* Pay Gas Fee Dialog */}
      <Dialog open={showPayDialog} onOpenChange={(v) => { if (!payProcessing) setShowPayDialog(v); }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-warning" />
              Pay Gas Fee
            </DialogTitle>
            <DialogDescription>
              Pay KES {gasFee.toLocaleString()} via M-PESA to list your coin
            </DialogDescription>
          </DialogHeader>
          {payProcessing ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <SpiralLoader size="lg" />
              <p className="text-sm text-muted-foreground">Waiting for M-PESA confirmation...</p>
              <p className="text-xs text-primary">Check your phone for STK push</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-center">
                <p className="text-xl font-bold text-warning">KES {gasFee.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" /> M-PESA Phone
                </Label>
                <Input
                  type="tel"
                  placeholder="254712345678"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  className="h-12 text-lg font-mono"
                />
              </div>
              <Button variant="hero" className="w-full" onClick={handlePayGasFee} disabled={!payPhone || payPhone.length < 9}>
                Pay Now
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
