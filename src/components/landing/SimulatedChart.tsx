import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SimulatedChartProps {
  basePrice?: number;
  trend?: 'up' | 'down' | 'volatile';
  className?: string;
}

export function SimulatedChart({ basePrice = 0.05, trend = 'up', className }: SimulatedChartProps) {
  const [data, setData] = useState<Array<{ time: string; price: number }>>([]);

  const generateData = useMemo(() => {
    const points = [];
    let price = basePrice;
    
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      const volatility = trend === 'volatile' ? 0.15 : 0.05;
      const trendBias = trend === 'up' ? 0.02 : trend === 'down' ? -0.02 : 0;
      const change = (Math.random() - 0.5) * volatility + trendBias;
      price = Math.max(0.001, price * (1 + change));
      points.push({ time: hour, price: Number(price.toFixed(4)) });
    }
    return points;
  }, [basePrice, trend]);

  useEffect(() => {
    setData(generateData);
    
    // Update periodically for "live" effect
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const lastPrice = prev[prev.length - 1]?.price || basePrice;
        const volatility = trend === 'volatile' ? 0.1 : 0.03;
        const trendBias = trend === 'up' ? 0.01 : trend === 'down' ? -0.01 : 0;
        const change = (Math.random() - 0.5) * volatility + trendBias;
        const newPrice = Math.max(0.001, lastPrice * (1 + change));
        newData.push({ 
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), 
          price: Number(newPrice.toFixed(4)) 
        });
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [basePrice, trend, generateData]);

  const isPositive = data.length >= 2 && data[data.length - 1]?.price > data[0]?.price;
  const color = isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))';

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${trend}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`KES ${value.toFixed(4)}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${trend})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
