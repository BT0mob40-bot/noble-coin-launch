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
  onStatus?: (status: 'sent' | 'pin_prompt' | 'pin_entered' | 'received' | 'cancelled' | 'processing', desc?: string) => void;
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

const getNextDelay = (attempt: number, _base: number) => {
  // Aggressive early polling for the first minute; callback/realtime still wins instantly.
  if (attempt <= 8) return 650;
  if (attempt <= 20) return 1200;
  if (attempt <= 40) return 2200;
  return 4000;
};

const isCompletedStatus = (status?: string | null) => status === 'completed';
const isFinalFailureStatus = (status?: string | null) => status === 'failed' || status === 'cancelled' || status === 'rejected';

export function useStkPolling({
  checkoutRequestId,
  transactionId,
  paymentRequestId,
  enabled,
  onComplete,
  onFailed,
  onTimeout,
  onStatus,
  maxAttempts = 36, // 36 * 5s = 3 minutes
  intervalMs = 5000,
}: UseStkPollingOptions) {
  const attemptsRef = useRef(0);
  const consecutiveFailRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const completedRef = useRef(false);

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
    completedRef.current = false;

    const finishComplete = () => {
      if (completedRef.current) return;
      onStatus?.('received');
      completedRef.current = true;
      cleanup();
      onComplete();
    };

    const finishFailed = (desc?: string) => {
      if (completedRef.current) return;
      onStatus?.('cancelled', desc);
      completedRef.current = true;
      cleanup();
      onFailed(desc);
    };

    const channel = supabase
      .channel(`stk-status-${transactionId || paymentRequestId || checkoutRequestId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'transactions',
        filter: transactionId ? `id=eq.${transactionId}` : `mpesa_receipt=eq.${checkoutRequestId}`,
      }, (payload) => {
        const row = payload.new as { status?: string; result_desc?: string };
        if (row.status === 'stk_sent' || row.status === 'pending') onStatus?.('pin_prompt', row.result_desc);
        if (isCompletedStatus(row.status)) finishComplete();
        if (isFinalFailureStatus(row.status)) finishFailed(row.result_desc);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'payment_requests',
        filter: paymentRequestId ? `id=eq.${paymentRequestId}` : `checkout_request_id=eq.${checkoutRequestId}`,
      }, (payload) => {
        const row = payload.new as { status?: string; result_desc?: string };
        if (row.status === 'stk_sent' || row.status === 'pending') onStatus?.('pin_prompt', row.result_desc);
        if (isCompletedStatus(row.status)) finishComplete();
        if (isFinalFailureStatus(row.status)) finishFailed(row.result_desc);
      })
      .subscribe();

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
          finishComplete();
          return;
        } else if (data?.status === 'failed') {
          const code = Number(data.resultCode);
          // Only treat as failure on definitive codes. Otherwise wait for callback.
          if (DEFINITIVE_FAILURE_CODES.has(code)) {
            finishFailed(data.resultDesc);
            return;
          }
          // Transient/ambiguous — bump counter; only fail after 3 consecutive ambiguous failures
          consecutiveFailRef.current++;
          if (consecutiveFailRef.current >= 6) {
            finishFailed(data.resultDesc);
            return;
          }
        } else {
          // pending — reset consecutive fail
          onStatus?.(attemptsRef.current <= 2 ? 'pin_prompt' : 'pin_entered', data?.message || data?.resultDesc);
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

      timerRef.current = setTimeout(poll, getNextDelay(attemptsRef.current, intervalMs));
    };

    // First check almost immediately; realtime callback wins when M-PESA responds first.
    onStatus?.('sent');
    timerRef.current = setTimeout(poll, 250);

    return () => { supabase.removeChannel(channel); cleanup(); };
  }, [enabled, checkoutRequestId, transactionId, paymentRequestId, onComplete, onFailed, onTimeout, onStatus, maxAttempts, intervalMs, cleanup]);

  return { stop: cleanup };
}
