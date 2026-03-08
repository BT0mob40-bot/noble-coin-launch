import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Clock, Loader2, Save, Trash2, Plus, Play, Pause, CalendarClock,
  Mail, Phone, MessageSquare, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledNotification {
  id: string;
  name: string;
  frequency: string;
  target: string;
  channels: string[];
  template_slug: string | null;
  subject: string;
  email_body: string;
  sms_body: string;
  whatsapp_body: string;
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
}

const emptySchedule = {
  name: '',
  frequency: 'once',
  target: 'all',
  channels: ['email'],
  template_slug: null as string | null,
  subject: '',
  email_body: '',
  sms_body: '',
  whatsapp_body: '',
  next_run_at: '',
};

export function ScheduledNotifications() {
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptySchedule });
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [schedulesRes, templatesRes] = await Promise.all([
      supabase.from('scheduled_notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('notification_templates').select('name, slug'),
    ]);
    if (schedulesRes.data) setSchedules(schedulesRes.data as any);
    if (templatesRes.data) setTemplates(templatesRes.data as any);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.next_run_at) { toast.error('Schedule time is required'); return; }
    if (form.channels.length === 0) { toast.error('Select at least one channel'); return; }

    setSaving(true);
    const { error } = await supabase.from('scheduled_notifications').insert({
      name: form.name,
      frequency: form.frequency,
      target: form.target,
      channels: form.channels,
      template_slug: form.template_slug,
      subject: form.subject,
      email_body: form.email_body,
      sms_body: form.sms_body,
      whatsapp_body: form.whatsapp_body,
      next_run_at: new Date(form.next_run_at).toISOString(),
    } as any);

    if (error) toast.error('Failed to create: ' + error.message);
    else {
      toast.success('Scheduled notification created!');
      setDialogOpen(false);
      setForm({ ...emptySchedule });
      fetchAll();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('scheduled_notifications').update({ is_active: !currentActive } as any).eq('id', id);
    fetchAll();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('scheduled_notifications').delete().eq('id', id);
    toast.success('Deleted');
    fetchAll();
  };

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  };

  const handleTemplateChange = (slug: string) => {
    setForm(f => ({ ...f, template_slug: slug === 'custom' ? null : slug }));
    if (slug !== 'custom') {
      const t = templates.find(t => t.slug === slug);
      if (t) setForm(f => ({ ...f, name: f.name || t.name }));
    }
  };

  const frequencyLabel = (f: string) => {
    const map: Record<string, string> = { once: 'One-time', hourly: 'Hourly', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
    return map[f] || f;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Scheduled notifications run automatically via a cron job every 5 minutes.
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" /> Create Scheduled Notification
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Weekly digest..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Run At</Label>
                  <Input type="datetime-local" value={form.next_run_at} onChange={e => setForm(f => ({ ...f, next_run_at: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Target</Label>
                  <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Channels</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch checked={form.channels.includes('email')} onCheckedChange={() => toggleChannel('email')} />
                    <Mail className="h-3.5 w-3.5" /><span className="text-xs">Email</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch checked={form.channels.includes('sms')} onCheckedChange={() => toggleChannel('sms')} />
                    <Phone className="h-3.5 w-3.5" /><span className="text-xs">SMS</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch checked={form.channels.includes('whatsapp')} onCheckedChange={() => toggleChannel('whatsapp')} />
                    <MessageSquare className="h-3.5 w-3.5" /><span className="text-xs">WhatsApp</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Template (optional)</Label>
                <Select value={form.template_slug || 'custom'} onValueChange={handleTemplateChange}>
                  <SelectTrigger><SelectValue placeholder="Custom message" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Message</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.channels.includes('email') && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Subject</Label>
                    <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Body</Label>
                    <Textarea value={form.email_body} onChange={e => setForm(f => ({ ...f, email_body: e.target.value }))} rows={4} className="text-xs font-mono" placeholder="HTML email body..." />
                  </div>
                </>
              )}
              {form.channels.includes('sms') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">SMS Body</Label>
                  <Textarea value={form.sms_body} onChange={e => setForm(f => ({ ...f, sms_body: e.target.value }))} rows={3} className="text-xs" />
                </div>
              )}
              {form.channels.includes('whatsapp') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp Body</Label>
                  <Textarea value={form.whatsapp_body} onChange={e => setForm(f => ({ ...f, whatsapp_body: e.target.value }))} rows={3} className="text-xs" />
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Placeholders: <code className="text-primary">{'{{user_name}}'}</code>, <code className="text-primary">{'{{email}}'}</code>, <code className="text-primary">{'{{phone}}'}</code>, <code className="text-primary">{'{{site_name}}'}</code></p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No scheduled notifications yet. Create one to automate messaging.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <Card key={s.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{s.name}</h3>
                      <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {s.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{frequencyLabel(s.frequency)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next: {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : 'N/A'}
                      </span>
                      {s.last_run_at && (
                        <span>Last: {new Date(s.last_run_at).toLocaleString()}</span>
                      )}
                      <span>Runs: {s.run_count}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      {s.channels.map(ch => (
                        <Badge key={ch} variant="secondary" className="text-[9px] capitalize">{ch}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(s.id, s.is_active)}
                      title={s.is_active ? 'Pause' : 'Resume'}>
                      {s.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSchedule(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
