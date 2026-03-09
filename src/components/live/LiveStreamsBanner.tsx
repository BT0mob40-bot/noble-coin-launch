import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Radio, Instagram, Youtube, Twitch, Music, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LiveStream {
  id: string;
  coin_id: string;
  title: string | null;
  instagram_username: string | null;
  youtube_username: string | null;
  tiktok_username: string | null;
  twitch_username: string | null;
  kick_username: string | null;
  created_at: string;
  expires_at: string;
  coins: {
    id: string;
    name: string;
    symbol: string;
    logo_url: string | null;
    price: number;
  } | null;
}

function getPlatformLink(platform: string, username: string): string {
  const clean = username.replace('@', '');
  switch (platform) {
    case 'instagram': return `https://instagram.com/${clean}/live`;
    case 'youtube': return `https://youtube.com/@${clean}/live`;
    case 'tiktok': return `https://tiktok.com/@${clean}/live`;
    case 'twitch': return `https://twitch.tv/${clean}`;
    case 'kick': return `https://kick.com/${clean}`;
    default: return '#';
  }
}

function PlatformBadge({ platform, username }: { platform: string; username: string }) {
  const icons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="h-3 w-3" />,
    youtube: <Youtube className="h-3 w-3" />,
    tiktok: <Music className="h-3 w-3" />,
    twitch: <Twitch className="h-3 w-3" />,
    kick: <span className="text-[10px] font-bold">K</span>,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={getPlatformLink(platform, username)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 hover:bg-muted text-[11px] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {icons[platform]}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Watch on {platform.charAt(0).toUpperCase() + platform.slice(1)}: @{username.replace('@', '')}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function LiveStreamsBanner() {
  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['live-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          id, coin_id, title, 
          instagram_username, youtube_username, tiktok_username, twitch_username, kick_username,
          created_at, expires_at,
          coins (id, name, symbol, logo_url, price)
        `)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as LiveStream[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading || !liveStreams?.length) return null;

  return (
    <div className="fixed top-14 sm:top-16 left-0 right-0 z-40 bg-gradient-to-r from-destructive/10 via-destructive/5 to-destructive/10 border-b border-destructive/20 backdrop-blur-sm">
      <div className="container px-4 sm:px-6">
        <div className="flex items-center gap-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center">
              <Radio className="h-4 w-4 text-destructive" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Live</span>
          </div>

          <div className="flex items-center gap-2">
            {liveStreams.map((stream) => (
              <Link
                key={stream.id}
                to={`/coin/${stream.coin_id}`}
                className="relative hover:scale-110 transition-transform"
              >
                <div className="relative">
                  {stream.coins?.logo_url ? (
                    <img src={stream.coins.logo_url} alt={stream.coins.name} className="h-8 w-8 rounded-full ring-2 ring-destructive/30" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold ring-2 ring-destructive/30">
                      {stream.coins?.symbol?.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-destructive rounded-full border-2 border-background animate-pulse flex items-center justify-center">
                    <span className="h-1 w-1 bg-white rounded-full" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}