import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
  volatility: number;
}

type TimeFrame = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

export function TradingChart({ symbol, currentPrice, volatility }: TradingChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>('1H');
  const [chartData, setChartData] = useState<{ time: string; price: number; volume: number }[]>([]);
  const [priceChange, setPriceChange] = useState(0);

  const timeframes: TimeFrame[] = ['1M', '5M', '15M', '1H', '4H', '1D'];

  // Generate realistic price data based on volatility
  const generateChartData = () => {
    const dataPoints = timeframe === '1M' ? 60 : timeframe === '5M' ? 60 : timeframe === '15M' ? 48 : timeframe === '1H' ? 24 : timeframe === '4H' ? 42 : 30;
    const data = [];
    let price = currentPrice * (0.95 + Math.random() * 0.1);
    const volFactor = volatility / 100;

    for (let i = 0; i < dataPoints; i++) {
      const change = (Math.random() - 0.48) * price * volFactor * 0.02;
      price = Math.max(price + change, currentPrice * 0.7);
      
      const date = new Date();
      date.setMinutes(date.getMinutes() - (dataPoints - i) * (timeframe === '1D' ? 1440 : timeframe === '4H' ? 240 : timeframe === '1H' ? 60 : timeframe === '15M' ? 15 : timeframe === '5M' ? 5 : 1));
      
      data.push({
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: Number(price.toFixed(6)),
        volume: Math.floor(Math.random() * 100000 + 10000),
      });
    }

    // Make sure last price is close to current price
    if (data.length > 0) {
      data[data.length - 1].price = currentPrice;
    }

    return data;
  };

  useEffect(() => {
    const data = generateChartData();
    setChartData(data);
    
    if (data.length > 1) {
      const firstPrice = data[0].price;
      const lastPrice = data[data.length - 1].price;
      setPriceChange(((lastPrice - firstPrice) / firstPrice) * 100);
    }
  }, [timeframe, currentPrice, volatility]);

  // Real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prev) => {
        if (prev.length === 0) return prev;
        const newData = [...prev];
        const lastPoint = { ...newData[newData.length - 1] };
        const change = (Math.random() - 0.5) * currentPrice * 0.001;
        lastPoint.price = Math.max(lastPoint.price + change, currentPrice * 0.9);
        lastPoint.time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        newData[newData.length - 1] = lastPoint;
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPrice]);

  const isPositive = priceChange >= 0;
  const chartColor = isPositive ? 'hsl(145, 100%, 45%)' : 'hsl(0, 85%, 60%)';

  const minPrice = useMemo(() => Math.min(...chartData.map(d => d.price)) * 0.998, [chartData]);
  const maxPrice = useMemo(() => Math.max(...chartData.map(d => d.price)) * 1.002, [chartData]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold">{symbol}/KES</span>
            <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="font-medium">{isPositive ? '+' : ''}{priceChange.toFixed(2)}%</span>
              <span className="text-muted-foreground text-sm ml-2">24h</span>
            </div>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {timeframes.map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-3 text-xs ${timeframe === tf ? 'bg-primary' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minPrice, maxPrice]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(value) => value.toFixed(4)}
              width={60}
              orientation="right"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`KES ${value.toFixed(6)}`, 'Price']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#chartGradient)"
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Stats */}
      <div className="grid grid-cols-4 gap-4 mt-4 px-2 py-3 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">High</p>
          <p className="text-sm font-medium text-success">
            {Math.max(...chartData.map(d => d.price)).toFixed(4)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Low</p>
          <p className="text-sm font-medium text-destructive">
            {Math.min(...chartData.map(d => d.price)).toFixed(4)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="text-sm font-medium">
            {(chartData.reduce((sum, d) => sum + d.volume, 0) / 1000000).toFixed(2)}M
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Live
          </p>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-success mx-auto mt-1"
          />
        </div>
      </div>
    </div>
  );
}
