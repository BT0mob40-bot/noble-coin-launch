import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  TrendingUp, 
  FileText, 
  ExternalLink, 
  Copy,
  Check,
  Globe,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CoinInfoProps {
  coin: {
    id: string;
    name: string;
    symbol: string;
    description: string | null;
    logo_url: string | null;
    whitepaper_url: string | null;
    is_trending: boolean;
    is_featured: boolean;
  };
}

export function CoinInfo({ coin }: CoinInfoProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(coin.id);
    setCopied(true);
    toast.success('Contract address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {coin.logo_url ? (
            <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold gradient-text">{coin.symbol[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-display">{coin.name}</h1>
            <span className="text-lg text-muted-foreground">({coin.symbol})</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {coin.is_featured && (
              <Badge className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Star className="h-3 w-3" /> Featured
              </Badge>
            )}
            {coin.is_trending && (
              <Badge className="gap-1 bg-success/10 text-success border-success/20">
                <TrendingUp className="h-3 w-3" /> Trending
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Contract Address */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
        <span className="text-xs text-muted-foreground flex-shrink-0">Contract:</span>
        <code className="text-xs font-mono truncate flex-1">{coin.id}</code>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Description */}
      {coin.description && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {coin.description}
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-2 flex-wrap">
        {coin.whitepaper_url && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href={coin.whitepaper_url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4" />
              Whitepaper
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Globe className="h-4 w-4" />
          Website
        </Button>
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Twitter className="h-4 w-4" />
          Twitter
        </Button>
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <MessageCircle className="h-4 w-4" />
          Telegram
        </Button>
      </div>
    </div>
  );
}
