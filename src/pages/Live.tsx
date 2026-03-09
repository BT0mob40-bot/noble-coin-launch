import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLiveViewer } from '@/components/live/MobileLiveViewer';
import { 
  Instagram, 
  Youtube, 
  Music, 
  Twitch, 
  ExternalLink,
  Users,
  TrendingUp,
  Smartphone
} from 'lucide-react';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  coin: {
    id: string;
    name: string;
    symbol: string;
    logo_url: string;
    price: number;
    holders_count: number;
  };
  instagram_username?: string;
  youtube_username?: string;
  tiktok_username?: string;
  twitch_username?: string;
  kick_username?: string;
  expires_at: string;
}

const getPlatformLink = (platform: string, username: string) => {
  const links = {
    instagram: `https://instagram.com/${username}/live`,
    youtube: `https://youtube.com/@${username}/live`,
    tiktok: `https://tiktok.com/@${username}`,
    twitch: `https://twitch.tv/${username}`,
    kick: `https://kick.com/${username}`
  };
  return links[platform as keyof typeof links] || '#';
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons = {
    instagram: Instagram,
    youtube: Youtube,
    tiktok: Music,
    twitch: Twitch,
    kick: ExternalLink
  };
  const Icon = icons[platform as keyof typeof icons] || ExternalLink;
  return <Icon className="h-4 w-4" />;
};

export default function Live() {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileViewer, setShowMobileViewer] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchLiveStreams();
  }, []);

  const fetchLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          coin:coins(
            id,
            name,
            symbol,
            logo_url,
            price,
            holders_count
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching live streams:', error);
        return;
      }

      setLiveStreams(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading live streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-display gradient-text mb-2">
            Live Now 🔴
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Watch coin creators stream live on their favorite platforms. Connect, engage, and follow their journey in real-time.
          </p>
          {liveStreams.length > 0 && isMobile && (
            <Button onClick={() => setShowMobileViewer(true)} variant="hero" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Watch Immersive
            </Button>
          )}
        </div>

        {liveStreams.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Music className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Live Streams</h3>
            <p className="text-muted-foreground mb-6">
              No creators are currently streaming. Check back later!
            </p>
            <Button onClick={() => navigate('/launchpad')} variant="hero">
              Explore Coins
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveStreams.map((stream) => (
              <Card key={stream.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={stream.coin.logo_url || '/placeholder.svg'}
                        alt={stream.coin.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {stream.coin.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        ${stream.coin.symbol}
                      </p>
                    </div>
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  </div>
                  
                  {stream.title && (
                    <h4 className="font-medium text-foreground mt-2">
                      {stream.title}
                    </h4>
                  )}
                  
                  {stream.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {stream.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium">${stream.coin.price.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{stream.coin.holders_count}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Watch Live On:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stream.instagram_username && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(getPlatformLink('instagram', stream.instagram_username!), '_blank')}
                        >
                          <PlatformIcon platform="instagram" />
                          Instagram
                        </Button>
                      )}
                      {stream.youtube_username && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(getPlatformLink('youtube', stream.youtube_username!), '_blank')}
                        >
                          <PlatformIcon platform="youtube" />
                          YouTube
                        </Button>
                      )}
                      {stream.tiktok_username && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(getPlatformLink('tiktok', stream.tiktok_username!), '_blank')}
                        >
                          <PlatformIcon platform="tiktok" />
                          TikTok
                        </Button>
                      )}
                      {stream.twitch_username && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(getPlatformLink('twitch', stream.twitch_username!), '_blank')}
                        >
                          <PlatformIcon platform="twitch" />
                          Twitch
                        </Button>
                      )}
                      {stream.kick_username && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(getPlatformLink('kick', stream.kick_username!), '_blank')}
                        >
                          <PlatformIcon platform="kick" />
                          Kick
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/coin/${stream.coin.id}`)}
                    >
                      View Coin Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Mobile Viewer */}
        {showMobileViewer && (
          <MobileLiveViewer
            streams={liveStreams}
            onClose={() => setShowMobileViewer(false)}
          />
        )}
      </div>
    </div>
  );
}