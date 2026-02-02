import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SiteLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 w-32 h-32 rounded-full border-4 border-transparent border-t-primary border-r-accent"
            />
            
            {/* Inner ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 w-28 h-28 rounded-full border-4 border-transparent border-b-primary border-l-success"
            />
            
            {/* Center Logo */}
            <div className="w-32 h-32 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative"
              >
                {/* Trading candles animation */}
                <div className="flex items-end gap-1 h-12">
                  <motion.div
                    animate={{ height: ['30%', '100%', '60%', '30%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                    className="w-2 bg-success rounded-sm"
                    style={{ height: '30%' }}
                  />
                  <motion.div
                    animate={{ height: ['70%', '40%', '100%', '70%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.1 }}
                    className="w-2 bg-destructive rounded-sm"
                    style={{ height: '70%' }}
                  />
                  <motion.div
                    animate={{ height: ['50%', '80%', '30%', '50%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                    className="w-2 bg-success rounded-sm"
                    style={{ height: '50%' }}
                  />
                  <motion.div
                    animate={{ height: ['40%', '60%', '90%', '40%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                    className="w-2 bg-success rounded-sm"
                    style={{ height: '40%' }}
                  />
                  <motion.div
                    animate={{ height: ['80%', '30%', '60%', '80%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                    className="w-2 bg-destructive rounded-sm"
                    style={{ height: '80%' }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Brand Name */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-2xl font-bold font-display gradient-text"
          >
            CryptoLaunch
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-sm text-muted-foreground"
          >
            Your Gateway to Digital Assets
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 w-48 h-1 bg-muted rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>

          {/* Loading text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading markets
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ...
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
