import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Rocket, Users, Globe, Shield, TrendingUp, Zap, Heart, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

  const values = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Security First',
      description: 'We prioritize the security of your assets and personal information above all else.',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Community Driven',
      description: 'Our platform is built by the community, for the community. Your voice matters.',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'African Focus',
      description: 'Designed specifically for the African market with M-PESA integration.',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Innovation',
      description: 'Leveraging cutting-edge bonding curve technology for fair and transparent pricing.',
    },
  ];

  const team = [
    { name: 'CEO & Founder', role: 'Vision & Strategy' },
    { name: 'CTO', role: 'Technology & Security' },
    { name: 'Head of Compliance', role: 'Regulatory Affairs' },
    { name: 'Community Manager', role: 'User Experience' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent">
              <Rocket className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            About <span className="gradient-text">CryptoLaunch</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Africa's first crypto launchpad with M-PESA integration. We're making cryptocurrency accessible to everyone.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 sm:p-12 mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold font-display">Our Mission</h2>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We believe that cryptocurrency should be accessible to everyone, regardless of their technical expertise or access to traditional banking. By integrating M-PESA—Africa's most widely used mobile money platform—we've created a bridge between the emerging world of digital assets and the millions of people who use mobile money every day.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mt-4">
            Our bonding curve technology ensures fair, transparent pricing where the market truly determines value. When you buy, the price goes up. When you sell, the price adjusts. No hidden fees, no manipulation—just pure market dynamics.
          </p>
        </motion.section>

        {/* Values */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold font-display text-center mb-8">Our Values</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="glass-card p-6 text-center group hover:border-primary/50 transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  {value.icon}
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 sm:p-12 mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold font-display">How Bonding Curves Work</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-success mb-3">When You Buy</h3>
              <p className="text-muted-foreground">
                When you purchase tokens, the circulating supply increases, which automatically raises the price according to our bonding curve formula. This means early buyers benefit from lower prices, while the price discovery happens organically through market demand.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-destructive mb-3">When You Sell</h3>
              <p className="text-muted-foreground">
                When you sell tokens, the circulating supply decreases, which adjusts the price downward. This ensures there's always liquidity for sellers without relying on external market makers or liquidity pools.
              </p>
            </div>
          </div>
          <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Formula:</strong> Price = Initial Price × (1 + Bonding Factor × Circulating Supply)
            </p>
          </div>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold font-display text-center mb-8">Leadership Team</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, index) => (
              <div key={member.name} className="glass-card p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-8 sm:p-12 text-center"
        >
          <Heart className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold font-display mb-4">Join Our Community</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Be part of the cryptocurrency revolution in Africa. Whether you're a trader, developer, or token creator, there's a place for you in our community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={() => navigate('/auth?tab=signup')}>
              Create Account
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/launchpad')}>
              Explore Tokens
            </Button>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
}
