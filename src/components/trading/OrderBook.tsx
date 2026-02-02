import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Order {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookProps {
  currentPrice: number;
  symbol: string;
}

export function OrderBook({ currentPrice, symbol }: OrderBookProps) {
  const [asks, setAsks] = useState<Order[]>([]);
  const [bids, setBids] = useState<Order[]>([]);
  const [lastPrice, setLastPrice] = useState(currentPrice);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);

  const generateOrders = (basePrice: number, side: 'ask' | 'bid'): Order[] => {
    const orders: Order[] = [];
    let cumTotal = 0;
    
    for (let i = 0; i < 12; i++) {
      const spread = side === 'ask' 
        ? basePrice * (1 + 0.0001 * (i + 1) + Math.random() * 0.0002)
        : basePrice * (1 - 0.0001 * (i + 1) - Math.random() * 0.0002);
      
      const amount = Math.floor(Math.random() * 50000 + 5000);
      cumTotal += amount;
      
      orders.push({
        price: Number(spread.toFixed(6)),
        amount,
        total: cumTotal,
      });
    }
    
    return side === 'ask' ? orders : orders;
  };

  useEffect(() => {
    setAsks(generateOrders(currentPrice, 'ask'));
    setBids(generateOrders(currentPrice, 'bid'));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newAsks = generateOrders(currentPrice, 'ask');
      const newBids = generateOrders(currentPrice, 'bid');
      
      setAsks(newAsks);
      setBids(newBids);
      
      // Simulate price movement
      const priceChange = (Math.random() - 0.48) * currentPrice * 0.0001;
      const newPrice = currentPrice + priceChange;
      setPriceDirection(newPrice > lastPrice ? 'up' : 'down');
      setLastPrice(newPrice);
    }, 1500);

    return () => clearInterval(interval);
  }, [currentPrice, lastPrice]);

  const maxTotal = Math.max(
    ...asks.map(o => o.total),
    ...bids.map(o => o.total)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-semibold">Order Book</h3>
        <span className="text-xs text-muted-foreground">{symbol}/KES</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 py-2 text-xs text-muted-foreground border-b border-border/50">
        <span>Price (KES)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sell Orders) */}
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
              {/* Depth visualization */}
              <div 
                className="absolute inset-0 bg-destructive/10 rounded-sm"
                style={{ 
                  width: `${(order.total / maxTotal) * 100}%`,
                  right: 0,
                  left: 'auto',
                }}
              />
              <span className="relative text-destructive font-mono">{order.price.toFixed(6)}</span>
              <span className="relative text-right font-mono">{order.amount.toLocaleString()}</span>
              <span className="relative text-right font-mono text-muted-foreground">{order.total.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>

        {/* Current Price */}
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

        {/* Bids (Buy Orders) */}
        <div className="h-[calc(50%-20px)] overflow-hidden">
          {bids.slice(0, 8).map((order, i) => (
            <motion.div
              key={`bid-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="relative grid grid-cols-3 gap-2 py-1 text-xs"
            >
              {/* Depth visualization */}
              <div 
                className="absolute inset-0 bg-success/10 rounded-sm"
                style={{ 
                  width: `${(order.total / maxTotal) * 100}%`,
                  right: 0,
                  left: 'auto',
                }}
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
