import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Wallet, CheckCircle2, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WithdrawalRow {
  id: string;
  user_id: string;
  phone: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
  admin_note: string | null;
  created_at: string;
}

export function WithdrawalManagement() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_withdrawals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows((data || []) as WithdrawalRow[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const approveWithdrawal = async (row: WithdrawalRow) => {
    setActingId(row.id);
    try {
      const { error: approveError } = await supabase
        .from('wallet_withdrawals')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('status', 'pending');

      if (approveError) throw approveError;

      const { data, error } = await supabase.functions.invoke('mpesa-b2c-withdrawal', {
        body: { withdrawalId: row.id },
      });

      if (error || (data && data.error)) {
        throw new Error(data?.error || error?.message || 'B2C failed');
      }

      // Notify user via email (fire-and-forget)
      try {
        const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', row.user_id).maybeSingle();
        if (profile?.email) {
          supabase.functions.invoke('smtp-email', {
            body: { type: 'withdrawal_approved', email: profile.email, amount: row.net_amount, phone: row.phone, reference: data?.result?.ConversationID || row.id.slice(0, 8), status: 'Processing', origin: window.location.origin },
          }).catch(() => {});
        }
      } catch {}

      toast.success('Withdrawal approved and sent to M-PESA');
      await fetchRows();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve withdrawal');
      await supabase
        .from('wallet_withdrawals')
        .update({ status: 'failed', admin_note: error.message || 'B2C failed' })
        .eq('id', row.id);
      fetchRows();
    } finally {
      setActingId(null);
    }
  };

  const rejectWithdrawal = async (row: WithdrawalRow) => {
    setActingId(row.id);
    const note = rejectNotes[row.id]?.trim() || 'Rejected by admin';

    try {
      const { data: wallet, error: walletErr } = await supabase
        .from('wallets')
        .select('fiat_balance')
        .eq('user_id', row.user_id)
        .single();

      if (walletErr) throw walletErr;

      const { error: refundErr } = await supabase
        .from('wallets')
        .update({ fiat_balance: (wallet?.fiat_balance || 0) + row.amount })
        .eq('user_id', row.user_id);

      if (refundErr) throw refundErr;

      const { error: withdrawalErr } = await supabase
        .from('wallet_withdrawals')
        .update({ status: 'rejected', admin_note: note })
        .eq('id', row.id)
        .eq('status', 'pending');

      if (withdrawalErr) throw withdrawalErr;

      // Notify user via email (fire-and-forget)
      try {
        const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', row.user_id).maybeSingle();
        if (profile?.email) {
          supabase.functions.invoke('smtp-email', {
            body: { type: 'withdrawal_rejected', email: profile.email, amount: row.amount, reason: note, reference: row.id.slice(0, 8), status: 'Rejected', origin: window.location.origin },
          }).catch(() => {});
        }
      } catch {}

      toast.success('Withdrawal rejected and funds refunded');
      fetchRows();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject withdrawal');
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (status: WithdrawalRow['status']) => {
    if (status === 'completed') return <Badge className="bg-success/15 text-success border-success/30">Completed</Badge>;
    if (status === 'pending') return <Badge className="bg-warning/15 text-warning border-warning/30">Pending</Badge>;
    if (status === 'approved' || status === 'processing') return <Badge variant="outline">{status}</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30">{status}</Badge>;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdrawal Approvals
          </CardTitle>
          <CardDescription>Approve or reject fiat wallet withdrawals before B2C payout.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRows} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No withdrawals yet.</div>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{row.user_id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono">{row.phone}</TableCell>
                    <TableCell className="text-right font-mono">KES {Number(row.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">KES {Number(row.fee_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">KES {Number(row.net_amount).toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-right">
                      {row.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            className="gap-1"
                            disabled={actingId === row.id}
                            onClick={() => approveWithdrawal(row)}
                          >
                            {actingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            disabled={actingId === row.id}
                            onClick={() => rejectWithdrawal(row)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {rows.filter((r) => r.status === 'pending').length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {rows.filter((r) => r.status === 'pending').map((row) => (
                  <div key={`note-${row.id}`} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> Rejection note for {row.id.slice(0, 8)}...
                    </p>
                    <Textarea
                      rows={2}
                      placeholder="Optional reason shown to ops team"
                      value={rejectNotes[row.id] || ''}
                      onChange={(e) => setRejectNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
