import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const ANIMAL_NAMES = ['Phoenix', 'Dragon', 'Falcon', 'Lion', 'Tiger', 'Eagle', 'Wolf', 'Bear', 'Hawk', 'Panther', 'Cobra', 'Viper', 'Jaguar', 'Rhino', 'Shark'];
const SUFFIXES = ['Coin', 'Token', 'Chain', 'Fi', 'X', 'Net', 'Pay', 'Swap', 'Verse', 'DAO'];
const DESCRIPTIONS = [
  'A revolutionary decentralized token designed for the African market.',
  'Next-generation cryptocurrency enabling seamless peer-to-peer transactions.',
  'Community-driven digital asset powering decentralized finance across Africa.',
  'High-performance blockchain token with ultra-low transaction fees.',
  'Innovative DeFi token bridging traditional finance and cryptocurrency.',
];

function generateName(): { name: string; symbol: string } {
  const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const name = `${animal}${suffix}`;
  const symbol = (animal.substring(0, 2) + suffix.substring(0, 1)).toUpperCase() + 'C';
  return { name, symbol };
}

interface AutoGenerateTokenProps {
  userId: string;
  onSuccess: () => void;
}

export function AutoGenerateToken({ userId, onSuccess }: AutoGenerateTokenProps) {
  const [price, setPrice] = useState('');
  const [count, setCount] = useState('1');
  const [isTrending, setIsTrending] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const priceNum = parseFloat(price);
    const countNum = parseInt(count) || 1;
    if (!priceNum || priceNum <= 0) { toast.error('Enter a valid price'); return; }
    if (countNum < 1 || countNum > 20) { toast.error('Generate 1-20 tokens at a time'); return; }

    setGenerating(true);
    let created = 0;

    try {
      for (let i = 0; i < countNum; i++) {
        const { name, symbol } = generateName();
        const totalSupply = [500000000, 1000000000, 2000000000, 5000000000][Math.floor(Math.random() * 4)];
        const bondingFactor = parseFloat((0.000001 + Math.random() * 0.00005).toFixed(8));
        const volatility = parseFloat((2 + Math.random() * 15).toFixed(1));
        const description = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];

        // Check uniqueness
        const { data: existing } = await supabase
          .from('coins')
          .select('id')
          .or(`name.ilike.${name},symbol.ilike.${symbol}`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error } = await supabase.from('coins').insert({
          name,
          symbol,
          description,
          total_supply: totalSupply,
          initial_price: priceNum,
          price: priceNum,
          bonding_curve_factor: bondingFactor,
          volatility,
          creator_id: userId,
          is_approved: true,
          approval_status: 'approved',
          creation_fee_paid: true,
          is_active: true,
          is_trending: isTrending,
          is_featured: isFeatured,
        } as any);

        if (!error) created++;
      }

      if (created > 0) {
        toast.success(`Generated ${created} token${created > 1 ? 's' : ''} at KES ${priceNum}`);
        onSuccess();
        setPrice('');
      } else {
        toast.error('Could not generate tokens (names may already exist)');
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
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
            <Input
              type="number"
              placeholder="0.001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.001"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">How Many</Label>
            <Input
              type="number"
              placeholder="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              min={1}
              max={20}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={isTrending} onCheckedChange={setIsTrending} />
            <Label className="text-xs">Trending</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label className="text-xs">Featured</Label>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating || !price}
          className="w-full gap-2"
          variant="hero"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generating ? 'Generating...' : `Generate Token${parseInt(count) > 1 ? 's' : ''}`}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Auto-generates name, symbol, supply, bonding curve & description. Only price is needed.
        </p>
      </CardContent>
    </Card>
  );
}
