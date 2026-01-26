import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Droplet } from 'lucide-react';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="coin-card group cursor-pointer"
      onClick={() => navigate(`/coin/${coin.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {coin.logo_url ? (
            <img
              src={coin.logo_url}
              alt={coin.name}
              className="h-12 w-12 rounded-xl object-cover ring-2 ring-border"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border">
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
            <Badge variant="outline" className="text-orange-400 border-orange-400/50 text-xs">
              🔥 Trending
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="stat-card !p-3 text-center">
          <DollarSign className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-sm font-semibold">{formatNumber(coin.market_cap || 0)}</p>
          <p className="text-xs text-muted-foreground">Market Cap</p>
        </div>
        <div className="stat-card !p-3 text-center">
          <Droplet className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="text-sm font-semibold">{formatNumber(coin.liquidity)}</p>
          <p className="text-xs text-muted-foreground">Liquidity</p>
        </div>
        <div className="stat-card !p-3 text-center">
          <Users className="h-4 w-4 text-success mx-auto mb-1" />
          <p className="text-sm font-semibold">{coin.holders_count}</p>
          <p className="text-xs text-muted-foreground">Holders</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="text-lg font-bold text-primary">{formatPrice(coin.price)}</p>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="success" 
            size="sm"
            disabled={coin.trading_paused}
            onClick={() => navigate(`/coin/${coin.id}?action=buy`)}
          >
            Buy
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
    </motion.div>
  );
}
