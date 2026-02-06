import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiralLoader } from '@/components/ui/spiral-loader';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type PaymentStatus = 'waiting' | 'success' | 'failed' | 'timeout';

interface MpesaPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PaymentStatus;
  onRetry?: () => void;
  coinSymbol?: string;
  amount?: number;
}

export function MpesaPaymentModal({
  open,
  onOpenChange,
  status,
  onRetry,
  coinSymbol,
  amount,
}: MpesaPaymentModalProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'waiting') {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (status !== 'waiting') onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>
            {status === 'waiting' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'timeout' && 'Payment Timeout'}
          </DialogTitle>
          <DialogDescription>
            {status === 'waiting' && 'Please check your phone and enter your M-PESA PIN'}
            {status === 'success' && `Your ${coinSymbol || 'coins'} have been credited to your wallet`}
            {status === 'failed' && 'The payment was cancelled or failed. Please try again.'}
            {status === 'timeout' && 'The payment request timed out. Please try again.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {status === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center py-8 gap-4"
            >
              <SpiralLoader size="lg" />
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">Waiting for confirmation...</p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-mono text-primary">{formatTime(elapsed)}</span>
                </div>
                {amount && (
                  <p className="text-xs text-muted-foreground">
                    Amount: <span className="font-bold text-foreground">KES {amount.toLocaleString()}</span>
                  </p>
                )}
              </div>

              {/* Progress steps */}
              <div className="w-full max-w-xs space-y-2 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-success">STK Push sent to your phone</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Clock className="h-4 w-4 text-warning flex-shrink-0" />
                  </motion.div>
                  <span className="text-warning">Awaiting M-PESA PIN entry...</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-4 w-4 rounded-full border border-border flex-shrink-0" />
                  <span>Confirming payment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-4 w-4 rounded-full border border-border flex-shrink-0" />
                  <span>Allocating coins to wallet</span>
                </div>
              </div>

              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs text-primary mt-2"
              >
                Do not close this window
              </motion.p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center"
              >
                <CheckCircle className="h-10 w-10 text-success" />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-success">Payment Confirmed!</p>
                <p className="text-sm text-muted-foreground">
                  Coins have been added to your portfolio
                </p>
              </div>
              <Button variant="hero" onClick={() => onOpenChange(false)} className="mt-2">
                Continue Trading
              </Button>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center"
              >
                <XCircle className="h-10 w-10 text-destructive" />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-destructive">Payment Cancelled</p>
                <p className="text-sm text-muted-foreground">
                  The M-PESA transaction was cancelled or rejected
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {onRetry && (
                  <Button variant="hero" onClick={onRetry}>
                    Try Again
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {status === 'timeout' && (
            <motion.div
              key="timeout"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="h-20 w-20 rounded-full bg-warning/20 flex items-center justify-center"
              >
                <AlertTriangle className="h-10 w-10 text-warning" />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-warning">Request Timed Out</p>
                <p className="text-sm text-muted-foreground">
                  The payment wasn't completed within the time limit
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {onRetry && (
                  <Button variant="hero" onClick={onRetry}>
                    Try Again
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
