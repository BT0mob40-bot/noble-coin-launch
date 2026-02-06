import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CoinContractInfoProps {
  contractAddress: string;
  coinName: string;
  coinSymbol: string;
  coinId: string;
}

export function CoinContractInfo({ contractAddress, coinName, coinSymbol, coinId }: CoinContractInfoProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      toast.success('Contract address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareUrl = `${window.location.origin}/coin/${coinId}`;

  const handleShare = async () => {
    const shareData = {
      title: `${coinName} (${coinSymbol})`,
      text: `Check out ${coinName} on our crypto launchpad! Contract: ${contractAddress}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        toast.success('Share link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied!');
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Contract Address</p>
        <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 h-7 text-xs">
          <Share2 className="h-3 w-3" />
          Share
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={contractAddress}
          readOnly
          className="font-mono text-xs bg-muted/30 border-border/50 h-9"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
