import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Rocket, Shield, Zap, TrendingUp, ArrowRight, Coins, Users, Flame, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SimulatedChart } from '@/components/landing/SimulatedChart';
import { SimulatedOrderBook } from '@/components/landing/SimulatedOrderBook';

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
  coin_creation_fee: 500000,
};

const featureIcons = [
  <Rocket className="h-6 w-6" />,
  <Shield className="h-6 w-6" />,
  <Zap className="h-6 w-6" />,
  <TrendingUp className="h-6 w-6" />,
];

export default function Landing() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
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

  // Split hero title to highlight "M-PESA" 
  const renderHeroTitle = () => {
    const title = settings.hero_title;
    if (title.includes('M-PESA')) {
      const parts = title.split('M-PESA');
      return (
        <>
          {parts[0]}
          <span className="gradient-text">M-PESA</span>
          {parts[1]}
        </>
      );
    }
    // Highlight last two words if no M-PESA
    const words = title.split(' ');
    if (words.length > 2) {
      const lastTwo = words.slice(-2).join(' ');
      const rest = words.slice(0, -2).join(' ');
      return (
        <>
          {rest}{' '}
          <span className="gradient-text">{lastTwo}</span>
        </>
      );
    }
    return <span className="gradient-text">{title}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container relative z-10">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Flame className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">{settings.hero_badge}</span>
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold font-display mb-6 leading-tight">
              {renderHeroTitle()}
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {settings.hero_subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate('/launchpad')} className="gap-2 group">
                <Rocket className="h-5 w-5 group-hover:animate-bounce" />
                Explore Launchpad
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/auth')} className="gap-2">
                <Users className="h-5 w-5" />
                Create Account
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="glass-card p-6 text-center group hover:border-primary/50 transition-all duration-300"
              >
                <p className="text-3xl sm:text-4xl font-bold gradient-text group-hover:scale-110 transition-transform">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Live Trading Preview */}
      <section className="py-20 border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Live <span className="gradient-text">Market Preview</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Watch real-time simulated trading activity. Our bonding curve technology ensures fair pricing.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Chart 1 - Uptrend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-white">SL</span>
                  </div>
                  <div>
                    <p className="font-semibold">SafariLion</p>
                    <p className="text-xs text-success">+12.5%</p>
                  </div>
                </div>
                <Button size="sm" variant="hero" onClick={() => navigate('/launchpad')}>
                  Buy
                </Button>
              </div>
              <SimulatedChart basePrice={0.05} trend="up" className="h-40" />
            </motion.div>

            {/* Chart 2 - Order Book */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-4"
            >
              <SimulatedOrderBook basePrice={0.0234} />
            </motion.div>

            {/* Chart 3 - Volatile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-warning to-orange-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">NM</span>
                  </div>
                  <div>
                    <p className="font-semibold">NairobiMeme</p>
                    <p className="text-xs text-warning">High Volatility</p>
                  </div>
                </div>
                <Button size="sm" variant="hero" onClick={() => navigate('/launchpad')}>
                  Buy
                </Button>
              </div>
              <SimulatedChart basePrice={0.001} trend="volatile" className="h-40" />
            </motion.div>
          </div>

          <div className="text-center mt-8">
            <Button variant="glass" size="lg" onClick={() => navigate('/launchpad')} className="gap-2">
              View All Tokens
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border/50 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Why Choose <span className="gradient-text">{settings.site_name}</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for the African market with local payment integration and world-class security.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 group hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              How <span className="gradient-text">Bonding Curve</span> Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our Solana-inspired bonding curve automatically adjusts token prices based on supply and demand.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6 text-center"
            >
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Buy = Price Increases</h3>
              <p className="text-sm text-muted-foreground">
                When you buy tokens, the circulating supply increases, automatically raising the price for everyone.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6 text-center"
            >
              <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <Coins className="h-8 w-8 text-warning" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Instant Liquidity</h3>
              <p className="text-sm text-muted-foreground">
                No need for traditional liquidity pools. The bonding curve ensures you can always buy or sell.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6 text-center"
            >
              <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Token Burns = Scarcity</h3>
              <p className="text-sm text-muted-foreground">
                Token burns reduce supply, creating scarcity and potentially increasing value for holders.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Coin Creation Fee Section */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-8 sm:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-warning/10 via-transparent to-warning/10" />
            <div className="relative z-10">
              <Coins className="h-12 w-12 text-warning mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
                Launch Your Own Token
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                Create your token on our platform. The creation fee helps ensure quality projects and prevents spam.
              </p>
              <div className="inline-block p-6 rounded-xl bg-warning/10 border border-warning/30 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Coin Creation Fee</p>
                <p className="text-4xl font-bold text-warning">
                  KES {(settings.coin_creation_fee || 500000).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" onClick={() => navigate('/auth')} className="gap-2">
                  <Rocket className="h-5 w-5" />
                  Start Creating
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-10 sm:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <Users className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
                {settings.cta_title}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                {settings.cta_subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" onClick={() => navigate('/auth')} className="gap-2">
                  <Rocket className="h-5 w-5" />
                  Get Started Now
                </Button>
                <Button variant="glass" size="xl" onClick={() => navigate('/launchpad')} className="gap-2">
                  <Coins className="h-5 w-5" />
                  Browse Tokens
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
