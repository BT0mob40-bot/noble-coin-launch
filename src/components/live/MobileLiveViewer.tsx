import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { X, ExternalLink, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  coin_id: string;
  instagram_username?: string;
  youtube_username?: string;
  tiktok_username?: string;
  twitch_username?: string;
  kick_username?: string;
  coin?: {
    id: string;
    name: string;
    symbol: string;
    logo_url?: string;
    price: number;
    holders_count: number;
  };
  expires_at: string;
}

interface MobileLiveViewerProps {
  streams: LiveStream[];
  initialIndex?: number;
  onClose: () => void;
}

export function MobileLiveViewer({ streams, initialIndex = 0, onClose }: MobileLiveViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const currentStream = streams[currentIndex];

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Gesture handlers
  const bind = useDrag(
    ({ offset: [ox, oy], velocity: [vx, vy], direction: [dx, dy], cancel }) => {
      // Vertical swipe to close
      if (Math.abs(oy) > 100 && Math.abs(vy) > 0.5 && dy > 0) {
        onClose();
        cancel();
        return;
      }

      // Horizontal swipe to navigate
      if (Math.abs(ox) > 100 && Math.abs(vx) > 0.5) {
        if (dx > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else if (dx < 0 && currentIndex < streams.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
        cancel();
      }
    },
    {
      axis: undefined,
      threshold: 10,
      rubberband: true,
    }
  );

  const getPlatformUrl = (platform: string, username: string) => {
    const urls = {
      instagram: `https://instagram.com/${username}`,
      youtube: `https://youtube.com/@${username}`,
      tiktok: `https://tiktok.com/@${username}`,
      twitch: `https://twitch.tv/${username}`,
      kick: `https://kick.com/${username}`,
    };
    return urls[platform as keyof typeof urls];
  };

  const platforms = [
    { key: 'instagram_username', name: 'Instagram', color: 'from-pink-500 to-orange-400' },
    { key: 'youtube_username', name: 'YouTube', color: 'from-red-600 to-red-400' },
    { key: 'tiktok_username', name: 'TikTok', color: 'from-gray-900 to-gray-700' },
    { key: 'twitch_username', name: 'Twitch', color: 'from-purple-600 to-purple-400' },
    { key: 'kick_username', name: 'Kick', color: 'from-green-600 to-green-400' },
  ];

  if (!currentStream) return null;

  return (
    <motion.div
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-background ${isFullscreen ? '' : 'safe-area-insets'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div {...bind()} className="h-full w-full touch-none">
        {/* Header */}
        {!isFullscreen && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background/60 to-transparent p-4 safe-top">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-sm">
                  {currentIndex + 1} / {streams.length}
                </span>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-foreground hover:bg-muted">
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Exit fullscreen button */}
        {isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-10 text-foreground hover:bg-muted"
          >
            <Minimize className="h-5 w-5" />
          </Button>
        )}

        {/* Stream content */}
        <div className="h-full flex flex-col justify-center items-center p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStream.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full max-w-md space-y-6"
            >
              {/* Coin info */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {currentStream.coin?.logo_url && (
                    <img
                      src={currentStream.coin.logo_url}
                      alt={currentStream.coin.name}
                      className="w-16 h-16 rounded-full"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {currentStream.coin?.name}
                    </h1>
                    <p className="text-muted-foreground">
                      ${currentStream.coin?.symbol}
                    </p>
                  </div>
                </div>
                
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {currentStream.title || 'Live Stream'}
                </h2>
                
                {currentStream.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {currentStream.description}
                  </p>
                )}
              </div>

              {/* Platform buttons */}
              <div className="space-y-3">
                {platforms.map(({ key, name, color }) => {
                  const username = currentStream[key as keyof LiveStream] as string;
                  if (!username) return null;

                  return (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        asChild
                        className={`w-full h-14 bg-gradient-to-r ${color} hover:opacity-90 text-white border-0 shadow-lg`}
                      >
                        <a
                          href={getPlatformUrl(key.replace('_username', ''), username)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium">Watch on {name}</span>
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Navigation dots */}
              {streams.length > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  {streams.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentIndex ? 'bg-foreground' : 'bg-muted-foreground/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Gesture hints */}
        {!isFullscreen && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            <div className="text-muted-foreground text-xs space-y-1">
              <p>Swipe up to close</p>
              {streams.length > 1 && <p>Swipe left/right to navigate</p>}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}