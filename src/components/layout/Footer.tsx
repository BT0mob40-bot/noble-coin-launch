import { Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-12">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold font-display">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Rocket className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="gradient-text">CryptoLaunch</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The next-generation crypto launchpad platform. Buy and sell tokens with M-PESA.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/launchpad" className="hover:text-primary transition-colors">Launchpad</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Portfolio</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
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
            © 2026 CryptoLaunch. All rights reserved. Kenya.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Twitter
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Discord
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Telegram
            </a>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="mt-8 p-4 rounded-lg bg-warning/5 border border-warning/20">
          <p className="text-xs text-muted-foreground text-center">
            <strong className="text-warning">Risk Warning:</strong> Trading cryptocurrencies carries a high level of risk and may not be suitable for all investors. The value of tokens can be extremely volatile. You could lose some or all of your investment. We are NOT responsible for any "rug pulls" or malicious activities by token creators. Always do your own research.
          </p>
        </div>
      </div>
    </footer>
  );
}
