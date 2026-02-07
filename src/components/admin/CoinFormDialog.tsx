import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X, Image as ImageIcon, Coins, Phone, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiralLoader } from '@/components/ui/spiral-loader';

interface CoinFormData {
  name: string;
  symbol: string;
  description: string;
  total_supply: number;
  logo_url: string;
  whitepaper_url: string;
  is_featured: boolean;
  is_trending: boolean;
}

interface CoinFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
  isSuperAdmin?: boolean;
}

type PaymentStep = 'form' | 'payment' | 'processing' | 'success' | 'failed' | 'timeout';

export function CoinFormDialog({ open, onOpenChange, onSuccess, userId, isSuperAdmin = false }: CoinFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<PaymentStep>('form');
  const [phone, setPhone] = useState('');
  const [gasFee, setGasFee] = useState(5000);
  const [elapsed, setElapsed] = useState(0);

  const [formData, setFormData] = useState<CoinFormData>({
    name: '', symbol: '', description: '', total_supply: 1000000000,
    logo_url: '', whitepaper_url: '', is_featured: false, is_trending: false,
  });

  useEffect(() => {
    if (open) {
      const fetchSettings = async () => {
        const { data } = await supabase.from('site_settings').select('coin_creation_fee').maybeSingle();
        if (data?.coin_creation_fee) setGasFee(data.coin_creation_fee);
      };
      fetchSettings();
    }
  }, [open]);

  useEffect(() => {
    if (step !== 'processing') { setElapsed(0); return; }
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('coin-logos').upload(`coins/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('coin-logos').getPublicUrl(`coins/${fileName}`);
      setFormData({ ...formData, logo_url: publicUrl });
      setPreviewUrl(publicUrl);
      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, logo_url: '' });
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateCoin = () => {
    if (!formData.name || !formData.symbol) { toast.error('Name and symbol are required'); return; }
    // Super admin skips payment
    if (isSuperAdmin) {
      handleSuperAdminCreate();
    } else {
      setStep('payment');
    }
  };

  // Super admin creates coin directly without gas fee
  const handleSuperAdminCreate = async () => {
    setCreating(true);
    try {
      const { error: coinError } = await supabase.from('coins').insert({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description || null,
        total_supply: formData.total_supply,
        logo_url: formData.logo_url || null,
        whitepaper_url: formData.whitepaper_url || null,
        is_featured: formData.is_featured,
        is_trending: formData.is_trending,
        creator_id: userId,
        is_approved: true,
        approval_status: 'approved',
        creation_fee_paid: true,
        price: 0.001,
        initial_price: 0.001,
        is_active: true,
      });

      if (coinError) throw coinError;
      setStep('success');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create coin');
    } finally {
      setCreating(false);
    }
  };

  const handlePayGasFee = async () => {
    if (!phone || phone.length < 9) { toast.error('Enter a valid phone number'); return; }

    setCreating(true);
    setStep('processing');

    try {
      const { data: coinData, error: coinError } = await supabase.from('coins').insert({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description || null,
        total_supply: formData.total_supply,
        logo_url: formData.logo_url || null,
        whitepaper_url: formData.whitepaper_url || null,
        is_featured: false,
        is_trending: false,
        creator_id: userId,
        is_approved: false,
        approval_status: 'pending',
        creation_fee_paid: false,
        price: 0.001,
        initial_price: 0.001,
        is_active: false,
      }).select().single();

      if (coinError) throw coinError;

      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1);
      else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: formattedPhone,
          amount: Math.round(gasFee),
          transactionId: coinData.id,
          accountReference: `GAS-${formData.symbol.toUpperCase()}`,
          type: 'coin_creation',
        },
      });

      if (stkError) {
        console.error('STK error:', stkError);
        await supabase.from('coins').delete().eq('id', coinData.id);
        setStep('failed');
        setCreating(false);
        return;
      }

      if (stkData && !stkData.success) {
        console.error('STK failed:', stkData.error);
        await supabase.from('coins').delete().eq('id', coinData.id);
        setStep('failed');
        setCreating(false);
        return;
      }

      toast.success('Check your phone for M-PESA prompt!');
      startPaymentPolling(coinData.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create coin');
      setStep('failed');
      setCreating(false);
    }
  };

  const startPaymentPolling = (coinId: string) => {
    let attempts = 0;
    const maxAttempts = 40;

    const checkPayment = async () => {
      attempts++;
      const { data: coin } = await supabase.from('coins').select('creation_fee_paid').eq('id', coinId).single();

      if (coin?.creation_fee_paid) {
        setStep('success');
        setCreating(false);
        return;
      }

      if (attempts >= maxAttempts) {
        await supabase.from('coins').delete().eq('id', coinId);
        setStep('timeout');
        setCreating(false);
        return;
      }

      setTimeout(checkPayment, 3000);
    };

    setTimeout(checkPayment, 5000);
  };

  const handleClose = () => {
    if (step === 'success') onSuccess();
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({ name: '', symbol: '', description: '', total_supply: 1000000000, logo_url: '', whitepaper_url: '', is_featured: false, is_trending: false });
    setPreviewUrl(null);
    setPhone('');
    setStep('form');
    setCreating(false);
    setElapsed(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!creating) { if (!v) handleClose(); else onOpenChange(v); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Create New Coin
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && (isSuperAdmin ? 'Fill in coin details. No gas fee required.' : 'Fill in coin details. A gas fee is required.')}
            {step === 'payment' && 'Pay the gas fee via M-PESA.'}
            {step === 'processing' && 'Processing payment...'}
            {step === 'success' && (isSuperAdmin ? 'Coin created and activated!' : 'Coin created! Awaiting admin approval.')}
            {step === 'failed' && 'Payment failed or cancelled.'}
            {step === 'timeout' && 'Payment timed out.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid gap-4 py-4">
                {!isSuperAdmin && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-warning flex-shrink-0" />
                      <div>
                        <p className="font-medium text-warning text-sm">Gas Fee Required</p>
                        <p className="text-xs text-muted-foreground">
                          KES <span className="font-bold text-warning">{gasFee.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label className="text-sm">Logo</Label>
                  <div className="flex items-center gap-3">
                    {previewUrl ? (
                      <div className="relative">
                        <img src={previewUrl} alt="Logo" className="h-14 w-14 rounded-xl object-cover border" />
                        <button onClick={clearImage} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50" onClick={() => fileInputRef.current?.click()}>
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    )}
                    <div className="flex-1">
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Name *</Label>
                    <Input placeholder="SafariCoin" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Symbol *</Label>
                    <Input placeholder="SFRI" value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })} maxLength={10} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <Textarea placeholder="Describe your coin..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Total Supply</Label>
                  <Input type="number" value={formData.total_supply} onChange={(e) => setFormData({ ...formData, total_supply: parseInt(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground">{isSuperAdmin ? 'You can set the price directly' : 'Price is set by admin during approval'}</p>
                </div>

                {isSuperAdmin && (
                  <div className="flex flex-wrap gap-6 pt-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.is_featured} onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })} />
                      <Label className="text-sm">Featured</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.is_trending} onCheckedChange={(v) => setFormData({ ...formData, is_trending: v })} />
                      <Label className="text-sm">Trending</Label>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button variant="hero" onClick={handleCreateCoin} disabled={!formData.name || !formData.symbol || creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSuperAdmin ? 'Create Coin' : 'Continue to Payment'}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-center">
                  <Coins className="h-10 w-10 text-warning mx-auto mb-3" />
                  <p className="text-2xl font-bold text-warning mb-1">KES {gasFee.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Gas fee for {formData.name} ({formData.symbol})</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" /> M-PESA Phone</Label>
                  <Input type="tel" placeholder="254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 text-lg font-mono" />
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
                  <Button variant="hero" onClick={handlePayGasFee} disabled={!phone || phone.length < 9}>Pay Gas Fee</Button>
                </DialogFooter>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4">
              <SpiralLoader size="lg" />
              <p className="text-sm text-muted-foreground">Waiting for M-PESA confirmation...</p>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-primary">{formatTime(elapsed)}</span>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  <span className="text-success">STK Push sent</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <Clock className="h-3.5 w-3.5 text-warning" />
                  </motion.div>
                  <span className="text-warning">Awaiting PIN entry...</span>
                </div>
              </div>
              <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="text-xs text-primary">Do not close this window</motion.p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }} className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-bold text-success">Coin Created!</p>
                <p className="text-sm text-muted-foreground">{isSuperAdmin ? 'Coin is now live on the platform' : 'Awaiting Super Admin approval'}</p>
              </div>
              <Button variant="hero" onClick={handleClose}>Done</Button>
            </motion.div>
          )}

          {step === 'failed' && (
            <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-destructive">Payment Failed</p>
                <p className="text-sm text-muted-foreground">The transaction was cancelled or failed</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Close</Button>
                <Button variant="hero" onClick={() => setStep('payment')}>Try Again</Button>
              </div>
            </motion.div>
          )}

          {step === 'timeout' && (
            <motion.div key="timeout" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-warning">Request Timed Out</p>
                <p className="text-sm text-muted-foreground">Payment wasn't completed in time</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Close</Button>
                <Button variant="hero" onClick={() => setStep('payment')}>Try Again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
