import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X, Image as ImageIcon, Coins, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
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

export function CoinFormDialog({ open, onOpenChange, onSuccess, userId, isSuperAdmin = false }: CoinFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'payment' | 'processing'>('form');
  const [phone, setPhone] = useState('');
  const [gasFee, setGasFee] = useState(5000);
  const [pendingCoinId, setPendingCoinId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CoinFormData>({
    name: '',
    symbol: '',
    description: '',
    total_supply: 1000000000,
    logo_url: '',
    whitepaper_url: '',
    is_featured: false,
    is_trending: false,
  });

  // Fetch gas fee from settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('coin_creation_fee')
        .maybeSingle();
      if (data?.coin_creation_fee) {
        setGasFee(data.coin_creation_fee);
      }
    };
    fetchSettings();
  }, [open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `coins/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('coin-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('coin-logos')
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      setPreviewUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, logo_url: '' });
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateCoin = async () => {
    if (!formData.name || !formData.symbol) {
      toast.error('Name and symbol are required');
      return;
    }

    // Move to payment step
    setStep('payment');
  };

  const handlePayGasFee = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setCreating(true);
    setStep('processing');

    try {
      // First create the coin with pending status
      const { data: coinData, error: coinError } = await supabase.from('coins').insert({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description || null,
        total_supply: formData.total_supply,
        logo_url: formData.logo_url || null,
        whitepaper_url: formData.whitepaper_url || null,
        is_featured: isSuperAdmin ? formData.is_featured : false,
        is_trending: isSuperAdmin ? formData.is_trending : false,
        creator_id: userId,
        is_approved: false,
        approval_status: 'pending',
        creation_fee_paid: false,
        // Price is determined by bonding curve, not set by admin
        price: 0.001,
        initial_price: 0.001,
      }).select().single();

      if (coinError) throw coinError;

      setPendingCoinId(coinData.id);

      // Format phone number
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      // Initiate STK Push for gas fee
      const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: formattedPhone,
          amount: Math.round(gasFee),
          transactionId: coinData.id, // Use coin ID as reference
          accountReference: `GAS-${formData.symbol.toUpperCase()}`,
          type: 'coin_creation',
        },
      });

      if (stkError || !stkData?.success) {
        console.error('STK Push error:', stkError);
        toast.error(stkData?.error || 'Failed to initiate M-PESA payment');
        
        // Delete the pending coin if payment fails to initiate
        await supabase.from('coins').delete().eq('id', coinData.id);
        
        setStep('form');
        setCreating(false);
        return;
      }

      toast.success('Check your phone for M-PESA prompt!');
      
      // Poll for payment completion
      startPaymentPolling(coinData.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create coin');
      setStep('form');
      setCreating(false);
    }
  };

  const startPaymentPolling = (coinId: string) => {
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes

    const checkPayment = async () => {
      attempts++;
      
      const { data: coin } = await supabase
        .from('coins')
        .select('creation_fee_paid')
        .eq('id', coinId)
        .single();

      if (coin?.creation_fee_paid) {
        toast.success('Coin created successfully! Awaiting approval.');
        onOpenChange(false);
        resetForm();
        onSuccess();
        return;
      }

      if (attempts >= maxAttempts) {
        toast.error('Payment timeout. Please try again.');
        // Delete pending coin
        await supabase.from('coins').delete().eq('id', coinId);
        setStep('form');
        setCreating(false);
        return;
      }

      setTimeout(checkPayment, 3000);
    };

    setTimeout(checkPayment, 5000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      description: '',
      total_supply: 1000000000,
      logo_url: '',
      whitepaper_url: '',
      is_featured: false,
      is_trending: false,
    });
    setPreviewUrl(null);
    setPhone('');
    setStep('form');
    setCreating(false);
    setPendingCoinId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!creating) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Create New Coin
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && 'Add a new coin to the launchpad. A gas fee is required.'}
            {step === 'payment' && 'Pay the gas fee via M-PESA to create your coin.'}
            {step === 'processing' && 'Processing payment...'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'form' && (
          <>
            <div className="grid gap-4 py-4">
              {/* Gas Fee Notice */}
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                <div className="flex items-center gap-3">
                  <Coins className="h-6 w-6 text-warning" />
                  <div>
                    <p className="font-medium text-warning">Gas Fee Required</p>
                    <p className="text-sm text-muted-foreground">
                      Creating a coin requires a gas fee of <span className="font-bold text-warning">KES {gasFee.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Coin Logo</Label>
                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Coin logo preview" 
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Image
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coin Name *</Label>
                  <Input
                    placeholder="e.g. SafariCoin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Symbol *</Label>
                  <Input
                    placeholder="e.g. SFRI"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe your coin..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Total Supply</Label>
                <Input
                  type="number"
                  value={formData.total_supply}
                  onChange={(e) => setFormData({ ...formData, total_supply: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Initial price is determined by the bonding curve algorithm
                </p>
              </div>

              <div className="space-y-2">
                <Label>Whitepaper URL (optional)</Label>
                <Input
                  placeholder="https://..."
                  value={formData.whitepaper_url}
                  onChange={(e) => setFormData({ ...formData, whitepaper_url: e.target.value })}
                />
              </div>

              {/* Super Admin Only - Featured/Trending */}
              {isSuperAdmin && (
                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label>Featured</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_trending}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_trending: checked })}
                    />
                    <Label>Trending</Label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleCreateCoin} disabled={!formData.name || !formData.symbol}>
                Continue to Payment
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'payment' && (
          <div className="py-6 space-y-6">
            <div className="p-6 rounded-xl bg-warning/10 border border-warning/30 text-center">
              <Coins className="h-12 w-12 text-warning mx-auto mb-4" />
              <p className="text-2xl font-bold text-warning mb-2">KES {gasFee.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Gas fee for creating {formData.name} ({formData.symbol})</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                M-PESA Phone Number
              </Label>
              <Input
                type="tel"
                placeholder="254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-lg font-mono"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
              <Button variant="hero" onClick={handlePayGasFee} disabled={!phone || phone.length < 9}>
                Pay Gas Fee
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <SpiralLoader size="lg" />
            <p className="text-center text-muted-foreground mt-6">
              Check your phone for M-PESA prompt
            </p>
            <p className="text-sm text-primary mt-2 animate-pulse">
              Do not close this window
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}