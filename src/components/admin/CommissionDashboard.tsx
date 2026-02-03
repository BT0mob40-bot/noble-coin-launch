import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, TrendingUp, Percent, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CommissionStats {
  totalCommissions: number;
  todayCommissions: number;
  weekCommissions: number;
  monthCommissions: number;
  avgCommissionRate: number;
  transactionCount: number;
}

interface CommissionTransaction {
  id: string;
  amount: number;
  commission_rate: number;
  created_at: string;
  transaction_id: string | null;
}

export function CommissionDashboard() {
  const [stats, setStats] = useState<CommissionStats>({
    totalCommissions: 0,
    todayCommissions: 0,
    weekCommissions: 0,
    monthCommissions: 0,
    avgCommissionRate: 2.5,
    transactionCount: 0,
  });
  const [recentCommissions, setRecentCommissions] = useState<CommissionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      // Fetch commission transactions
      const { data: commissions } = await supabase
        .from('commission_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (commissions) {
        setRecentCommissions(commissions);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

        const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
        const todayCommissions = commissions
          .filter(c => new Date(c.created_at) >= today)
          .reduce((sum, c) => sum + c.amount, 0);
        const weekCommissions = commissions
          .filter(c => new Date(c.created_at) >= weekAgo)
          .reduce((sum, c) => sum + c.amount, 0);
        const monthCommissions = commissions
          .filter(c => new Date(c.created_at) >= monthAgo)
          .reduce((sum, c) => sum + c.amount, 0);
        const avgCommissionRate = commissions.length > 0
          ? commissions.reduce((sum, c) => sum + c.commission_rate, 0) / commissions.length
          : 2.5;

        setStats({
          totalCommissions,
          todayCommissions,
          weekCommissions,
          monthCommissions,
          avgCommissionRate,
          transactionCount: commissions.length,
        });
      }
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold gradient-text">
              KES {stats.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {stats.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              KES {stats.todayCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {stats.weekCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Avg Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgCommissionRate.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Commissions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Commission Earnings
          </CardTitle>
          <CardDescription>
            Commission collected from platform transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recentCommissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No commission transactions yet</p>
              <p className="text-sm">Commissions will appear here when users trade</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCommissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(commission.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {commission.transaction_id?.slice(0, 8) || '-'}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {commission.commission_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      +KES {commission.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
