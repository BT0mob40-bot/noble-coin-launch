import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Coins, DollarSign, TrendingUp, ArrowDownToLine, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Stats {
  totalCoins: number;
  activeCoins: number;
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  pendingWithdrawals: number;
  totalCommissions: number;
  totalDeposits: number;
}

export function AdminAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [coinsRes, activeCoinsRes, usersRes, txRes, withdrawRes, commRes] = await Promise.all([
        supabase.from('coins').select('id', { count: 'exact', head: true }),
        supabase.from('coins').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_approved', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('total_value').eq('status', 'completed'),
        supabase.from('wallet_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('commission_transactions').select('amount'),
      ]);

      const txData = txRes.data || [];
      const totalVolume = txData.reduce((sum, t) => sum + (Number(t.total_value) || 0), 0);
      const commData = commRes.data || [];
      const totalComm = commData.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      setStats({
        totalCoins: coinsRes.count || 0,
        activeCoins: activeCoinsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalTransactions: txData.length,
        totalVolume,
        pendingWithdrawals: withdrawRes.count || 0,
        totalCommissions: totalComm,
        totalDeposits: totalVolume,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Coins', value: `${stats.activeCoins} / ${stats.totalCoins}`, icon: Coins, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Total Volume', value: `KES ${(stats.totalVolume / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Transactions', value: stats.totalTransactions.toLocaleString(), icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Commissions', value: `KES ${stats.totalCommissions.toFixed(0)}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals.toString(), icon: ArrowDownToLine, color: stats.pendingWithdrawals > 0 ? 'text-warning' : 'text-muted-foreground', bg: stats.pendingWithdrawals > 0 ? 'bg-warning/10' : 'bg-muted/50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
