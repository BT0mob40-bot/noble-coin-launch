import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpiralLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function SpiralLoader({ size = 'md', text, className }: SpiralLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {/* Outer spinning ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary/50 border-b-primary/25 border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Middle spinning ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-t-accent border-r-accent/50 border-b-accent/25 border-l-transparent"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner spinning ring */}
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-t-success border-r-success/50 border-b-success/25 border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Center pulsing dot */}
        <motion.div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary',
            dotSizes[size]
          )}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Orbiting dots */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn('absolute rounded-full bg-primary/70', dotSizes[size])}
            style={{ top: '50%', left: '50%' }}
            animate={{
              x: [0, Math.cos((i * Math.PI) / 2) * 20, 0],
              y: [0, Math.sin((i * Math.PI) / 2) * 20, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.25,
            }}
          />
        ))}
      </div>
      
      {text && (
        <motion.p
          className="text-sm text-muted-foreground text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
