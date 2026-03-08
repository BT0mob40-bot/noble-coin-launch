import { useState, useEffect, useCallback } from 'react';
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
import { useStkPolling } from '@/hooks/use-stk-polling';

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
  const [withdrawalFeePct, setWithdrawalFeePct] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  // STK Polling for deposits
  useStkPolling({
    checkoutRequestId,
    enabled: depositStatus === 'processing' && !!checkoutRequestId,
    onComplete: useCallback(() => {
      setDepositStatus('success');
      onBalanceChange();
    }, [onBalanceChange]),
    onFailed: useCallback(() => {
      setDepositStatus('failed');
    }, []),
    onTimeout: useCallback(() => {
      setDepositStatus('timeout');
    }, []),
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('min_buy_amount, withdrawal_fee_percentage').maybeSingle();
      if (data?.min_buy_amount) setMinDeposit(data.min_buy_amount);
      if (data?.withdrawal_fee_percentage != null) setWithdrawalFeePct(Number(data.withdrawal_fee_percentage));
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
    if (!depositAmount || !phone) { toast.error('Please fill all fields'); return; }
    if (depositAmount < minDeposit) { toast.error(`Minimum deposit is KES ${minDeposit}`); return; }

    setDepositStatus('processing');
    try {
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1);
      else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone: formattedPhone, amount: Math.round(depositAmount), type: 'deposit', userId, accountReference: `DEPOSIT-${userId.slice(0, 8)}` },
      });

      if (error || (data && !data.success)) {
        console.error('Deposit STK error:', error || data?.error);
        setDepositStatus('failed');
        return;
      }

      if (data?.checkoutRequestId) {
        setCheckoutRequestId(data.checkoutRequestId);
      }

      toast.success('STK Push sent! Check your phone.');
    } catch (error: any) {
      console.error('Deposit error:', error);
      setDepositStatus('failed');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !phone) { toast.error('Please fill all fields'); return; }
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > fiatBalance) { toast.error('Insufficient balance'); return; }

    setProcessing(true);
    try {
      const { data: settings } = await supabase.from('site_settings').select('withdrawal_fee_percentage').maybeSingle();
      const feePct = Number(settings?.withdrawal_fee_percentage || 0);
      const feeAmount = withdrawAmount * (feePct / 100);
      const netAmount = Math.max(0, withdrawAmount - feeAmount);

      const { error: debitError } = await supabase.from('wallets').update({ fiat_balance: fiatBalance - withdrawAmount }).eq('user_id', userId);
      if (debitError) throw debitError;

      const { error: reqError } = await supabase.from('wallet_withdrawals').insert({
        user_id: userId, phone, amount: withdrawAmount, fee_amount: feeAmount, net_amount: netAmount, status: 'pending',
      } as any);
      if (reqError) throw reqError;

      toast.success('Withdrawal request submitted for admin approval.');
      setShowWithdraw(false);
      setAmount(''); setPhone('');
      onBalanceChange();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const closeDeposit = () => {
    setShowDeposit(false); setDepositStatus('form'); setAmount(''); setPhone(''); setElapsed(0); setCheckoutRequestId(null);
  };

  return (
    <>
      <Card className="glass-card overflow-hidden h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <CardHeader className="flex flex-row items-center justify-between pb-1 relative p-2.5 sm:p-4 sm:pb-2">
          <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Fiat Wallet
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onBalanceChange} className="h-6 w-6 sm:h-7 sm:w-7"><RefreshCw className="h-3 w-3" /></Button>
        </CardHeader>
        <CardContent className="relative p-2.5 pt-0 sm:p-4 sm:pt-0">
          <div className="text-lg sm:text-2xl font-bold gradient-text font-mono mb-2 sm:mb-3">
            KES {fiatBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="success" size="sm" className="flex-1 gap-1 h-7 sm:h-8 text-[10px] sm:text-xs" onClick={() => setShowDeposit(true)}>
              <ArrowDownLeft className="h-3 w-3" /> Deposit
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1 h-7 sm:h-8 text-[10px] sm:text-xs" onClick={() => setShowWithdraw(true)}>
              <ArrowUpRight className="h-3 w-3" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={(v) => { if (depositStatus !== 'processing') { if (!v) closeDeposit(); else setShowDeposit(v); } }}>
        <DialogContent className="glass-card border-border/50 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ArrowDownLeft className="h-4 w-4 text-success" /> Deposit via M-PESA
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {depositStatus === 'form' && 'Fund your wallet using M-PESA'}
              {depositStatus === 'processing' && 'Waiting for M-PESA confirmation...'}
              {depositStatus === 'success' && 'Deposit successful!'}
              {depositStatus === 'failed' && 'Deposit failed or cancelled'}
              {depositStatus === 'timeout' && 'Request timed out'}
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {depositStatus === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Amount (KES)</Label>
                  <Input type="number" placeholder={`Min ${minDeposit}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted/30 h-10 sm:h-12 text-sm sm:text-lg font-mono" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Minimum: KES {minDeposit.toLocaleString()}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><Phone className="h-3.5 w-3.5" /> M-PESA Phone</Label>
                  <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/30 h-10 sm:h-12 font-mono text-sm" />
                </div>
                <Button variant="success" className="w-full gap-2 h-10 sm:h-12 text-sm" onClick={handleDeposit} disabled={!amount || !phone || parseFloat(amount) < minDeposit}>
                  Deposit KES {amount || '0'}
                </Button>
              </motion.div>
            )}
            {depositStatus === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 flex flex-col items-center gap-3">
                <SpiralLoader size="lg" />
                <p className="text-xs text-muted-foreground">Check your phone for STK push</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-primary" />
                  <span className="font-mono text-primary">{formatTime(elapsed)}</span>
                </div>
                <div className="w-full max-w-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                    <CheckCircle className="h-3 w-3 text-success" /><span className="text-success">STK Push sent</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Clock className="h-3 w-3 text-warning" />
                    </motion.div>
                    <span className="text-warning">Awaiting PIN entry...</span>
                  </div>
                </div>
              </motion.div>
            )}
            {depositStatus === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 flex flex-col items-center gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                  className="h-14 w-14 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-success" />
                </motion.div>
                <p className="text-base font-bold text-success">Deposit Successful!</p>
                <p className="text-xs text-muted-foreground">Funds added to your wallet</p>
                <Button variant="hero" size="sm" onClick={closeDeposit}>Done</Button>
              </motion.div>
            )}
            {depositStatus === 'failed' && (
              <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-base font-bold text-destructive">Deposit Failed</p>
                <p className="text-xs text-muted-foreground">Transaction cancelled or failed</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={closeDeposit}>Close</Button>
                  <Button variant="hero" size="sm" onClick={() => { setDepositStatus('form'); setCheckoutRequestId(null); }}>Try Again</Button>
                </div>
              </motion.div>
            )}
            {depositStatus === 'timeout' && (
              <motion.div key="timeout" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-warning" />
                </div>
                <p className="text-base font-bold text-warning">Request Timed Out</p>
                <p className="text-xs text-muted-foreground">Payment wasn't completed in time</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={closeDeposit}>Close</Button>
                  <Button variant="hero" size="sm" onClick={() => { setDepositStatus('form'); setCheckoutRequestId(null); }}>Try Again</Button>
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
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ArrowUpRight className="h-4 w-4 text-primary" /> Withdraw to M-PESA
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Withdraw funds to your M-PESA</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs sm:text-sm">
              Available: <span className="font-bold font-mono">KES {fiatBalance.toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Amount (KES)</Label>
              <Input type="number" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted/30 h-10 font-mono" max={fiatBalance} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><Phone className="h-3.5 w-3.5" /> M-PESA Phone</Label>
              <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/30 h-10 font-mono" />
            </div>

            {/* Fee breakdown */}
            {parseFloat(amount) > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono">KES {parseFloat(amount).toLocaleString()}</span>
                </div>
                {withdrawalFeePct > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fee ({withdrawalFeePct}%)</span>
                    <span className="font-mono text-warning">- KES {(parseFloat(amount) * withdrawalFeePct / 100).toFixed(0)}</span>
                  </div>
                )}
                <div className="border-t border-border/50 pt-1.5 flex items-center justify-between font-medium">
                  <span>You'll receive</span>
                  <span className="font-mono text-success">
                    KES {Math.max(0, parseFloat(amount) - parseFloat(amount) * withdrawalFeePct / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Withdrawals require admin approval before M-PESA payout
            </div>

            <Button className="w-full gap-2 h-10" onClick={handleWithdraw} disabled={processing || !amount || !phone || parseFloat(amount) > fiatBalance || parseFloat(amount) <= 0}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Withdraw KES {amount || '0'}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
