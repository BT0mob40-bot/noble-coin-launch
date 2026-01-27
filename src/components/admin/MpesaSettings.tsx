import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, CreditCard, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface MpesaConfig {
  id: string;
  paybill_number: string;
  consumer_key: string | null;
  consumer_secret: string | null;
  passkey: string | null;
  callback_url: string | null;
  is_sandbox: boolean;
}

export function MpesaSettings() {
  const [config, setConfig] = useState<MpesaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  const [formData, setFormData] = useState({
    paybill_number: '',
    consumer_key: '',
    consumer_secret: '',
    passkey: '',
    callback_url: '',
    is_sandbox: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mpesa_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig(data);
        setFormData({
          paybill_number: data.paybill_number || '',
          consumer_key: data.consumer_key || '',
          consumer_secret: data.consumer_secret || '',
          passkey: data.passkey || '',
          callback_url: data.callback_url || '',
          is_sandbox: data.is_sandbox,
        });
      }
    } catch (error) {
      console.error('Error fetching M-PESA config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.paybill_number) {
      toast.error('Paybill/Shortcode is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        paybill_number: formData.paybill_number,
        consumer_key: formData.consumer_key || null,
        consumer_secret: formData.consumer_secret || null,
        passkey: formData.passkey || null,
        callback_url: formData.callback_url || null,
        is_sandbox: formData.is_sandbox,
      };

      if (config?.id) {
        const { error } = await supabase
          .from('mpesa_config')
          .update(payload)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mpesa_config')
          .insert(payload);

        if (error) throw error;
      }

      toast.success('M-PESA configuration saved!');
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success to-success/60">
            <CreditCard className="h-5 w-5 text-success-foreground" />
          </div>
          <div>
            <CardTitle>M-PESA Configuration</CardTitle>
            <CardDescription>Configure your Safaricom Daraja API credentials</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Environment Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div>
            <p className="font-medium">Environment</p>
            <p className="text-sm text-muted-foreground">
              {formData.is_sandbox ? 'Using Sandbox (Test Mode)' : 'Using Production (Live)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${formData.is_sandbox ? 'text-muted-foreground' : 'text-success font-medium'}`}>
              Production
            </span>
            <Switch
              checked={formData.is_sandbox}
              onCheckedChange={(checked) => setFormData({ ...formData, is_sandbox: checked })}
            />
            <span className={`text-sm ${formData.is_sandbox ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>
              Sandbox
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Paybill / Shortcode</Label>
            <Input
              placeholder="e.g. 174379"
              value={formData.paybill_number}
              onChange={(e) => setFormData({ ...formData, paybill_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Callback URL</Label>
            <Input
              placeholder="https://your-domain.com/api/mpesa/callback"
              value={formData.callback_url}
              onChange={(e) => setFormData({ ...formData, callback_url: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">API Credentials</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              className="gap-2"
            >
              {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSecrets ? 'Hide' : 'Show'}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Consumer Key</Label>
              <Input
                type={showSecrets ? 'text' : 'password'}
                placeholder="Enter Consumer Key"
                value={formData.consumer_key}
                onChange={(e) => setFormData({ ...formData, consumer_key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumer Secret</Label>
              <Input
                type={showSecrets ? 'text' : 'password'}
                placeholder="Enter Consumer Secret"
                value={formData.consumer_secret}
                onChange={(e) => setFormData({ ...formData, consumer_secret: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pass Key</Label>
            <Input
              type={showSecrets ? 'text' : 'password'}
              placeholder="Enter Pass Key"
              value={formData.passkey}
              onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
            />
          </div>
        </div>

        <Button 
          variant="hero" 
          onClick={handleSave} 
          disabled={saving}
          className="w-full gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
