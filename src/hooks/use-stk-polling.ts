import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type PollStatus = 'pending' | 'completed' | 'failed' | 'timeout';

interface UseStkPollingOptions {
  checkoutRequestId: string | null;
  transactionId?: string | null;
  paymentRequestId?: string | null;
  enabled: boolean;
  onComplete: () => void;
  onFailed: (desc?: string) => void;
  onTimeout: () => void;
  maxAttempts?: number;
  intervalMs?: number;
}

export function useStkPolling({
  checkoutRequestId,
  transactionId,
  paymentRequestId,
  enabled,
  onComplete,
  onFailed,
  onTimeout,
  maxAttempts = 24,
  intervalMs = 5000,
}: UseStkPollingOptions) {
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptsRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled || !checkoutRequestId) {
      cleanup();
      return;
    }

    activeRef.current = true;
    attemptsRef.current = 0;

    const poll = async () => {
      if (!activeRef.current) return;
      attemptsRef.current++;

      try {
        const { data, error } = await supabase.functions.invoke('mpesa-stk-query', {
          body: { checkoutRequestId, transactionId, paymentRequestId },
        });

        if (!activeRef.current) return;

        if (error) {
          console.error('STK query error:', error);
        } else if (data?.status === 'completed') {
          cleanup();
          onComplete();
          return;
        } else if (data?.status === 'failed') {
          cleanup();
          onFailed(data.resultDesc);
          return;
        }
      } catch (err) {
        console.error('STK poll error:', err);
      }

      if (!activeRef.current) return;

      if (attemptsRef.current >= maxAttempts) {
        cleanup();
        onTimeout();
        return;
      }

      timerRef.current = setTimeout(poll, intervalMs);
    };

    // Start first poll after initial delay
    timerRef.current = setTimeout(poll, 5000);

    return cleanup;
  }, [enabled, checkoutRequestId, transactionId, paymentRequestId, onComplete, onFailed, onTimeout, maxAttempts, intervalMs, cleanup]);

  return { stop: cleanup };
}
