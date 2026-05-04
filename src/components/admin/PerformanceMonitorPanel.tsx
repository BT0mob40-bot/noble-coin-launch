import { useEffect, useMemo, useState } from 'react';
import { Activity, Gauge, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface PerfMetric {
  id: string;
  metric_type: 'page_load' | 'api_latency' | 'stk_latency';
  route: string | null;
  endpoint: string | null;
  duration_ms: number;
  status_code: number | null;
  success: boolean;
  created_at: string;
}

const avg = (rows: PerfMetric[]) => rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / rows.length) : 0;
const p95 = (rows: PerfMetric[]) => {
  if (!rows.length) return 0;
  const sorted = rows.map((row) => Number(row.duration_ms || 0)).sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]);
};

export function PerformanceMonitorPanel() {
  const [metrics, setMetrics] = useState<PerfMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('performance_metrics' as any)
      .select('id,metric_type,route,endpoint,duration_ms,status_code,success,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);
    setMetrics(((data || []) as unknown) as PerfMetric[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
    const channel = supabase.channel('admin-performance-metrics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'performance_metrics' }, (payload) => {
        setMetrics((prev) => [payload.new as PerfMetric, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const summary = useMemo(() => {
    const page = metrics.filter((m) => m.metric_type === 'page_load');
    const api = metrics.filter((m) => m.metric_type === 'api_latency');
    const stk = metrics.filter((m) => m.metric_type === 'stk_latency');
    const failures = metrics.filter((m) => !m.success).length;
    return { pageAvg: avg(page), apiP95: p95(api), stkAvg: avg(stk), failures };
  }, [metrics]);

  const slowest = useMemo(() => [...metrics].sort((a, b) => b.duration_ms - a.duration_ms).slice(0, 15), [metrics]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card"><CardContent className="p-4"><Gauge className="h-4 w-4 text-primary mb-2" /><p className="text-xs text-muted-foreground">Page Load Avg</p><p className="text-2xl font-bold font-mono">{summary.pageAvg}ms</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><Activity className="h-4 w-4 text-warning mb-2" /><p className="text-xs text-muted-foreground">API p95</p><p className="text-2xl font-bold font-mono">{summary.apiP95}ms</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><Zap className="h-4 w-4 text-success mb-2" /><p className="text-xs text-muted-foreground">STK Avg</p><p className="text-2xl font-bold font-mono">{summary.stkAvg}ms</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><Activity className="h-4 w-4 text-destructive mb-2" /><p className="text-xs text-muted-foreground">Failed Calls</p><p className="text-2xl font-bold font-mono">{summary.failures}</p></CardContent></Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Performance Monitor</CardTitle>
            <CardDescription>Live page-load, API, and STK latency from the last 24 hours.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Route / Endpoint</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Latency</TableHead></TableRow></TableHeader>
            <TableBody>
              {slowest.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleTimeString()}</TableCell>
                  <TableCell><Badge variant="outline">{row.metric_type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="max-w-md truncate font-mono text-xs">{row.endpoint || row.route || '-'}</TableCell>
                  <TableCell>{row.success ? <Badge className="bg-success/15 text-success border-success/30">OK</Badge> : <Badge className="bg-destructive/15 text-destructive border-destructive/30">Fail {row.status_code || ''}</Badge>}</TableCell>
                  <TableCell className="text-right font-mono">{Number(row.duration_ms).toLocaleString()}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
