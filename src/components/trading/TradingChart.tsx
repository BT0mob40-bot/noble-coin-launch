import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
  volatility: number;
  coinId?: string;
  isOverridden?: boolean;
}

type TimeFrame = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

const TIMEFRAME_MINUTES: Record<TimeFrame, number> = {
  '1M': 1, '5M': 5, '15M': 15, '1H': 60, '4H': 240, '1D': 1440,
};

export function TradingChart({ symbol, currentPrice, volatility, coinId, isOverridden = false }: TradingChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>('1H');
  const [chartData, setChartData] = useState<{ time: string; price: number; volume: number }[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [realDataLoaded, setRealDataLoaded] = useState(false);

  const timeframes: TimeFrame[] = ['1M', '5M', '15M', '1H', '4H', '1D'];

  // Generate simulated data (for overridden coins or fallback)
  const generateSimulatedData = () => {
    const dataPoints = timeframe === '1M' ? 60 : timeframe === '5M' ? 60 : timeframe === '15M' ? 48 : timeframe === '1H' ? 24 : timeframe === '4H' ? 42 : 30;
    const data = [];
    let price = currentPrice * (0.95 + Math.random() * 0.1);
    const volFactor = volatility / 100;

    for (let i = 0; i < dataPoints; i++) {
      const change = (Math.random() - 0.48) * price * volFactor * 0.02;
      price = Math.max(price + change, currentPrice * 0.7);
      const date = new Date();
      date.setMinutes(date.getMinutes() - (dataPoints - i) * TIMEFRAME_MINUTES[timeframe]);
      data.push({
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: Number(price.toFixed(6)),
        volume: Math.floor(Math.random() * 100000 + 10000),
      });
    }
    if (data.length > 0) data[data.length - 1].price = currentPrice;
    return data;
  };

  // Fetch real price history for non-overridden coins
  const fetchRealPriceHistory = async () => {
    if (!coinId || isOverridden) return null;

    const minutesBack = TIMEFRAME_MINUTES[timeframe] * (timeframe === '1D' ? 30 : timeframe === '4H' ? 42 : timeframe === '1H' ? 24 : 60);
    const since = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('price_history')
      .select('price, volume, created_at, trade_type')
      .eq('coin_id', coinId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error || !data || data.length < 2) return null;

    // Bucket data into time intervals
    const intervalMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
    const buckets = new Map<number, { prices: number[]; volume: number }>();

    data.forEach((row) => {
      const ts = new Date(row.created_at).getTime();
      const bucket = Math.floor(ts / intervalMs) * intervalMs;
      if (!buckets.has(bucket)) buckets.set(bucket, { prices: [], volume: 0 });
      const b = buckets.get(bucket)!;
      b.prices.push(Number(row.price));
      b.volume += Number(row.volume || 0);
    });

    const sorted = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
    return sorted.map(([ts, b]) => ({
      time: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: b.prices[b.prices.length - 1], // close price
      volume: b.volume,
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!isOverridden && coinId) {
        const realData = await fetchRealPriceHistory();
        if (!cancelled && realData && realData.length >= 2) {
          setChartData(realData);
          setRealDataLoaded(true);
          const first = realData[0].price;
          const last = realData[realData.length - 1].price;
          setPriceChange(((last - first) / first) * 100);
          return;
        }
      }

      // Fallback to simulated
      if (!cancelled) {
        const data = generateSimulatedData();
        setChartData(data);
        setRealDataLoaded(false);
        if (data.length > 1) {
          setPriceChange(((data[data.length - 1].price - data[0].price) / data[0].price) * 100);
        }
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [timeframe, currentPrice, volatility, coinId, isOverridden]);

  // Real-time updates: for overridden coins simulate ticks, for real coins subscribe to price_history
  useEffect(() => {
    if (isOverridden || !coinId) {
      // Simulated tick for overridden coins
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
    }

    // Subscribe to real price history changes
    const channel = supabase
      .channel(`price-history-${coinId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'price_history',
        filter: `coin_id=eq.${coinId}`,
      }, (payload) => {
        const newRecord = payload.new as any;
        setChartData((prev) => {
          const newPoint = {
            time: new Date(newRecord.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: Number(newRecord.price),
            volume: Number(newRecord.volume || 0),
          };
          const updated = [...prev, newPoint];
          // Keep reasonable size
          if (updated.length > 200) updated.shift();
          // Recalc price change
          if (updated.length > 1) {
            setPriceChange(((updated[updated.length - 1].price - updated[0].price) / updated[0].price) * 100);
          }
          return updated;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentPrice, coinId, isOverridden]);

  const isPositive = priceChange >= 0;
  const chartColor = isPositive ? 'hsl(145, 100%, 45%)' : 'hsl(0, 85%, 60%)';

  const minPrice = useMemo(() => chartData.length > 0 ? Math.min(...chartData.map(d => d.price)) * 0.998 : 0, [chartData]);
  const maxPrice = useMemo(() => chartData.length > 0 ? Math.max(...chartData.map(d => d.price)) * 1.002 : 1, [chartData]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{symbol}/KES</span>
              {!isOverridden && realDataLoaded && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">LIVE</span>
              )}
            </div>
            <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="font-medium">{isPositive ? '+' : ''}{priceChange.toFixed(2)}%</span>
              <span className="text-muted-foreground text-sm ml-2">{timeframe}</span>
            </div>
          </div>
        </div>
        
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
            {chartData.length > 0 ? Math.max(...chartData.map(d => d.price)).toFixed(4) : '0'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Low</p>
          <p className="text-sm font-medium text-destructive">
            {chartData.length > 0 ? Math.min(...chartData.map(d => d.price)).toFixed(4) : '0'}
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
            <Clock className="h-3 w-3" /> {!isOverridden && realDataLoaded ? 'Live' : 'Sim'}
          </p>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className={`w-2 h-2 rounded-full mx-auto mt-1 ${!isOverridden && realDataLoaded ? 'bg-success' : 'bg-warning'}`}
          />
        </div>
      </div>
    </div>
  );
}
