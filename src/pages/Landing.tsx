import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, Shield, Zap, TrendingUp, ArrowRight, Coins, Users, Flame, 
  ArrowUpRight, ArrowDownRight, Activity, BarChart3, ChevronRight,
  Star, Sparkles, Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface SiteSettings {
  site_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_badge: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_3_title: string;
  feature_3_description: string;
  feature_4_title: string;
  feature_4_description: string;
  stats_tokens: string;
  stats_traders: string;
  stats_volume: string;
  stats_uptime: string;
  cta_title: string;
  cta_subtitle: string;
  coin_creation_fee?: number;
}

interface TopCoin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  market_cap: number | null;
  liquidity: number;
  holders_count: number;
  logo_url: string | null;
  is_trending: boolean;
  is_featured: boolean;
  circulating_supply: number;
  total_supply: number;
  rank?: number | null;
}

const defaultSettings: SiteSettings = {
  site_name: 'CryptoLaunch',
  hero_title: 'Trade Crypto with M-PESA',
  hero_subtitle: 'The first crypto launchpad designed for Africa. Buy, sell, and launch tokens instantly using M-PESA mobile money.',
  hero_badge: 'Next-Gen Crypto Launchpad',
  feature_1_title: 'Launch Your Token',
  feature_1_description: 'Create and launch your crypto token in minutes with our easy-to-use platform.',
  feature_2_title: 'Secure Trading',
  feature_2_description: 'Advanced security measures protect your assets and transactions.',
  feature_3_title: 'Instant M-PESA',
  feature_3_description: 'Buy and sell tokens instantly using M-PESA mobile money.',
  feature_4_title: 'Real-Time Prices',
  feature_4_description: 'Live price updates and market data for informed trading decisions.',
  stats_tokens: '100+',
  stats_traders: '50K+',
  stats_volume: '$10M+',
  stats_uptime: '99.9%',
  cta_title: 'Join the Revolution',
  cta_subtitle: 'Start trading crypto today with the easiest mobile money integration in Africa.',
  coin_creation_fee: 5000,
};

const featureIcons = [
  <Rocket className="h-6 w-6" />,
  <Shield className="h-6 w-6" />,
  <Zap className="h-6 w-6" />,
  <TrendingUp className="h-6 w-6" />,
];

function formatPrice(price: number): string {
  if (price < 0.0001) return price.toFixed(8);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

function formatMarketCap(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

export default function Landing() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [topCoins, setTopCoins] = useState<TopCoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, coinsRes] = await Promise.all([
        supabase.from('site_settings').select('*').single(),
        supabase.from('coins').select('id, name, symbol, price, price_change_24h, market_cap, liquidity, holders_count, logo_url, is_trending, is_featured, circulating_supply, total_supply, rank')
          .eq('is_active', true).eq('is_approved', true)
          .order('market_cap', { ascending: false, nullsFirst: false })
          .limit(20),
      ]);
      if (settingsRes.data) setSettings({ ...defaultSettings, ...settingsRes.data });
      if (coinsRes.data) setTopCoins(coinsRes.data as TopCoin[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Realtime coin updates
  useEffect(() => {
    const channel = supabase
      .channel('landing-coins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coins' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const renderHeroTitle = () => {
    const title = settings.hero_title;
    if (title.includes('M-PESA')) {
      const parts = title.split('M-PESA');
      return <>{parts[0]}<span className="gradient-text">M-PESA</span>{parts[1]}</>;
    }
    const words = title.split(' ');
    if (words.length > 2) {
      const lastTwo = words.slice(-2).join(' ');
      const rest = words.slice(0, -2).join(' ');
      return <>{rest} <span className="gradient-text">{lastTwo}</span></>;
    }
    return <span className="gradient-text">{title}</span>;
  };

  const features = [
    { icon: featureIcons[0], title: settings.feature_1_title, description: settings.feature_1_description },
    { icon: featureIcons[1], title: settings.feature_2_title, description: settings.feature_2_description },
    { icon: featureIcons[2], title: settings.feature_3_title, description: settings.feature_3_description },
    { icon: featureIcons[3], title: settings.feature_4_title, description: settings.feature_4_description },
  ];

  const stats = [
    { value: settings.stats_tokens, label: 'Tokens Listed' },
    { value: settings.stats_traders, label: 'Active Traders' },
    { value: settings.stats_volume, label: 'Trading Volume' },
    { value: settings.stats_uptime, label: 'Uptime' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section - Compact Binance style */}
      <section className="relative pt-20 sm:pt-28 pb-10 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container relative z-10 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6"
            >
              <Flame className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs sm:text-sm text-primary font-medium">{settings.hero_badge}</span>
            </motion.div>
            
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold font-display mb-4 sm:mb-6 leading-tight">
              {renderHeroTitle()}
            </h1>
            
            <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              {settings.hero_subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate('/launchpad')} className="gap-2 group">
                <Rocket className="h-4 w-4 sm:h-5 sm:w-5 group-hover:animate-bounce" />
                Explore Launchpad
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/auth')} className="gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Create Account
              </Button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-10 sm:mt-16"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="glass-card p-3 sm:p-5 text-center group hover:border-primary/50 transition-all"
              >
                <p className="text-xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Live Market Table - Binance style */}
      <section className="py-8 sm:py-16 border-t border-border/50">
        <div className="container px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-4 sm:mb-6"
          >
            <div>
              <h2 className="text-xl sm:text-3xl font-bold font-display">
                <span className="gradient-text">Market</span> Overview
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Live prices ranked by market cap</p>
            </div>
            <Button variant="glass" size="sm" onClick={() => navigate('/launchpad')} className="gap-1 text-xs">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </motion.div>

          {/* Market Table */}
          <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[40px_1fr_120px_100px_100px_80px_100px] gap-3 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
              <span>#</span>
              <span>Name</span>
              <span className="text-right">Price (KES)</span>
              <span className="text-right">24h %</span>
              <span className="text-right">Market Cap</span>
              <span className="text-right">Holders</span>
              <span className="text-right">Action</span>
            </div>

            {topCoins.length === 0 && !loading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Coins className="h-8 w-8 mx-auto mb-3 opacity-50" />
                No coins listed yet. Be the first to launch!
              </div>
            ) : (
              topCoins.map((coin, index) => {
                const isUp = coin.price_change_24h >= 0;
                const mcap = coin.market_cap || coin.price * coin.circulating_supply;
                return (
                  <motion.div
                    key={coin.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => navigate(`/coin/${coin.id}`)}
                    className="grid grid-cols-[28px_1fr_auto] sm:grid-cols-[40px_1fr_120px_100px_100px_80px_100px] gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors items-center"
                  >
                    {/* Rank */}
                    <span className="text-xs text-muted-foreground font-mono">{coin.rank || index + 1}</span>
                    
                    {/* Name + Logo */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {coin.logo_url ? (
                          <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] sm:text-xs font-bold text-primary">{coin.symbol.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-xs sm:text-sm truncate">{coin.name}</span>
                          {coin.is_trending && <Flame className="h-3 w-3 text-orange-400 flex-shrink-0" />}
                          {coin.is_featured && <Star className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{coin.symbol}</span>
                      </div>
                    </div>

                    {/* Mobile: Price + Change in one column */}
                    <div className="sm:hidden text-right">
                      <p className="font-mono text-xs font-medium">KES {formatPrice(coin.price)}</p>
                      <p className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${isUp ? 'text-success' : 'text-destructive'}`}>
                        {isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {Math.abs(coin.price_change_24h).toFixed(2)}%
                      </p>
                    </div>
                    
                    {/* Desktop columns */}
                    <span className="hidden sm:block text-right font-mono text-sm">KES {formatPrice(coin.price)}</span>
                    <span className={`hidden sm:flex items-center justify-end gap-1 text-sm font-medium ${isUp ? 'text-success' : 'text-destructive'}`}>
                      {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {Math.abs(coin.price_change_24h).toFixed(2)}%
                    </span>
                    <span className="hidden sm:block text-right text-xs text-muted-foreground font-mono">KES {formatMarketCap(mcap)}</span>
                    <span className="hidden sm:block text-right text-xs text-muted-foreground">{coin.holders_count}</span>
                    <div className="hidden sm:flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="success" size="sm" className="h-7 text-xs px-3" onClick={() => navigate(`/coin/${coin.id}?action=buy`)}>
                        Buy
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {topCoins.length > 0 && (
            <div className="text-center mt-4">
              <Button variant="glass" onClick={() => navigate('/launchpad')} className="gap-2">
                View All {topCoins.length}+ Tokens <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* How Bonding Curve Works */}
      <section className="py-10 sm:py-20 border-t border-border/50">
        <div className="container px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3">
              How <span className="gradient-text">Pricing</span> Works
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
              Solana-inspired bonding curve ensures fair, transparent pricing. Early holders benefit most.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: <TrendingUp className="h-7 w-7 text-success" />, title: 'Buy = Price Up', desc: 'Each purchase increases circulating supply, pushing price higher on the bonding curve.', color: 'bg-success/10 border-success/20' },
              { icon: <ArrowDownRight className="h-7 w-7 text-destructive" />, title: 'Sell = Price Down', desc: 'Selling reduces supply and automatically lowers the price, reflecting real demand.', color: 'bg-destructive/10 border-destructive/20' },
              { icon: <Flame className="h-7 w-7 text-orange-400" />, title: 'Burns = Scarcity', desc: 'Token burns permanently remove supply, creating scarcity and potential value increase.', color: 'bg-orange-400/10 border-orange-400/20' },
              { icon: <Lock className="h-7 w-7 text-primary" />, title: 'Early = Most Gain', desc: 'First buyers get the lowest price. As more people buy, your tokens appreciate in value.', color: 'bg-primary/10 border-primary/20' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-5 sm:p-6 border ${item.color} text-center`}
              >
                <div className="mx-auto mb-3">{item.icon}</div>
                <h3 className="font-semibold text-sm sm:text-base mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-20 border-t border-border/50 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container relative z-10 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3">
              Why Choose <span className="gradient-text">{settings.site_name}</span>?
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-5 sm:p-6 group hover:border-primary/50 transition-all hover:-translate-y-1"
              >
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm sm:text-lg mb-1.5">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coin Creation CTA */}
      <section className="py-10 sm:py-20 border-t border-border/50">
        <div className="container px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-6 sm:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-warning/10 via-transparent to-warning/10" />
            <div className="relative z-10">
              <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-warning mx-auto mb-4 sm:mb-6" />
              <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3">
                Launch Your Own Token
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto mb-4 sm:mb-6">
                Create your token, pay the gas fee, and earn a percentage on every trade. Creators earn passive income!
              </p>
              <div className="inline-block p-4 sm:p-6 rounded-xl bg-warning/10 border border-warning/30 mb-4 sm:mb-6">
                <p className="text-xs text-muted-foreground mb-1">Gas Fee</p>
                <p className="text-2xl sm:text-4xl font-bold text-warning">
                  KES {(settings.coin_creation_fee || 5000).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" size="lg" onClick={() => navigate('/create-coin')} className="gap-2">
                  <Rocket className="h-5 w-5" /> Start Creating
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 sm:py-20 border-t border-border/50">
        <div className="container px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-8 sm:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3">{settings.cta_title}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto mb-6">{settings.cta_subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" size="lg" onClick={() => navigate('/auth')} className="gap-2">
                  <Rocket className="h-5 w-5" /> Get Started Now
                </Button>
                <Button variant="glass" size="lg" onClick={() => navigate('/launchpad')} className="gap-2">
                  <Coins className="h-5 w-5" /> Browse Tokens
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
