import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Daraja result codes that DEFINITIVELY mean the user/account stopped the payment.
// We must NOT mark "failed" on transient codes (1037 timeout, 500.001.1001 still processing,
// network errors) — those should keep polling until the real callback or max attempts.
const DEFINITIVE_FAILURE_CODES = new Set([
  1032, // Cancelled by user (entered wrong PIN cancel)
  1,    // Insufficient funds
  2001, // Wrong PIN
  1001, // Unable to lock subscriber
  1019, // Transaction expired (different from 1037)
  1025, // Generic failure
  9999, // Generic failure
]);

export function useStkPolling({
  checkoutRequestId,
  transactionId,
  paymentRequestId,
  enabled,
  onComplete,
  onFailed,
  onTimeout,
  maxAttempts = 36, // 36 * 5s = 3 minutes
  intervalMs = 5000,
}: UseStkPollingOptions) {
  const attemptsRef = useRef(0);
  const consecutiveFailRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptsRef.current = 0;
    consecutiveFailRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled || (!checkoutRequestId && !transactionId && !paymentRequestId)) {
      cleanup();
      return;
    }

    activeRef.current = true;
    attemptsRef.current = 0;
    consecutiveFailRef.current = 0;

    const poll = async () => {
      if (!activeRef.current) return;
      attemptsRef.current++;

      try {
        const { data, error } = await supabase.functions.invoke('mpesa-stk-query', {
          body: { checkoutRequestId, transactionId, paymentRequestId },
        });

        if (!activeRef.current) return;

        if (error) {
          // transient — keep polling
          console.warn('STK query transient error:', error);
        } else if (data?.status === 'completed') {
          cleanup();
          onComplete();
          return;
        } else if (data?.status === 'failed') {
          const code = Number(data.resultCode);
          // Only treat as failure on definitive codes. Otherwise wait for callback.
          if (DEFINITIVE_FAILURE_CODES.has(code)) {
            cleanup();
            onFailed(data.resultDesc);
            return;
          }
          // Transient/ambiguous — bump counter; only fail after 3 consecutive ambiguous failures
          consecutiveFailRef.current++;
          if (consecutiveFailRef.current >= 6) {
            cleanup();
            onFailed(data.resultDesc);
            return;
          }
        } else {
          // pending — reset consecutive fail
          consecutiveFailRef.current = 0;
        }
      } catch (err) {
        console.warn('STK poll exception:', err);
      }

      if (!activeRef.current) return;

      if (attemptsRef.current >= maxAttempts) {
        cleanup();
        onTimeout();
        return;
      }

      timerRef.current = setTimeout(poll, intervalMs);
    };

    // Initial delay so STK push has time to deliver (reduced for snappier UX)
    timerRef.current = setTimeout(poll, 2500);

    return cleanup;
  }, [enabled, checkoutRequestId, transactionId, paymentRequestId, onComplete, onFailed, onTimeout, maxAttempts, intervalMs, cleanup]);

  return { stop: cleanup };
}
