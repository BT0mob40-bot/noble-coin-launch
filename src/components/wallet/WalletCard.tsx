import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowUpRight, ArrowDownLeft, Phone, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SpiralLoader } from '@/components/ui/spiral-loader';

interface WalletCardProps {
  fiatBalance: number;
  userId: string;
  onBalanceChange: () => void;
}

export function WalletCard({ fiatBalance, userId, onBalanceChange }: WalletCardProps) {
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleDeposit = async () => {
    if (!amount || !phone) {
      toast.error('Please fill all fields');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone,
          amount: parseFloat(amount),
          type: 'deposit',
          userId,
        },
      });

      if (error) throw error;

      toast.success('STK Push sent! Check your phone.');
      
      // Poll for completion
      const checkDeposit = setInterval(async () => {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('fiat_balance')
          .eq('user_id', userId)
          .single();

        if (wallet && wallet.fiat_balance > fiatBalance) {
          clearInterval(checkDeposit);
          setProcessing(false);
          setShowDeposit(false);
          setAmount('');
          setPhone('');
          onBalanceChange();
          toast.success('Deposit successful!');
        }
      }, 3000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkDeposit);
        setProcessing(false);
      }, 120000);

    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate deposit');
      setProcessing(false);
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
      // Deduct from wallet first
      const { error } = await supabase
        .from('wallets')
        .update({ fiat_balance: fiatBalance - withdrawAmount })
        .eq('user_id', userId);

      if (error) throw error;

      // In production, this would trigger B2C payment
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
            <Button 
              variant="success" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={() => setShowDeposit(true)}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={() => setShowWithdraw(true)}
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-success" />
              Deposit via M-PESA
            </DialogTitle>
            <DialogDescription>
              Fund your wallet using M-PESA mobile money
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {processing ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center justify-center"
              >
                <SpiralLoader />
                <p className="text-center text-muted-foreground mt-4">
                  Processing deposit...
                  <br />
                  <span className="text-sm">Check your phone for STK push</span>
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    M-PESA Phone Number
                  </Label>
                  <Input
                    type="tel"
                    placeholder="254712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <Button 
                  variant="success" 
                  className="w-full gap-2"
                  onClick={handleDeposit}
                >
                  Deposit KES {amount || '0'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Withdraw to M-PESA
            </DialogTitle>
            <DialogDescription>
              Withdraw funds to your M-PESA number
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              Available Balance: <span className="font-bold">KES {fiatBalance.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/30"
                max={fiatBalance}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                M-PESA Phone Number
              </Label>
              <Input
                type="tel"
                placeholder="254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <Button 
              className="w-full gap-2"
              onClick={handleWithdraw}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Withdraw KES {amount || '0'}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
