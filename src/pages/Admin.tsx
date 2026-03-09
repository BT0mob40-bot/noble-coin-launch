import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { Navigate } from 'react-router-dom';
import {
  Shield, Coins, Users, Settings, CreditCard, DollarSign, Layout, 
  ArrowDownToLine, Bot, Ban, Bell, Mail, MessageSquare, Phone,
  BarChart3, Plug, ChevronLeft, ChevronRight, ShieldCheck, Send, CalendarClock, Radio
} from 'lucide-react';
import { MpesaSettings } from '@/components/admin/MpesaSettings';
import { PlatformSettings } from '@/components/admin/PlatformSettings';
import { CoinManagement } from '@/components/admin/CoinManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { CommissionDashboard } from '@/components/admin/CommissionDashboard';
import { LandingPageSettings } from '@/components/admin/LandingPageSettings';
import { WithdrawalManagement } from '@/components/admin/WithdrawalManagement';
import { TelegramSettings } from '@/components/admin/TelegramSettings';
import { BlockedWordsManager } from '@/components/admin/BlockedWordsManager';
import { NotificationTemplates } from '@/components/admin/NotificationTemplates';
import { SendNotification } from '@/components/admin/SendNotification';
import { ScheduledNotifications } from '@/components/admin/ScheduledNotifications';
import { SmtpSettings } from '@/components/admin/SmtpSettings';
import { SmsSettings } from '@/components/admin/SmsSettings';
import { WhatsAppSettings } from '@/components/admin/WhatsAppSettings';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { NotificationLog } from '@/components/admin/NotificationLog';
import { VerificationSettings } from '@/components/admin/VerificationSettings';
import { LiveStreamManagement } from '@/components/admin/LiveStreamManagement';
import { SocialAuthSettings } from '@/components/admin/SocialAuthSettings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const sidebarSections: SidebarSection[] = [
  {
    label: 'Overview',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'commissions', label: 'Revenue', icon: DollarSign },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'coins', label: 'Coins', icon: Coins },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'live-streams', label: 'Live Streams', icon: Radio },
      { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
    ],
  },
  {
    label: 'Notifications',
    items: [
      { id: 'send-notification', label: 'Send', icon: Send },
      { id: 'scheduled', label: 'Scheduled', icon: CalendarClock },
      { id: 'templates', label: 'Templates', icon: Bell },
      { id: 'notification-log', label: 'Send Log', icon: Mail },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'mpesa', label: 'M-PESA', icon: CreditCard },
      { id: 'smtp', label: 'Email / SMTP', icon: Mail },
      { id: 'sms', label: 'SMS', icon: Phone },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
      { id: 'telegram', label: 'Telegram', icon: Bot },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'verification', label: 'Verification & 2FA', icon: ShieldCheck },
      { id: 'social-auth', label: 'Social Login', icon: Shield },
    ],
  },
  {
    label: 'Appearance',
    items: [
      { id: 'landing', label: 'Landing Page', icon: Layout },
      { id: 'blocked', label: 'Blocked Words', icon: Ban },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

export default function Admin() {
  const { user, isSuperAdmin } = useAuth();
  const [activeItem, setActiveItem] = useState('analytics');
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const renderContent = () => {
    switch (activeItem) {
      case 'analytics': return <AdminAnalytics />;
      case 'commissions': return <CommissionDashboard />;
      case 'coins': return <div className="space-y-4"><CoinManagement userId={user.id} isSuperAdmin={true} /><BlockedWordsManager /></div>;
      case 'users': return <UserManagement currentUserId={user.id} isSuperAdmin={true} />;
      case 'live-streams': return <LiveStreamManagement />;
      case 'withdrawals': return <WithdrawalManagement />;
      case 'send-notification': return <SendNotification />;
      case 'scheduled': return <ScheduledNotifications />;
      case 'templates': return <NotificationTemplates />;
      case 'notification-log': return <NotificationLog />;
      case 'mpesa': return <MpesaSettings />;
      case 'smtp': return <SmtpSettings />;
      case 'sms': return <SmsSettings />;
      case 'whatsapp': return <WhatsAppSettings />;
      case 'telegram': return <TelegramSettings />;
      case 'landing': return <LandingPageSettings />;
      case 'blocked': return <BlockedWordsManager />;
      case 'settings': return <PlatformSettings />;
      case 'verification': return <VerificationSettings />;
      case 'social-auth': return <SocialAuthSettings />;
      default: return <AdminAnalytics />;
    }
  };

  const currentItem = sidebarSections.flatMap(s => s.items).find(i => i.id === activeItem);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={cn(
          "fixed left-0 top-16 bottom-0 z-30 border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}>
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold">Super Admin</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <nav className="p-2 space-y-4">
              {sidebarSections.map((section) => (
                <div key={section.label}>
                  {!collapsed && (
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveItem(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                          activeItem === item.id
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1">{item.badge}</Badge>
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 min-h-[calc(100vh-4rem)]",
          collapsed ? "ml-16" : "ml-60"
        )}>
          <div className="p-4 sm:p-6 max-w-6xl">
            <motion.div
              key={activeItem}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                {currentItem && <currentItem.icon className="h-6 w-6 text-primary" />}
                <h1 className="text-xl sm:text-2xl font-bold font-display">{currentItem?.label || 'Admin'}</h1>
              </div>
              {renderContent()}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
