import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Droplet, Flame, ArrowRight, ArrowUpRight, ArrowDownRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface CoinCardProps {
  coin: {
    id: string;
    name: string;
    symbol: string;
    logo_url?: string | null;
    price: number;
    initial_price?: number;
    price_change_24h?: number;
    market_cap?: number | null;
    liquidity: number;
    holders_count: number;
    is_trending?: boolean;
    is_featured?: boolean;
    trading_paused?: boolean;
    burned_supply?: number;
    circulating_supply?: number;
    total_supply?: number;
    rank?: number | null;
    // Override fields
    use_price_change_24h_override?: boolean;
    price_change_24h_override?: number | null;
    use_market_cap_override?: boolean;
    market_cap_override?: number | null;
    use_liquidity_override?: boolean;
    liquidity_override?: number | null;
    use_holders_override?: boolean;
    holders_override?: number | null;
  };
  index?: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(1)}K`;
  return `KES ${num.toFixed(0)}`;
}

function formatPrice(price: number): string {
  if (price < 0.0001) return `KES ${price.toFixed(8)}`;
  if (price < 0.01) return `KES ${price.toFixed(6)}`;
  if (price < 1) return `KES ${price.toFixed(4)}`;
  return `KES ${price.toFixed(2)}`;
}

export function CoinCard({ coin, index = 0 }: CoinCardProps) {
  const navigate = useNavigate();
  
  // Use override values when enabled
  const change = coin.use_price_change_24h_override && coin.price_change_24h_override != null
    ? coin.price_change_24h_override : (coin.price_change_24h || 0);
  const isUp = change >= 0;
  const multiplier = coin.initial_price && coin.initial_price > 0 ? coin.price / coin.initial_price : 1;
  const mcap = coin.use_market_cap_override && coin.market_cap_override != null
    ? coin.market_cap_override : (coin.market_cap || 0);
  const liquidity = coin.use_liquidity_override && coin.liquidity_override != null
    ? coin.liquidity_override : coin.liquidity;
  const holders = coin.use_holders_override && coin.holders_override != null
    ? coin.holders_override : coin.holders_count;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="coin-card group cursor-pointer relative overflow-hidden"
      onClick={() => navigate(`/coin/${coin.id}`)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {coin.rank && (
              <span className="text-xs font-mono text-muted-foreground w-5">#{coin.rank}</span>
            )}
            {coin.logo_url ? (
              <img src={coin.logo_url} alt={coin.name} className="h-10 w-10 rounded-xl object-cover ring-2 ring-border group-hover:ring-primary/50 transition-all" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border group-hover:ring-primary/50 transition-all">
                <span className="text-sm font-bold text-primary">{coin.symbol.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{coin.symbol}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{coin.name}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {coin.is_featured && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-[10px] px-1.5 py-0">⭐</Badge>
            )}
            {coin.is_trending && (
              <Badge variant="outline" className="text-orange-400 border-orange-400/50 text-[10px] px-1.5 py-0 animate-pulse">🔥</Badge>
            )}
            {multiplier > 1.1 && (
              <Badge variant="outline" className="text-success border-success/50 text-[10px] px-1.5 py-0">{multiplier.toFixed(1)}x</Badge>
            )}
          </div>
        </div>

        {/* Price + Change */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-lg font-bold text-primary font-mono">{formatPrice(coin.price)}</p>
          </div>
          <div className={`flex items-center gap-0.5 text-sm font-medium ${isUp ? 'text-success' : 'text-destructive'}`}>
            {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(2)}%
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-1.5 rounded-md bg-muted/30">
            <p className="text-[10px] text-muted-foreground">MCap</p>
            <p className="text-xs font-medium font-mono">{formatNumber(mcap)}</p>
          </div>
          <div className="text-center p-1.5 rounded-md bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Liquidity</p>
            <p className="text-xs font-medium font-mono">{formatNumber(liquidity)}</p>
          </div>
          <div className="text-center p-1.5 rounded-md bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Holders</p>
            <p className="text-xs font-medium">{holders}</p>
          </div>
        </div>

        {/* Burned indicator */}
        {coin.burned_supply && coin.burned_supply > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-orange-400 mb-2 bg-orange-500/10 px-2 py-1 rounded-md">
            <Flame className="h-3 w-3" />
            <span>{(coin.burned_supply / 1000000).toFixed(2)}M burned</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="success" size="sm" disabled={coin.trading_paused} onClick={() => navigate(`/coin/${coin.id}?action=buy`)} className="gap-1 h-7 text-xs px-3">
              Buy <ArrowRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" disabled={coin.trading_paused} onClick={() => navigate(`/coin/${coin.id}?action=sell`)} className="h-7 text-xs px-3">
              Sell
            </Button>
          </div>
          {coin.trading_paused && (
            <span className="text-[10px] text-warning">Paused</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
