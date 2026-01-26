import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, RefreshCcw, AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
}

export default function ErrorPage({ error, resetError }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-warning/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center px-4"
      >
        <div className="flex justify-center mb-8">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-destructive to-warning flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold font-display mb-4">Something Went Wrong</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-4">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 max-w-md mx-auto">
            <p className="text-sm text-destructive font-mono">
              {error.message || 'An unknown error occurred'}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button variant="hero" size="lg" className="gap-2">
              <Home className="h-5 w-5" />
              Go Home
            </Button>
          </Link>
          {resetError ? (
            <Button variant="outline" size="lg" className="gap-2" onClick={resetError}>
              <RefreshCcw className="h-5 w-5" />
              Try Again
            </Button>
          ) : (
            <Button variant="outline" size="lg" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-5 w-5" />
              Reload Page
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
