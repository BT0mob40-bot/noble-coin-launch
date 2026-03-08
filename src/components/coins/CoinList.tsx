import { useState, useEffect } from 'react';
import { CoinCard } from './CoinCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Flame, Sparkles, Star, Loader2, BarChart3, ArrowUpDown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type FilterTab = 'all' | 'trending' | 'latest' | 'featured';

export function CoinList() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const queryClient = useQueryClient();

  const { data: coins, isLoading } = useQuery({
    queryKey: ['coins', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('coins')
        .select('*')
        .eq('is_active', true)
        .eq('is_approved', true);

      if (activeTab === 'trending') {
        query = query.eq('is_trending', true);
      } else if (activeTab === 'featured') {
        query = query.eq('is_featured', true);
      } else if (activeTab === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('market_cap', { ascending: false, nullsFirst: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Fetch real 24h price changes from price_history
      const { data: priceChanges } = await supabase.rpc('get_coin_price_changes_24h');
      const changeMap = new Map<string, number>();
      if (priceChanges) {
        priceChanges.forEach((pc: { coin_id: string; price_change_24h: number }) => {
          changeMap.set(pc.coin_id, pc.price_change_24h);
        });
      }

      // Merge real 24h change into non-overridden coins
      return (data || []).map((coin, i) => ({
        ...coin,
        rank: i + 1,
        price_change_24h: coin.use_price_change_24h_override && coin.price_change_24h_override != null
          ? coin.price_change_24h_override
          : (changeMap.get(coin.id) ?? 0),
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('coins-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coins' }, () => {
        queryClient.invalidateQueries({ queryKey: ['coins'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const showAsList = (coins?.length || 0) > 10;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="bg-muted/50 border border-border flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> All
          </TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 text-xs">
            <Flame className="h-3.5 w-3.5" /> Trending
          </TabsTrigger>
          <TabsTrigger value="latest" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Latest
          </TabsTrigger>
          <TabsTrigger value="featured" className="gap-1.5 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 text-xs">
            <Star className="h-3.5 w-3.5" /> Featured
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : coins && coins.length > 0 ? (
            showAsList ? (
              // List view for 10+ coins - compact table
              <div className="glass-card overflow-hidden">
                {coins.map((coin, index) => (
                  <CoinListRow key={coin.id} coin={coin} index={index} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {coins.map((coin, index) => (
                  <CoinCard key={coin.id} coin={coin} index={index} />
                ))}
              </div>
            )
          ) : (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No coins found in this category yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Compact list row component for 10+ coins
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function CoinListRow({ coin, index }: { coin: any; index: number }) {
  const navigate = useNavigate();
  const change = coin.use_price_change_24h_override && coin.price_change_24h_override != null
    ? coin.price_change_24h_override
    : (coin.price_change_24h || 0);
  const isUp = change >= 0;
  const rawMcap = coin.market_cap || coin.price * (coin.circulating_supply || 0);
  const mcap = coin.use_market_cap_override && coin.market_cap_override != null
    ? coin.market_cap_override : rawMcap;
  const liquidity = coin.use_liquidity_override && coin.liquidity_override != null
    ? coin.liquidity_override : coin.liquidity;
  const holders = coin.use_holders_override && coin.holders_override != null
    ? coin.holders_override : coin.holders_count;

  const formatPrice = (p: number) => {
    if (p < 0.0001) return p.toFixed(8);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    return p.toFixed(2);
  };

  const formatMcap = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={() => navigate(`/coin/${coin.id}`)}
      className="grid grid-cols-[28px_1fr_auto] sm:grid-cols-[36px_1fr_100px_90px_90px_70px_80px] gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors items-center"
    >
      <span className="text-xs text-muted-foreground font-mono">{coin.rank || index + 1}</span>
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {coin.logo_url ? (
            <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-primary">{coin.symbol.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-xs truncate">{coin.name}</span>
            {coin.is_trending && <Flame className="h-3 w-3 text-orange-400 flex-shrink-0" />}
          </div>
          <span className="text-[10px] text-muted-foreground">{coin.symbol}</span>
        </div>
      </div>

      {/* Mobile: combined price+change */}
      <div className="sm:hidden text-right">
        <p className="font-mono text-xs">{formatPrice(coin.price)}</p>
        <p className={`text-[10px] ${isUp ? 'text-success' : 'text-destructive'}`}>
          {isUp ? '+' : ''}{change.toFixed(2)}%
        </p>
      </div>

      <span className="hidden sm:block text-right font-mono text-xs">KES {formatPrice(coin.price)}</span>
      <span className={`hidden sm:flex items-center justify-end gap-0.5 text-xs font-medium ${isUp ? 'text-success' : 'text-destructive'}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(change).toFixed(2)}%
      </span>
      <span className="hidden sm:block text-right text-[10px] text-muted-foreground font-mono">KES {formatMcap(mcap)}</span>
      <span className="hidden sm:block text-right text-[10px] text-muted-foreground">{holders}</span>
      <div className="hidden sm:flex justify-end" onClick={(e) => e.stopPropagation()}>
        <Button variant="success" size="sm" className="h-6 text-[10px] px-2" onClick={() => navigate(`/coin/${coin.id}?action=buy`)}>
          Buy
        </Button>
      </div>
    </motion.div>
  );
}
