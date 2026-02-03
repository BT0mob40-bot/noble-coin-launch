import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Droplet, Flame, ArrowRight } from 'lucide-react';
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
    market_cap?: number | null;
    liquidity: number;
    holders_count: number;
    is_trending?: boolean;
    is_featured?: boolean;
    trading_paused?: boolean;
    burned_supply?: number;
  };
  index?: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

export function CoinCard({ coin, index = 0 }: CoinCardProps) {
  const navigate = useNavigate();

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/coin/${coin.id}?action=buy`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="coin-card group cursor-pointer relative overflow-hidden"
      onClick={() => navigate(`/coin/${coin.id}`)}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500" />
      
      <div className="relative z-10">
        {/* Header with logo and badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {coin.logo_url ? (
              <img
                src={coin.logo_url}
                alt={coin.name}
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-border group-hover:ring-primary/50 transition-all"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border group-hover:ring-primary/50 transition-all">
                <span className="text-lg font-bold text-primary">{coin.symbol.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {coin.symbol}
              </h3>
              <p className="text-sm text-muted-foreground">{coin.name}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {coin.is_featured && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-xs">
                ⭐ Featured
              </Badge>
            )}
            {coin.is_trending && (
              <Badge variant="outline" className="text-orange-400 border-orange-400/50 text-xs animate-pulse">
                🔥 Trending
              </Badge>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="stat-card !p-3 text-center group-hover:bg-muted/80 transition-colors">
            <DollarSign className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-sm font-semibold">{formatNumber(coin.market_cap || 0)}</p>
            <p className="text-xs text-muted-foreground">Market Cap</p>
          </div>
          <div className="stat-card !p-3 text-center group-hover:bg-muted/80 transition-colors">
            <Droplet className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-sm font-semibold">{formatNumber(coin.liquidity)}</p>
            <p className="text-xs text-muted-foreground">Liquidity</p>
          </div>
          <div className="stat-card !p-3 text-center group-hover:bg-muted/80 transition-colors">
            <Users className="h-4 w-4 text-success mx-auto mb-1" />
            <p className="text-sm font-semibold">{coin.holders_count}</p>
            <p className="text-xs text-muted-foreground">Holders</p>
          </div>
        </div>

        {/* Burned supply indicator */}
        {coin.burned_supply && coin.burned_supply > 0 && (
          <div className="flex items-center gap-2 text-xs text-orange-400 mb-3 bg-orange-500/10 px-2 py-1 rounded-md">
            <Flame className="h-3 w-3" />
            <span>{(coin.burned_supply / 1000000).toFixed(2)}M tokens burned</span>
          </div>
        )}

        {/* Price and actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-lg font-bold text-primary">{formatPrice(coin.price)}</p>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="success" 
              size="sm"
              disabled={coin.trading_paused}
              onClick={handleBuyClick}
              className="gap-1 group/btn"
            >
              Buy
              <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={coin.trading_paused}
              onClick={() => navigate(`/coin/${coin.id}?action=sell`)}
            >
              Sell
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
