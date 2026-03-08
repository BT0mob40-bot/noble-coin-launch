import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Trade {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: string;
}

interface TradeHistoryProps {
  currentPrice: number;
  symbol: string;
  coinId?: string;
  isOverridden?: boolean;
}

export function TradeHistory({ currentPrice, symbol, coinId, isOverridden = false }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [hasRealData, setHasRealData] = useState(false);

  // Generate simulated trade
  const generateTrade = (): Trade => {
    const side = Math.random() > 0.48 ? 'buy' : 'sell';
    const priceVariation = (Math.random() - 0.5) * currentPrice * 0.001;
    return {
      id: Math.random().toString(36).substring(7),
      price: currentPrice + priceVariation,
      amount: Math.floor(Math.random() * 10000 + 100),
      side,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  // Fetch real transactions
  useEffect(() => {
    if (!coinId || isOverridden) {
      // Simulated trades for overridden coins
      const initialTrades = Array.from({ length: 20 }, () => generateTrade());
      setTrades(initialTrades);
      setHasRealData(false);

      const interval = setInterval(() => {
        setTrades((prev) => [generateTrade(), ...prev.slice(0, 24)]);
      }, 1200 + Math.random() * 800);
      return () => clearInterval(interval);
    }

    // Load real transactions
    const loadRealTrades = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, price_per_coin, amount, type, created_at')
        .eq('coin_id', coinId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && data && data.length > 0) {
        setHasRealData(true);
        setTrades(data.map((tx) => ({
          id: tx.id,
          price: tx.price_per_coin,
          amount: tx.amount,
          side: tx.type as 'buy' | 'sell',
          time: new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })));
      } else {
        // No trades yet - show empty state
        setHasRealData(true);
        setTrades([]);
      }
    };

    loadRealTrades();

    // Subscribe to new transactions in realtime
    const channel = supabase
      .channel(`trades-${coinId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `coin_id=eq.${coinId}`,
      }, (payload) => {
        const tx = payload.new as any;
        if (tx.status === 'completed') {
          const newTrade: Trade = {
            id: tx.id,
            price: tx.price_per_coin,
            amount: tx.amount,
            side: tx.type,
            time: new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          setTrades((prev) => [newTrade, ...prev.slice(0, 24)]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coinId, isOverridden, currentPrice]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Recent Trades</h3>
          {!isOverridden && hasRealData && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-success/10 text-success border border-success/20">REAL</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{symbol}/KES</span>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2 text-xs text-muted-foreground border-b border-border/50">
        <span>Price (KES)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {trades.length === 0 && hasRealData ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No trades yet. Be the first!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {trades.map((trade) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: -20, backgroundColor: trade.side === 'buy' ? 'hsl(145 100% 45% / 0.2)' : 'hsl(0 85% 60% / 0.2)' }}
                animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-3 gap-2 py-1.5 text-xs border-b border-border/20"
              >
                <span className={`font-mono ${trade.side === 'buy' ? 'text-success' : 'text-destructive'}`}>
                  {trade.price.toFixed(6)}
                </span>
                <span className="text-right font-mono">{trade.amount.toLocaleString()}</span>
                <span className="text-right text-muted-foreground">{trade.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
