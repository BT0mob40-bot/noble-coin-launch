import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Save, Loader2, Mail, Phone, MessageSquare, Edit2, X, Check, Variable } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  subject: string;
  email_body: string;
  sms_body: string;
  whatsapp_body: string;
  is_email_enabled: boolean;
  is_sms_enabled: boolean;
  is_whatsapp_enabled: boolean;
  variables: string[];
}

export function NotificationTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('notification_templates').select('*').order('category');
    if (!error && data) setTemplates(data as any);
    setLoading(false);
  };

  const handleEdit = (t: Template) => { setEditingId(t.id); setEditData({ ...t }); };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from('notification_templates').update({
      subject: editData.subject,
      email_body: editData.email_body,
      sms_body: editData.sms_body,
      whatsapp_body: editData.whatsapp_body,
      is_email_enabled: editData.is_email_enabled,
      is_sms_enabled: editData.is_sms_enabled,
      is_whatsapp_enabled: editData.is_whatsapp_enabled,
    } as any).eq('id', editData.id);
    if (error) toast.error('Failed to save');
    else { toast.success('Template saved!'); fetchTemplates(); setEditingId(null); }
    setSaving(false);
  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  const filtered = activeCategory === 'all' ? templates : templates.filter(t => t.category === activeCategory);

  const categoryColors: Record<string, string> = {
    auth: 'bg-primary/10 text-primary',
    financial: 'bg-success/10 text-success',
    trading: 'bg-warning/10 text-warning',
    admin: 'bg-destructive/10 text-destructive',
    general: 'bg-muted text-muted-foreground',
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory(cat)} className="capitalize text-xs">
            {cat}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(t => (
          <Card key={t.id} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 ${categoryColors[t.category] || ''}`}>{t.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 font-mono">{t.slug}</p>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <Mail className={`h-3 w-3 ${t.is_email_enabled ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      <span className="text-[10px]">Email</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className={`h-3 w-3 ${t.is_sms_enabled ? 'text-success' : 'text-muted-foreground/30'}`} />
                      <span className="text-[10px]">SMS</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className={`h-3 w-3 ${t.is_whatsapp_enabled ? 'text-success' : 'text-muted-foreground/30'}`} />
                      <span className="text-[10px]">WhatsApp</span>
                    </div>
                  </div>
                  {t.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.variables.map(v => (
                        <Badge key={v} variant="secondary" className="text-[9px] font-mono px-1">{`{{${v}}}`}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Dialog open={editingId === t.id} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(t)} className="gap-1 text-xs">
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Edit: {editData?.name}</DialogTitle>
                    </DialogHeader>
                    {editData && (
                      <div className="space-y-4">
                        <div className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <Switch checked={editData.is_email_enabled} onCheckedChange={v => setEditData({...editData, is_email_enabled: v})} />
                            <Label className="text-xs">Email</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={editData.is_sms_enabled} onCheckedChange={v => setEditData({...editData, is_sms_enabled: v})} />
                            <Label className="text-xs">SMS</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={editData.is_whatsapp_enabled} onCheckedChange={v => setEditData({...editData, is_whatsapp_enabled: v})} />
                            <Label className="text-xs">WhatsApp</Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Email Subject</Label>
                          <Input value={editData.subject} onChange={e => setEditData({...editData, subject: e.target.value})} />
                        </div>

                        <Tabs defaultValue="email" className="space-y-3">
                          <TabsList>
                            <TabsTrigger value="email" className="gap-1 text-xs"><Mail className="h-3 w-3" /> Email Body</TabsTrigger>
                            <TabsTrigger value="sms" className="gap-1 text-xs"><Phone className="h-3 w-3" /> SMS</TabsTrigger>
                            <TabsTrigger value="whatsapp" className="gap-1 text-xs"><MessageSquare className="h-3 w-3" /> WhatsApp</TabsTrigger>
                          </TabsList>
                          <TabsContent value="email">
                            <Textarea value={editData.email_body} onChange={e => setEditData({...editData, email_body: e.target.value})} rows={8} className="font-mono text-xs" placeholder="HTML email body..." />
                          </TabsContent>
                          <TabsContent value="sms">
                            <Textarea value={editData.sms_body} onChange={e => setEditData({...editData, sms_body: e.target.value})} rows={4} className="text-xs" placeholder="SMS message (160 chars recommended)..." />
                            <p className="text-[10px] text-muted-foreground mt-1">{editData.sms_body.length}/160 characters</p>
                          </TabsContent>
                          <TabsContent value="whatsapp">
                            <Textarea value={editData.whatsapp_body} onChange={e => setEditData({...editData, whatsapp_body: e.target.value})} rows={4} className="text-xs" placeholder="WhatsApp message..." />
                          </TabsContent>
                        </Tabs>

                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-[10px] font-semibold mb-1.5 flex items-center gap-1"><Variable className="h-3 w-3" /> Available Variables</p>
                          <div className="flex flex-wrap gap-1">
                            {editData.variables.map(v => (
                              <Badge key={v} variant="secondary" className="text-[10px] font-mono cursor-pointer hover:bg-primary/20" onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}>
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">Click to copy variable</p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
