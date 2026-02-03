import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Droplets, 
  Activity,
  Clock,
  BarChart3,
  Coins
} from 'lucide-react';

interface MarketStatsProps {
  coin: {
    price: number;
    market_cap: number | null;
    liquidity: number;
    holders_count: number;
    volatility: number;
    total_supply: number;
    circulating_supply: number;
    burned_supply?: number;
  };
  priceChange24h?: number;
}

export function MarketStats({ coin, priceChange24h = 5.23 }: MarketStatsProps) {
  const marketCap = coin.market_cap || coin.price * coin.circulating_supply;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      label: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-success' : 'text-destructive',
      bgColor: isPositive ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      label: 'Market Cap',
      value: `KES ${(marketCap / 1000000).toFixed(2)}M`,
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Liquidity',
      value: `KES ${coin.liquidity.toLocaleString()}`,
      icon: Droplets,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Holders',
      value: coin.holders_count.toLocaleString(),
      icon: Users,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Volatility',
      value: `${coin.volatility.toFixed(1)}%`,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Circulating',
      value: `${((coin.circulating_supply / coin.total_supply) * 100).toFixed(1)}%`,
      icon: Coins,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  // Add burned supply if present
  if (coin.burned_supply && coin.burned_supply > 0) {
    stats.push({
      label: 'Burned',
      value: `${((coin.burned_supply / coin.total_supply) * 100).toFixed(1)}%`,
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass-card p-3 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
            </div>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
