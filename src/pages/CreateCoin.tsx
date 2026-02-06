import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { CoinFormDialog } from '@/components/admin/CoinFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Coins, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserCoin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  approval_status: string | null;
  creation_fee_paid: boolean;
  is_approved: boolean;
  logo_url: string | null;
  contract_address: string | null;
}

export default function CreateCoin() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [myCoins, setMyCoins] = useState<UserCoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchMyCoins();
  }, [user]);

  const fetchMyCoins = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('coins')
        .select('id, name, symbol, price, approval_status, creation_fee_paid, is_approved, logo_url, contract_address')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      setMyCoins(data || []);
    } catch (err) {
      console.error('Error fetching coins:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-assign coin_creator role when creating a coin
  const handleCreateSuccess = async () => {
    if (user) {
      // Check if already has coin_creator role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'coin_creator')
        .maybeSingle();

      if (!existingRole) {
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'coin_creator' });
      }
    }
    fetchMyCoins();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display mb-1">Create Coin</h1>
              <p className="text-muted-foreground text-sm">Launch your own token on the platform</p>
            </div>
            <Button variant="hero" className="gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Coin</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </motion.div>

        {/* My Coins */}
        <div>
          <h2 className="text-lg font-semibold mb-4">My Coins</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : myCoins.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No coins yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">Create your first coin and start your crypto journey</p>
                <Button variant="hero" onClick={() => setShowDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Coin
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myCoins.map((coin) => (
                <Link key={coin.id} to={coin.is_approved ? `/coin/${coin.id}` : '#'}>
                  <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                          {coin.logo_url ? (
                            <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                          ) : (
                            <Coins className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{coin.name}</h4>
                          <p className="text-xs text-muted-foreground">{coin.symbol}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          !coin.creation_fee_paid
                            ? 'bg-destructive/10 text-destructive'
                            : coin.approval_status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : coin.is_approved
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {!coin.creation_fee_paid ? 'Unpaid' : coin.approval_status === 'pending' ? 'Pending' : coin.is_approved ? 'Active' : 'Rejected'}
                        </div>
                      </div>
                      {coin.contract_address && (
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {coin.contract_address}
                        </p>
                      )}
                      {coin.is_approved && (
                        <p className="text-sm font-mono mt-2">KES {coin.price.toFixed(6)}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <CoinFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={handleCreateSuccess}
        userId={user.id}
        isSuperAdmin={false}
      />
    </div>
  );
}
