import { Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '@/lib/site-settings-context';

export function Footer() {
  const { settings } = useSiteSettings();

  const socialLinks = [
    { label: 'Twitter', url: (settings as any).twitter_url },
    { label: 'Discord', url: (settings as any).discord_url },
    { label: 'Telegram', url: (settings as any).telegram_url },
    { label: 'Instagram', url: (settings as any).instagram_url },
    { label: 'Facebook', url: (settings as any).facebook_url },
  ].filter(s => s.url);

  return (
    <footer className="border-t border-border/50 bg-card/30 py-12">
      <div className="container px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold font-display">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.site_name} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Rocket className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="gradient-text">{settings.site_name}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {settings.site_description || 'The next-generation crypto launchpad platform.'}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/launchpad" className="hover:text-primary transition-colors">Launchpad</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Portfolio</Link></li>
              <li><Link to="/blockchain" className="hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/create-coin" className="hover:text-primary transition-colors">Create Token</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {settings.site_name}. All rights reserved.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 rounded-lg bg-warning/5 border border-warning/20">
          <p className="text-xs text-muted-foreground text-center">
            <strong className="text-warning">Risk Warning:</strong> Trading cryptocurrencies carries a high level of risk and may not be suitable for all investors. The value of tokens can be extremely volatile. You could lose some or all of your investment.
          </p>
        </div>
      </div>
    </footer>
  );
}
