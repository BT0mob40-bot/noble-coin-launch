import { useState } from 'react';
import { CoinCard } from './CoinCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Flame, Sparkles, Star, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type FilterTab = 'trending' | 'latest' | 'featured';

export function CoinList() {
  const [activeTab, setActiveTab] = useState<FilterTab>('trending');

  const { data: coins, isLoading } = useQuery({
    queryKey: ['coins', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('coins')
        .select('*')
        .eq('is_active', true);

      if (activeTab === 'trending') {
        query = query.eq('is_trending', true);
      } else if (activeTab === 'featured') {
        query = query.eq('is_featured', true);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="trending" className="gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            <Flame className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="latest" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4" />
            Latest
          </TabsTrigger>
          <TabsTrigger value="featured" className="gap-2 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
            <Star className="h-4 w-4" />
            Featured
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : coins && coins.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coins.map((coin, index) => (
                <CoinCard key={coin.id} coin={coin} index={index} />
              ))}
            </div>
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
