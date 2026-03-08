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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Send, Loader2, Mail, Phone, MessageSquare, Users, User,
  Search, CheckCircle, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
}

interface Template {
  id: string;
  name: string;
  slug: string;
  subject: string;
  email_body: string;
  sms_body: string;
  whatsapp_body: string;
  variables: string[];
  is_email_enabled: boolean;
  is_sms_enabled: boolean;
  is_whatsapp_enabled: boolean;
}

export function SendNotification() {
  const [mode, setMode] = useState<'specific' | 'bulk'>('specific');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  // Message fields
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [whatsappBody, setWhatsappBody] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('user_id, email, full_name, phone').order('created_at', { ascending: false }),
      supabase.from('notification_templates').select('*').order('name'),
    ]).then(([usersRes, templatesRes]) => {
      if (usersRes.data) setUsers(usersRes.data as any);
      if (templatesRes.data) setTemplates(templatesRes.data as any);
      setLoading(false);
    });
  }, []);

  const handleTemplateChange = (slug: string) => {
    setSelectedTemplate(slug);
    if (slug === 'custom') {
      setSubject('');
      setEmailBody('');
      setSmsBody('');
      setWhatsappBody('');
      return;
    }
    const t = templates.find(t => t.slug === slug);
    if (t) {
      setSubject(t.subject);
      setEmailBody(t.email_body);
      setSmsBody(t.sms_body);
      setWhatsappBody(t.whatsapp_body);
      setChannels({
        email: t.is_email_enabled,
        sms: t.is_sms_enabled,
        whatsapp: t.is_whatsapp_enabled,
      });
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.user_id));
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  const recipientCount = mode === 'bulk' ? users.length : selectedUsers.length;
  const activeChannels = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);

  const handleSend = async () => {
    if (activeChannels.length === 0) {
      toast.error('Select at least one channel');
      return;
    }
    if (mode === 'specific' && selectedUsers.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    if (channels.email && !subject.trim()) {
      toast.error('Email subject is required');
      return;
    }
    if (channels.email && !emailBody.trim()) {
      toast.error('Email body is required');
      return;
    }
    if (channels.sms && !smsBody.trim()) {
      toast.error('SMS body is required');
      return;
    }
    if (channels.whatsapp && !whatsappBody.trim()) {
      toast.error('WhatsApp body is required');
      return;
    }

    setSending(true);
    try {
      const targetUsers = mode === 'bulk' ? users : users.filter(u => selectedUsers.includes(u.user_id));
      
      const { data, error } = await supabase.functions.invoke('send-custom-notification', {
        body: {
          recipients: targetUsers.map(u => ({
            user_id: u.user_id,
            email: u.email,
            phone: u.phone,
            name: u.full_name,
          })),
          channels: activeChannels,
          subject,
          email_body: emailBody,
          sms_body: smsBody,
          whatsapp_body: whatsappBody,
          template_slug: selectedTemplate !== 'custom' ? selectedTemplate : null,
        },
      });

      if (error) throw error;
      toast.success(`Notification queued for ${targetUsers.length} recipient(s)`);
      
      // Reset
      if (mode === 'specific') setSelectedUsers([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex gap-3">
        <Button
          variant={mode === 'specific' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('specific')}
          className="gap-2"
        >
          <User className="h-4 w-4" /> Specific Users
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('bulk')}
          className="gap-2"
        >
          <Users className="h-4 w-4" /> All Users ({users.length})
        </Button>
      </div>

      {/* Recipient Selection for Specific Mode */}
      {mode === 'specific' && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Recipients</Label>
              <Dialog open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    Select Users ({selectedUsers.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Select Recipients</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{filteredUsers.length} users</span>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                        {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="space-y-1">
                        {filteredUsers.map(u => (
                          <button
                            key={u.user_id}
                            onClick={() => toggleUser(u.user_id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                              selectedUsers.includes(u.user_id)
                                ? 'bg-primary/10 border border-primary/30'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox checked={selectedUsers.includes(u.user_id)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.full_name || 'Unnamed'}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                            </div>
                            {u.phone && (
                              <span className="text-[10px] text-muted-foreground">{u.phone}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button className="w-full" size="sm" onClick={() => setUserPickerOpen(false)}>
                      Done ({selectedUsers.length} selected)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.slice(0, 10).map(id => {
                  const u = users.find(u => u.user_id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => toggleUser(id)}>
                      {u?.full_name || u?.email || 'User'} ✕
                    </Badge>
                  );
                })}
                {selectedUsers.length > 10 && (
                  <Badge variant="outline" className="text-[10px]">+{selectedUsers.length - 10} more</Badge>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No recipients selected. Click "Select Users" above.</p>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'bulk' && (
        <Card className="glass-card border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">Bulk Notification</p>
              <p className="text-xs text-muted-foreground">This will send to all {users.length} registered users.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template & Channels */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Template (optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Custom message" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Message</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Channels</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch checked={channels.email} onCheckedChange={v => setChannels(c => ({ ...c, email: v }))} />
                  <Mail className="h-3.5 w-3.5" /><span className="text-xs">Email</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch checked={channels.sms} onCheckedChange={v => setChannels(c => ({ ...c, sms: v }))} />
                  <Phone className="h-3.5 w-3.5" /><span className="text-xs">SMS</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch checked={channels.whatsapp} onCheckedChange={v => setChannels(c => ({ ...c, whatsapp: v }))} />
                  <MessageSquare className="h-3.5 w-3.5" /><span className="text-xs">WA</span>
                </label>
              </div>
            </div>
          </div>

          {channels.email && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Notification subject..." className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Body</Label>
                <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} placeholder="Email body (HTML supported)..." className="text-xs font-mono" />
              </div>
            </div>
          )}

          {channels.sms && (
            <div className="space-y-1.5">
              <Label className="text-xs">SMS Message</Label>
              <Textarea value={smsBody} onChange={e => setSmsBody(e.target.value)} rows={3} placeholder="SMS text..." className="text-xs" />
              <p className="text-[10px] text-muted-foreground">{smsBody.length}/160 characters</p>
            </div>
          )}

          {channels.whatsapp && (
            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp Message</Label>
              <Textarea value={whatsappBody} onChange={e => setWhatsappBody(e.target.value)} rows={3} placeholder="WhatsApp message..." className="text-xs" />
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Available placeholders you can use in messages:</p>
            <div className="flex flex-wrap gap-1">
              {['{{user_name}}', '{{email}}', '{{phone}}', '{{site_name}}'].map(v => (
                <Badge key={v} variant="secondary" className="text-[9px] font-mono cursor-pointer hover:bg-primary/20"
                  onClick={() => navigator.clipboard.writeText(v)}>
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Sending via <span className="font-medium">{activeChannels.join(', ') || 'no channels'}</span> to{' '}
          <span className="font-medium">{recipientCount} recipient(s)</span>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || recipientCount === 0 || activeChannels.length === 0}
          className="gap-2"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Sending...' : `Send Notification`}
        </Button>
      </div>
    </div>
  );
}
