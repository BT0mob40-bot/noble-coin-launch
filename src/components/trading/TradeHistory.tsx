import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

export function TradeHistory({ currentPrice, symbol }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);

  const generateTrade = (): Trade => {
    const side = Math.random() > 0.48 ? 'buy' : 'sell';
    const priceVariation = (Math.random() - 0.5) * currentPrice * 0.001;
    
    return {
      id: Math.random().toString(36).substring(7),
      price: currentPrice + priceVariation,
      amount: Math.floor(Math.random() * 10000 + 100),
      side,
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
    };
  };

  useEffect(() => {
    // Generate initial trades
    const initialTrades = Array.from({ length: 20 }, () => generateTrade());
    setTrades(initialTrades);

    // Simulate new trades
    const interval = setInterval(() => {
      setTrades((prev) => {
        const newTrade = generateTrade();
        return [newTrade, ...prev.slice(0, 24)];
      });
    }, 1200 + Math.random() * 800);

    return () => clearInterval(interval);
  }, [currentPrice]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-semibold">Recent Trades</h3>
        <span className="text-xs text-muted-foreground">{symbol}/KES</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 py-2 text-xs text-muted-foreground border-b border-border/50">
        <span>Price (KES)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
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
      </div>
    </div>
  );
}
