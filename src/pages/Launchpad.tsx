import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CoinList } from '@/components/coins/CoinList';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

export default function Launchpad() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold font-display">Launchpad</h1>
          </div>
          <p className="text-muted-foreground">
            Discover and trade the hottest crypto tokens with M-PESA
          </p>
        </motion.div>

        <CoinList />
      </main>

      <Footer />
    </div>
  );
}
