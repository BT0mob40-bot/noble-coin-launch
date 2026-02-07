import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowUpRight, ArrowDownLeft, Phone, Loader2, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SpiralLoader } from '@/components/ui/spiral-loader';

interface WalletCardProps {
  fiatBalance: number;
  userId: string;
  onBalanceChange: () => void;
}

type DepositStatus = 'form' | 'processing' | 'success' | 'failed' | 'timeout';

export function WalletCard({ fiatBalance, userId, onBalanceChange }: WalletCardProps) {
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('form');
  const [minDeposit, setMinDeposit] = useState(100);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('min_buy_amount').maybeSingle();
      if (data?.min_buy_amount) setMinDeposit(data.min_buy_amount);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (depositStatus !== 'processing') { setElapsed(0); return; }
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [depositStatus]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (!depositAmount || !phone) {
      toast.error('Please fill all fields');
      return;
    }
    if (depositAmount < minDeposit) {
      toast.error(`Minimum deposit is KES ${minDeposit}`);
      return;
    }

    setDepositStatus('processing');
    try {
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1);
      else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: formattedPhone,
          amount: Math.round(depositAmount),
          type: 'deposit',
          userId,
          accountReference: `DEPOSIT-${userId.slice(0, 8)}`,
        },
      });

      if (error) {
        console.error('Deposit STK error:', error);
        setDepositStatus('failed');
        return;
      }

      if (data && !data.success) {
        console.error('Deposit STK failed:', data.error);
        setDepositStatus('failed');
        return;
      }

      toast.success('STK Push sent! Check your phone.');

      // Poll for balance change
      const initialBalance = fiatBalance;
      let attempts = 0;
      const maxAttempts = 40;

      const checkDeposit = async () => {
        attempts++;
        const { data: wallet } = await supabase
          .from('wallets')
          .select('fiat_balance')
          .eq('user_id', userId)
          .single();

        if (wallet && wallet.fiat_balance > initialBalance) {
          setDepositStatus('success');
          onBalanceChange();
          return;
        }

        if (attempts >= maxAttempts) {
          setDepositStatus('timeout');
          return;
        }

        setTimeout(checkDeposit, 3000);
      };

      setTimeout(checkDeposit, 5000);
    } catch (error: any) {
      console.error('Deposit error:', error);
      setDepositStatus('failed');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !phone) {
      toast.error('Please fill all fields');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > fiatBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('wallets')
        .update({ fiat_balance: fiatBalance - withdrawAmount })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Withdrawal initiated! Funds will be sent to your M-PESA.');
      setShowWithdraw(false);
      setAmount('');
      setPhone('');
      onBalanceChange();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const closeDeposit = () => {
    setShowDeposit(false);
    setDepositStatus('form');
    setAmount('');
    setPhone('');
    setElapsed(0);
  };

  return (
    <>
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Fiat Wallet
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onBalanceChange}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold gradient-text mb-4">
            KES {fiatBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex gap-2">
            <Button variant="success" size="sm" className="flex-1 gap-2" onClick={() => setShowDeposit(true)}>
              <ArrowDownLeft className="h-4 w-4" /> Deposit
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => setShowWithdraw(true)}>
              <ArrowUpRight className="h-4 w-4" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={(v) => { if (depositStatus !== 'processing') { if (!v) closeDeposit(); else setShowDeposit(v); } }}>
        <DialogContent className="glass-card border-border/50 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-success" />
              Deposit via M-PESA
            </DialogTitle>
            <DialogDescription>
              {depositStatus === 'form' && 'Fund your wallet using M-PESA mobile money'}
              {depositStatus === 'processing' && 'Waiting for M-PESA confirmation...'}
              {depositStatus === 'success' && 'Deposit successful!'}
              {depositStatus === 'failed' && 'Deposit failed or cancelled'}
              {depositStatus === 'timeout' && 'Request timed out'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {depositStatus === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input type="number" placeholder={`Min ${minDeposit}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted/30 h-12 text-lg font-mono" />
                  <p className="text-xs text-muted-foreground">Minimum deposit: KES {minDeposit.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> M-PESA Phone Number</Label>
                  <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/30 h-12 font-mono" />
                </div>
                <Button variant="success" className="w-full gap-2 h-12" onClick={handleDeposit} disabled={!amount || !phone || parseFloat(amount) < minDeposit}>
                  Deposit KES {amount || '0'}
                </Button>
              </motion.div>
            )}

            {depositStatus === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4">
                <SpiralLoader size="lg" />
                <p className="text-sm text-muted-foreground">Check your phone for STK push</p>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-primary">{formatTime(elapsed)}</span>
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    <span className="text-success">STK Push sent</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Clock className="h-3.5 w-3.5 text-warning" />
                    </motion.div>
                    <span className="text-warning">Awaiting PIN entry...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {depositStatus === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                  className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </motion.div>
                <p className="text-lg font-bold text-success">Deposit Successful!</p>
                <p className="text-sm text-muted-foreground">Funds have been added to your wallet</p>
                <Button variant="hero" onClick={closeDeposit}>Done</Button>
              </motion.div>
            )}

            {depositStatus === 'failed' && (
              <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-lg font-bold text-destructive">Deposit Failed</p>
                <p className="text-sm text-muted-foreground">The transaction was cancelled or failed</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeDeposit}>Close</Button>
                  <Button variant="hero" onClick={() => setDepositStatus('form')}>Try Again</Button>
                </div>
              </motion.div>
            )}

            {depositStatus === 'timeout' && (
              <motion.div key="timeout" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
                <p className="text-lg font-bold text-warning">Request Timed Out</p>
                <p className="text-sm text-muted-foreground">Payment wasn't completed in time</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeDeposit}>Close</Button>
                  <Button variant="hero" onClick={() => setDepositStatus('form')}>Try Again</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="glass-card border-border/50 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Withdraw to M-PESA
            </DialogTitle>
            <DialogDescription>Withdraw funds to your M-PESA number</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              Available Balance: <span className="font-bold">KES {fiatBalance.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input type="number" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted/30" max={fiatBalance} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> M-PESA Phone Number</Label>
              <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/30" />
            </div>
            <Button className="w-full gap-2" onClick={handleWithdraw} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Withdraw KES {amount || '0'}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
