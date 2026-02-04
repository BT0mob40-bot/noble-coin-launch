import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Check, Gift, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralCardProps {
  userId: string;
}

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  totalTrades: number;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: '',
    totalReferrals: 0,
    totalEarnings: 0,
    totalTrades: 0,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate a simple referral code from user ID
    const code = userId.slice(0, 8).toUpperCase();
    setStats({
      referralCode: code,
      totalReferrals: 0,
      totalEarnings: 0,
      totalTrades: 0,
    });
  }, [userId]);

  const copyReferralLink = () => {
    if (!stats.referralCode) return;
    
    const link = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const referralLink = stats.referralCode 
    ? `${window.location.origin}/auth?ref=${stats.referralCode}`
    : '';

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Referrals</p>
          </div>
          <div className="text-center">
            <TrendingUp className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
            <p className="text-xs text-muted-foreground">Trades</p>
          </div>
          <div className="text-center">
            <Gift className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold text-success">
              {stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">KES Earned</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Share your referral link and earn commission on every trade!
          </p>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="text-xs bg-muted/50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyReferralLink}
              disabled={!stats.referralCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Referral Code */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
          <p className="text-xl font-mono font-bold text-primary">
            {stats.referralCode || 'Loading...'}
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Earn commission when your referrals make trades. The more they trade, the more you earn!
        </p>
      </CardContent>
    </Card>
  );
}
