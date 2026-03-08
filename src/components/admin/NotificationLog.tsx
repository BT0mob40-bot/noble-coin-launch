import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Phone, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

interface LogEntry {
  id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  template_slug: string | null;
  created_at: string;
}

export function NotificationLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('notification_log').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setLogs(data as any); setLoading(false); });
  }, []);

  const channelIcon = (ch: string) => {
    if (ch === 'email') return <Mail className="h-3 w-3" />;
    if (ch === 'sms') return <Phone className="h-3 w-3" />;
    if (ch === 'whatsapp') return <MessageSquare className="h-3 w-3" />;
    return null;
  };

  const statusIcon = (s: string) => {
    if (s === 'sent') return <CheckCircle className="h-3 w-3 text-success" />;
    if (s === 'failed') return <XCircle className="h-3 w-3 text-destructive" />;
    return <Clock className="h-3 w-3 text-warning" />;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (logs.length === 0) return (
    <Card className="glass-card">
      <CardContent className="p-8 text-center text-muted-foreground text-sm">
        No notifications sent yet. Configure your channels and templates first.
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <Card key={log.id} className="glass-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {channelIcon(log.channel)}
              {statusIcon(log.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium truncate">{log.recipient}</span>
                {log.template_slug && <Badge variant="secondary" className="text-[9px] font-mono">{log.template_slug}</Badge>}
              </div>
              {log.subject && <p className="text-[10px] text-muted-foreground truncate">{log.subject}</p>}
              {log.error_message && <p className="text-[10px] text-destructive truncate">{log.error_message}</p>}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {new Date(log.created_at).toLocaleDateString()}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
