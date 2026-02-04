import { useState, useEffect } from 'react';

interface Order {
  price: number;
  amount: number;
  total: number;
}

interface SimulatedOrderBookProps {
  basePrice?: number;
  className?: string;
}

export function SimulatedOrderBook({ basePrice = 0.05, className }: SimulatedOrderBookProps) {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);

  const generateOrders = (isAsk: boolean): Order[] => {
    const orders: Order[] = [];
    let price = basePrice;
    const spread = basePrice * 0.001;

    for (let i = 0; i < 5; i++) {
      const priceOffset = (i + 1) * spread * (isAsk ? 1 : -1);
      const orderPrice = price + priceOffset;
      const amount = Math.random() * 50000 + 10000;
      orders.push({
        price: Number(orderPrice.toFixed(6)),
        amount: Math.round(amount),
        total: Math.round(amount * orderPrice),
      });
    }
    return orders;
  };

  useEffect(() => {
    setBids(generateOrders(false));
    setAsks(generateOrders(true).reverse());

    const interval = setInterval(() => {
      setBids(prev => prev.map(order => ({
        ...order,
        amount: Math.round(order.amount * (0.9 + Math.random() * 0.2)),
        total: Math.round(order.amount * order.price),
      })));
      setAsks(prev => prev.map(order => ({
        ...order,
        amount: Math.round(order.amount * (0.9 + Math.random() * 0.2)),
        total: Math.round(order.amount * order.price),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [basePrice]);

  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total)
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Order Book</h3>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2 px-2">
        <span>Price (KES)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sells) */}
      <div className="space-y-1 mb-3">
        {asks.map((order, i) => (
          <div
            key={`ask-${i}`}
            className="relative grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded"
          >
            <div
              className="absolute inset-y-0 right-0 bg-destructive/10"
              style={{ width: `${(order.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-destructive">{order.price.toFixed(6)}</span>
            <span className="relative text-right">{order.amount.toLocaleString()}</span>
            <span className="relative text-right text-muted-foreground">{order.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Spread / Current Price */}
      <div className="text-center py-2 bg-primary/5 rounded mb-3">
        <span className="text-lg font-bold text-primary">{basePrice.toFixed(6)}</span>
        <span className="text-xs text-muted-foreground ml-2">KES</span>
      </div>

      {/* Bids (Buys) */}
      <div className="space-y-1">
        {bids.map((order, i) => (
          <div
            key={`bid-${i}`}
            className="relative grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded"
          >
            <div
              className="absolute inset-y-0 right-0 bg-success/10"
              style={{ width: `${(order.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-success">{order.price.toFixed(6)}</span>
            <span className="relative text-right">{order.amount.toLocaleString()}</span>
            <span className="relative text-right text-muted-foreground">{order.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
