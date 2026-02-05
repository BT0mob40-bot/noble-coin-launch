import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useSiteSettings } from '@/lib/site-settings-context';
import { Rocket, User, LogOut, LayoutDashboard, Shield, Wallet, Menu, X } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold font-display">
          {settings.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt={settings.site_name} 
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
          )}
          <span className="gradient-text hidden xs:inline">{settings.site_name}</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/launchpad" className="text-muted-foreground hover:text-foreground transition-colors">
            Launchpad
          </Link>
          {user && (
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Portfolio
            </Link>
          )}
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Desktop User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" size="sm" className="gap-2 hidden md:flex">
                    <User className="h-4 w-4" />
                    <span className="max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <Wallet className="mr-2 h-4 w-4" />
                    My Wallet
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                  <div className="flex flex-col gap-4 mt-6">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <SheetClose asChild>
                        <Link to="/launchpad" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                          <Rocket className="h-5 w-5 text-muted-foreground" />
                          Launchpad
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to="/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                          <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                          Dashboard
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to="/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                          <Wallet className="h-5 w-5 text-muted-foreground" />
                          My Wallet
                        </Link>
                      </SheetClose>
                      {isAdmin && (
                        <SheetClose asChild>
                          <Link to="/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            Admin Panel
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Link to="/about" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                          <User className="h-5 w-5 text-muted-foreground" />
                          About
                        </Link>
                      </SheetClose>
                    </div>

                    <div className="border-t border-border pt-4">
                      <SheetClose asChild>
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive w-full"
                        >
                          <LogOut className="h-5 w-5" />
                          Sign Out
                        </button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              {/* Mobile Menu for non-logged in */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <div className="flex flex-col gap-4 mt-6">
                    <SheetClose asChild>
                      <Link to="/launchpad" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                        <Rocket className="h-5 w-5 text-muted-foreground" />
                        Launchpad
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/about" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                        <User className="h-5 w-5 text-muted-foreground" />
                        About
                      </Link>
                    </SheetClose>
                    <div className="border-t border-border pt-4 flex flex-col gap-2">
                      <SheetClose asChild>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/auth')}>
                          Sign In
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button variant="hero" className="w-full" onClick={() => navigate('/auth?tab=signup')}>
                          Get Started
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop Buttons */}
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="hidden md:inline-flex">
                Sign In
              </Button>
              <Button variant="hero" size="sm" onClick={() => navigate('/auth?tab=signup')} className="hidden md:inline-flex">
                Get Started
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}