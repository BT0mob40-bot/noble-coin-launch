import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Check, Gift, TrendingUp, Wallet, Share2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReferralCardProps {
  userId: string;
}

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  creditedReferrals: number;
  totalEarnings: number;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: '',
    totalReferrals: 0,
    creditedReferrals: 0,
    totalEarnings: 0,
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveTick, setLiveTick] = useState(false);

  const fetchReferralData = useCallback(async () => {
    try {
      const [{ data: profile }, { data: refs }] = await Promise.all([
        supabase.from('profiles').select('referral_code').eq('user_id', userId).maybeSingle(),
        supabase.from('referrals').select('id, referred_id').eq('referrer_id', userId),
      ]);

      const referralIds = (refs || []).map(r => r.id);
      let totalEarnings = 0;
      let creditedReferrals = 0;

      if (referralIds.length > 0) {
        const { data: commissions } = await supabase
          .from('referral_commissions')
          .select('amount, referral_id')
          .in('referral_id', referralIds);
        totalEarnings = commissions?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
        const creditedSet = new Set((commissions || []).map(c => c.referral_id));
        creditedReferrals = creditedSet.size;
      }

      setStats({
        referralCode: profile?.referral_code || userId.slice(0, 8).toUpperCase(),
        totalReferrals: refs?.length || 0,
        creditedReferrals,
        totalEarnings,
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      setStats(prev => ({ ...prev, referralCode: userId.slice(0, 8).toUpperCase() }));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReferralData();

    // Real-time subscriptions
    const channel = supabase
      .channel(`referrals-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'referrals',
        filter: `referrer_id=eq.${userId}`,
      }, () => {
        setLiveTick(true);
        setTimeout(() => setLiveTick(false), 1500);
        fetchReferralData();
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'referral_commissions',
      }, () => {
        // refresh — commission inserts may belong to our referrals
        setLiveTick(true);
        setTimeout(() => setLiveTick(false), 1500);
        fetchReferralData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchReferralData]);

  const referralLink = stats.referralCode 
    ? `${window.location.origin}/auth?ref=${stats.referralCode}`
    : '';

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CryptoLaunch',
          text: `Sign up using my referral link and we both earn! You get 50% bonus on your first deposit.`,
          url: referralLink,
        });
      } catch {}
    } else {
      copyReferralLink();
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
        {/* Reward highlight */}
        <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-success/10 to-primary/10 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            <span className="font-semibold text-success text-sm sm:text-base">Earn 50% of Referral Deposits!</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            For every person you refer, earn 50% of their deposits as KES bonus directly to your fiat wallet. Withdraw anytime!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/30">
            <Users className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg sm:text-2xl font-bold font-mono">{stats.totalReferrals}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Referrals</p>
          </div>
          <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/30">
            <TrendingUp className="h-4 w-4 text-success mx-auto mb-1" />
            <p className="text-lg sm:text-2xl font-bold text-success font-mono">
              {stats.totalEarnings.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">KES Earned</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Share your link and start earning commission!
          </p>
          <div className="flex gap-1.5">
            <Input value={referralLink} readOnly className="text-[10px] sm:text-xs bg-muted/50 h-8 sm:h-9 font-mono" />
            <Button variant="outline" size="icon" onClick={copyReferralLink} disabled={!stats.referralCode} className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="hero" size="icon" onClick={shareReferral} className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Referral Code */}
        <div className="p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Your Referral Code</p>
          <p className="text-base sm:text-xl font-mono font-bold text-primary">{stats.referralCode || '...'}</p>
        </div>

        <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
          Earn 50% of every deposit your referrals make. Withdrawable to M-PESA anytime!
        </p>
      </CardContent>
    </Card>
  );
}