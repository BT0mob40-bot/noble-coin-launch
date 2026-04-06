import { Link, useLocation } from 'react-router-dom';
import { Home, Rocket, LayoutDashboard, User, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home', auth: false },
  { path: '/launchpad', icon: Rocket, label: 'Launchpad', auth: false },
  { path: '/create-coin', icon: Plus, label: 'Create', auth: true },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Portfolio', auth: true },
  { path: '/profile', icon: User, label: 'Profile', auth: true },
];

const guestItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/launchpad', icon: Rocket, label: 'Launchpad' },
  { path: '/auth', icon: User, label: 'Sign In' },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  const items = user ? navItems : guestItems;

  // Hide on admin and coin detail pages
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/coin/')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.label === 'Create' ? (
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full -mt-4 shadow-lg",
                  "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              )}
              <span className={cn(
                "text-[10px] font-medium",
                item.label === 'Create' && "-mt-0.5"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
