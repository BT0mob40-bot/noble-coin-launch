import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookProps {
  currentPrice: number;
  symbol: string;
  coinId?: string;
  isOverridden?: boolean;
}

export function OrderBook({ currentPrice, symbol, coinId, isOverridden = false }: OrderBookProps) {
  const [asks, setAsks] = useState<Order[]>([]);
  const [bids, setBids] = useState<Order[]>([]);
  const [lastPrice, setLastPrice] = useState(currentPrice);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [hasRealData, setHasRealData] = useState(false);

  // Generate orders around a price based on real trade patterns or simulation
  const generateOrders = (basePrice: number, side: 'ask' | 'bid', realVolumes?: number[]): Order[] => {
    const orders: Order[] = [];
    let cumTotal = 0;
    
    for (let i = 0; i < 12; i++) {
      const spread = side === 'ask' 
        ? basePrice * (1 + 0.0001 * (i + 1) + Math.random() * 0.0002)
        : basePrice * (1 - 0.0001 * (i + 1) - Math.random() * 0.0002);
      
      const amount = realVolumes && realVolumes[i]
        ? Math.floor(realVolumes[i] * (0.8 + Math.random() * 0.4))
        : Math.floor(Math.random() * 50000 + 5000);
      cumTotal += amount;
      
      orders.push({
        price: Number(spread.toFixed(6)),
        amount,
        total: cumTotal,
      });
    }
    
    return orders;
  };

  // Fetch real trade volume distribution to make order book realistic
  useEffect(() => {
    if (!coinId || isOverridden) {
      setAsks(generateOrders(currentPrice, 'ask'));
      setBids(generateOrders(currentPrice, 'bid'));
      setHasRealData(false);
      return;
    }

    const loadRealDistribution = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('coin_id', coinId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        setHasRealData(true);
        const buyVolumes = data.filter(t => t.type === 'buy').map(t => Number(t.amount));
        const sellVolumes = data.filter(t => t.type === 'sell').map(t => Number(t.amount));
        
        // Use real volumes as basis for depth
        setAsks(generateOrders(currentPrice, 'ask', sellVolumes.length > 0 ? sellVolumes : undefined));
        setBids(generateOrders(currentPrice, 'bid', buyVolumes.length > 0 ? buyVolumes : undefined));
      } else {
        setAsks(generateOrders(currentPrice, 'ask'));
        setBids(generateOrders(currentPrice, 'bid'));
      }
    };

    loadRealDistribution();
  }, [coinId, isOverridden]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAsks(prev => {
        // Small perturbations on existing orders
        return prev.map((order, i) => ({
          ...order,
          amount: Math.max(100, order.amount + Math.floor((Math.random() - 0.5) * order.amount * 0.05)),
          total: 0, // recalc below
        })).reduce((acc, order) => {
          const cum = acc.length > 0 ? acc[acc.length - 1].total : 0;
          acc.push({ ...order, total: cum + order.amount });
          return acc;
        }, [] as Order[]);
      });
      setBids(prev => {
        return prev.map((order) => ({
          ...order,
          amount: Math.max(100, order.amount + Math.floor((Math.random() - 0.5) * order.amount * 0.05)),
          total: 0,
        })).reduce((acc, order) => {
          const cum = acc.length > 0 ? acc[acc.length - 1].total : 0;
          acc.push({ ...order, total: cum + order.amount });
          return acc;
        }, [] as Order[]);
      });
      
      const priceChange = (Math.random() - 0.48) * currentPrice * 0.0001;
      const newPrice = currentPrice + priceChange;
      setPriceDirection(newPrice > lastPrice ? 'up' : 'down');
      setLastPrice(newPrice);
    }, 1500);

    return () => clearInterval(interval);
  }, [currentPrice, lastPrice]);

  const maxTotal = Math.max(
    ...asks.map(o => o.total),
    ...bids.map(o => o.total),
    1
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Order Book</h3>
          {!isOverridden && hasRealData && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-success/10 text-success border border-success/20">LIVE</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{symbol}/KES</span>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2 text-xs text-muted-foreground border-b border-border/50">
        <span>Price (KES)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(50%-20px)] overflow-hidden flex flex-col-reverse">
          {asks.slice(0, 8).reverse().map((order, i) => (
            <motion.div
              key={`ask-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="relative grid grid-cols-3 gap-2 py-1 text-xs"
            >
              <div 
                className="absolute inset-0 bg-destructive/10 rounded-sm"
                style={{ width: `${(order.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
              />
              <span className="relative text-destructive font-mono">{order.price.toFixed(6)}</span>
              <span className="relative text-right font-mono">{order.amount.toLocaleString()}</span>
              <span className="relative text-right font-mono text-muted-foreground">{order.total.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          key={lastPrice}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          className={`py-2 my-1 text-center font-bold text-lg rounded ${
            priceDirection === 'up' 
              ? 'bg-success/10 text-success' 
              : priceDirection === 'down'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted/50'
          }`}
        >
          {currentPrice.toFixed(6)}
        </motion.div>

        <div className="h-[calc(50%-20px)] overflow-hidden">
          {bids.slice(0, 8).map((order, i) => (
            <motion.div
              key={`bid-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="relative grid grid-cols-3 gap-2 py-1 text-xs"
            >
              <div 
                className="absolute inset-0 bg-success/10 rounded-sm"
                style={{ width: `${(order.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
              />
              <span className="relative text-success font-mono">{order.price.toFixed(6)}</span>
              <span className="relative text-right font-mono">{order.amount.toLocaleString()}</span>
              <span className="relative text-right font-mono text-muted-foreground">{order.total.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
