import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LiveMarketMetrics {
  priceChange24h: number;     // %
  volume24h: number;           // sum of trade volumes
  liquidityKes: number;        // last-hour rolling notional turnover (proxy)
  volatilityPct: number;       // stdev / mean * 100 over last 24h
  holders: number;             // distinct holders from holdings
  loaded: boolean;
}

const ZERO: LiveMarketMetrics = {
  priceChange24h: 0, volume24h: 0, liquidityKes: 0, volatilityPct: 0, holders: 0, loaded: false,
};

/**
 * Computes 100% market-driven metrics from price_history + holdings.
 * Excludes 'drift' rows so trader activity defines the metric.
 */
export function useLiveMarketMetrics(coinId: string | undefined, currentPrice: number, enabled: boolean) {
  const [metrics, setMetrics] = useState<LiveMarketMetrics>(ZERO);

  const recompute = useCallback(async () => {
    if (!coinId || !enabled) return;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ data: hist24 }, { data: holdersRows }] = await Promise.all([
      supabase
        .from('price_history')
        .select('price, volume, created_at, trade_type')
        .eq('coin_id', coinId)
        .gte('created_at', since24h)
        .order('created_at', { ascending: true })
        .limit(2000),
      supabase
        .from('holdings')
        .select('user_id', { count: 'exact', head: true })
        .eq('coin_id', coinId)
        .gt('amount', 0),
    ]);

    const trades = (hist24 || []).filter((r: any) => r.trade_type !== 'drift');
    let priceChange24h = 0;
    let volume24h = 0;
    let liquidity = 0;
    let volatility = 0;

    if (trades.length >= 2) {
      const first = Number(trades[0].price) || currentPrice;
      const last = Number(trades[trades.length - 1].price) || currentPrice;
      priceChange24h = first > 0 ? ((last - first) / first) * 100 : 0;
      volume24h = trades.reduce((s, r: any) => s + Number(r.volume || 0), 0);

      // liquidity = last-hour notional turnover (price * volume)
      liquidity = trades
        .filter((r: any) => r.created_at >= since1h)
        .reduce((s, r: any) => s + Number(r.price) * Number(r.volume || 0), 0);

      // volatility: stdev/mean * 100 of trade prices
      const prices = trades.map((r: any) => Number(r.price));
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
      volatility = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;
    }

    setMetrics({
      priceChange24h: Number.isFinite(priceChange24h) ? priceChange24h : 0,
      volume24h,
      liquidityKes: liquidity,
      volatilityPct: Number.isFinite(volatility) ? volatility : 0,
      holders: (holdersRows as any)?.length ?? 0,
      loaded: true,
    });
  }, [coinId, currentPrice, enabled]);

  // Holders count via separate query (head:true returns count via response)
  useEffect(() => {
    if (!coinId || !enabled) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('holdings')
        .select('*', { count: 'exact', head: true })
        .eq('coin_id', coinId)
        .gt('amount', 0);
      if (!cancelled) setMetrics(prev => ({ ...prev, holders: count || 0 }));
    })();
    return () => { cancelled = true; };
  }, [coinId, enabled]);

  useEffect(() => {
    if (!coinId || !enabled) return;
    recompute();

    const channel = supabase
      .channel(`live-metrics-${coinId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'price_history',
        filter: `coin_id=eq.${coinId}`,
      }, () => { recompute(); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'holdings',
        filter: `coin_id=eq.${coinId}`,
      }, () => { recompute(); })
      .subscribe();

    const interval = setInterval(recompute, 60_000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [coinId, enabled, recompute]);

  return metrics;
}
