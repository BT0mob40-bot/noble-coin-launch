import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2, Sparkles, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { generateCoinSVG, svgToDataUri } from '@/lib/coin-avatar-generator';
import { Progress } from '@/components/ui/progress';

const PREFIXES = [
  'Nova', 'Astro', 'Cyber', 'Nexus', 'Pulse', 'Zenith', 'Apex', 'Flux',
  'Helix', 'Orbit', 'Quantum', 'Prism', 'Aether', 'Titan', 'Blaze',
  'Storm', 'Volt', 'Vortex', 'Nebula', 'Cosmos', 'Radiant', 'Eclipse',
  'Crystal', 'Phoenix', 'Falcon', 'Lion', 'Tiger', 'Eagle', 'Wolf',
  'Panther', 'Cobra', 'Jaguar', 'Rhino', 'Hawk', 'Raptor', 'Onyx',
  'Sapphire', 'Ember', 'Frost', 'Shadow', 'Luna', 'Solar', 'Nyota',
  'Simba', 'Chui', 'Tembo', 'Kifaru', 'Twiga', 'Tai', 'Duma',
  'Zion', 'Atlas', 'Mara', 'Kali', 'Zara', 'Rune', 'Neon', 'Pixel',
];

const SUFFIXES = [
  'Coin', 'Token', 'Chain', 'Fi', 'X', 'Net', 'Pay', 'Swap',
  'Verse', 'DAO', 'Link', 'Shield', 'Mint', 'Vault', 'Core',
  'Hub', 'Spark', 'Wave', 'Flow', 'Edge', 'Node', 'Lab',
];

const DESCRIPTIONS = [
  'A revolutionary decentralized token designed for the African market, enabling borderless peer-to-peer transactions.',
  'Next-generation cryptocurrency with ultra-low fees and lightning-fast settlement for everyday payments.',
  'Community-driven digital asset powering decentralized finance across emerging markets in Africa.',
  'High-performance blockchain token featuring advanced bonding curve mechanics for price discovery.',
  'Innovative DeFi token bridging traditional finance and cryptocurrency with M-PESA integration.',
  'Cutting-edge tokenized asset enabling fractional ownership and democratized investment access.',
  'Privacy-focused digital currency with built-in smart contract capabilities for secure commerce.',
  'Yield-generating protocol token rewarding liquidity providers and long-term holders.',
  'Cross-border remittance token optimized for Africa\'s growing digital economy.',
  'Deflationary token with automatic burn mechanics, designed for sustained value appreciation.',
];

const SUPPLY_TIERS = [
  { label: '100M', value: 100_000_000 },
  { label: '500M', value: 500_000_000 },
  { label: '1B', value: 1_000_000_000 },
  { label: '2B', value: 2_000_000_000 },
  { label: '5B', value: 5_000_000_000 },
  { label: '10B', value: 10_000_000_000 },
];

// Track used names to ensure uniqueness in batch
const usedNames = new Set<string>();

function generateName(): { name: string; symbol: string } {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const name = `${prefix}${suffix}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      const sym = (prefix.substring(0, 2) + suffix.substring(0, 1)).toUpperCase();
      const extra = Math.random() > 0.5 ? suffix.charAt(suffix.length - 1).toUpperCase() : '';
      return { name, symbol: sym + extra };
    }
    attempts++;
  }
  // Fallback with timestamp
  const ts = Date.now().toString(36).toUpperCase();
  const name = `Token${ts}`;
  return { name, symbol: ts.substring(0, 4) };
}

interface AutoGenerateTokenProps {
  userId: string;
  onSuccess: () => void;
}

export function AutoGenerateToken({ userId, onSuccess }: AutoGenerateTokenProps) {
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [count, setCount] = useState('1');
  const [isTrending, setIsTrending] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [supplyTier, setSupplyTier] = useState('random');
  const [volatilityRange, setVolatilityRange] = useState<'low' | 'medium' | 'high'>('medium');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ name: string; symbol: string; svg: string }[] | null>(null);

  const volatilityRanges = {
    low: { min: 1, max: 5 },
    medium: { min: 3, max: 12 },
    high: { min: 8, max: 25 },
  };

  const generatePreview = () => {
    const countNum = Math.min(parseInt(count) || 1, 5);
    const previews = Array.from({ length: countNum }, () => {
      const { name, symbol } = generateName();
      const svg = generateCoinSVG(name, symbol);
      return { name, symbol, svg: svgToDataUri(svg) };
    });
    setPreview(previews);
  };

  const handleGenerate = async () => {
    const minNum = parseFloat(priceMin);
    const maxNum = parseFloat(priceMax) || minNum;
    const countNum = parseInt(count) || 1;
    if (!minNum || minNum <= 0) { toast.error('Enter a valid minimum price'); return; }
    if (maxNum < minNum) { toast.error('Max price must be ≥ min price'); return; }
    if (countNum < 1 || countNum > 50) { toast.error('Generate 1-50 tokens at a time'); return; }

    setGenerating(true);
    setProgress(0);
    usedNames.clear();
    let created = 0;

    try {
      // Prepare all coins data first (fast)
      const coinsToInsert: any[] = [];
      const avatarUploads: Promise<string | null>[] = [];

      for (let i = 0; i < countNum; i++) {
        const { name, symbol } = generateName();
        // Random price within admin-defined range — gives organic variety to the batch
        const priceNum = parseFloat((minNum + Math.random() * (maxNum - minNum)).toFixed(6));
        const totalSupply = supplyTier === 'random'
          ? SUPPLY_TIERS[Math.floor(Math.random() * SUPPLY_TIERS.length)].value
          : parseInt(supplyTier);
        const vRange = volatilityRanges[volatilityRange];
        const volatility = parseFloat((vRange.min + Math.random() * (vRange.max - vRange.min)).toFixed(1));
        const bondingFactor = parseFloat((0.000001 + Math.random() * 0.00005).toFixed(8));
        const description = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
        const twitterUrl = Math.random() > 0.5 ? `https://x.com/${name.toLowerCase()}` : null;
        const telegramUrl = Math.random() > 0.5 ? `https://t.me/${name.toLowerCase()}` : null;
        const websiteUrl = Math.random() > 0.3 ? `https://${name.toLowerCase()}.io` : null;
        const marketCapOverride = Math.random() > 0.4 ? Math.floor(50000 + Math.random() * 5000000) : null;
        const holdersOverride = Math.random() > 0.3 ? Math.floor(10 + Math.random() * 5000) : null;
        const liquidityOverride = Math.random() > 0.4 ? Math.floor(10000 + Math.random() * 500000) : null;

        // Generate SVG and upload in parallel
        const svg = generateCoinSVG(name, symbol);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const filename = `generated/${symbol.toLowerCase()}-${Date.now()}-${i}.svg`;

        avatarUploads.push(
          supabase.storage.from('coin-logos').upload(filename, blob, {
            contentType: 'image/svg+xml', upsert: true,
          }).then(({ error }) => {
            if (error) return null;
            return supabase.storage.from('coin-logos').getPublicUrl(filename).data.publicUrl;
          }).catch(() => null)
        );

        coinsToInsert.push({
          name, symbol, description, total_supply: totalSupply,
          initial_price: priceNum, price: priceNum,
          bonding_curve_factor: bondingFactor, volatility,
          creator_id: userId, is_approved: true, approval_status: 'approved',
          creation_fee_paid: true, is_active: true,
          is_trending: isTrending, is_featured: isFeatured,
          twitter_url: twitterUrl, telegram_url: telegramUrl, website_url: websiteUrl,
          market_cap_override: marketCapOverride,
          use_market_cap_override: marketCapOverride !== null,
          holders_override: holdersOverride,
          use_holders_override: holdersOverride !== null,
          liquidity_override: liquidityOverride,
          use_liquidity_override: liquidityOverride !== null,
        });
      }

      setProgress(30);

      // Upload all avatars in parallel
      const logoUrls = await Promise.all(avatarUploads);
      setProgress(60);

      // Assign logos
      coinsToInsert.forEach((coin, i) => {
        coin.logo_url = logoUrls[i];
      });

      // Batch insert all coins at once
      const BATCH_SIZE = 10;
      for (let b = 0; b < coinsToInsert.length; b += BATCH_SIZE) {
        const batch = coinsToInsert.slice(b, b + BATCH_SIZE);
        const { data, error } = await supabase.from('coins').insert(batch as any).select('id');
        if (!error && data) created += data.length;
        setProgress(60 + ((b + BATCH_SIZE) / coinsToInsert.length) * 40);
      }

      setProgress(100);

      if (created > 0) {
        toast.success(`🚀 Generated ${created} token${created > 1 ? 's' : ''} at KES ${priceNum}`);
        onSuccess();
        setPrice('');
        setPreview(null);
      } else {
        toast.error('Could not generate tokens (names may already exist)');
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Auto-Generate Tokens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Initial Price (KES)</Label>
            <Input type="number" placeholder="0.001" value={price} onChange={(e) => setPrice(e.target.value)} step="0.001" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">How Many (1-50)</Label>
            <Input type="number" placeholder="1" value={count} onChange={(e) => setCount(e.target.value)} min={1} max={50} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Total Supply</Label>
            <Select value={supplyTier} onValueChange={setSupplyTier}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                {SUPPLY_TIERS.map(t => (
                  <SelectItem key={t.value} value={String(t.value)}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Volatility</Label>
            <Select value={volatilityRange} onValueChange={(v) => setVolatilityRange(v as any)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (1-5%)</SelectItem>
                <SelectItem value="medium">Medium (3-12%)</SelectItem>
                <SelectItem value="high">High (8-25%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={isTrending} onCheckedChange={setIsTrending} />
            <Label className="text-xs">Trending 🔥</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label className="text-xs">Featured ⭐</Label>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={generatePreview}>
            <Eye className="h-3.5 w-3.5" /> Preview Avatars
          </Button>
          {preview && preview.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {preview.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <img src={p.svg} alt={p.name} className="h-8 w-8 rounded-lg" />
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.symbol}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {generating && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] text-muted-foreground text-center">{Math.round(progress)}% — Generating tokens...</p>
          </div>
        )}

        <Button onClick={handleGenerate} disabled={generating || !price} className="w-full gap-2" variant="hero">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generating ? 'Generating...' : `Generate ${parseInt(count) > 1 ? parseInt(count) + ' Tokens' : 'Token'}`}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Parallel generation: unique avatars, names, symbols, social links & market data. Up to 50 tokens at once.
        </p>
      </CardContent>
    </Card>
  );
}
