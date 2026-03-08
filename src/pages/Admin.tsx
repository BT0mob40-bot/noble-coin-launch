import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, Coins, Users, Settings, CreditCard, DollarSign, Layout, ArrowDownToLine, Bot, Ban
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
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { user, isSuperAdmin } = useAuth();

  if (!user) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display">Super Admin</h1>
              <p className="text-sm text-muted-foreground">Full platform management</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="coins" className="space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="coins" className="gap-1.5 text-xs sm:text-sm"><Coins className="h-3.5 w-3.5" />Coins</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="commissions" className="gap-1.5 text-xs sm:text-sm"><DollarSign className="h-3.5 w-3.5" />Revenue</TabsTrigger>
            <TabsTrigger value="mpesa" className="gap-1.5 text-xs sm:text-sm"><CreditCard className="h-3.5 w-3.5" />M-PESA</TabsTrigger>
            <TabsTrigger value="landing" className="gap-1.5 text-xs sm:text-sm"><Layout className="h-3.5 w-3.5" />Landing</TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-1.5 text-xs sm:text-sm"><ArrowDownToLine className="h-3.5 w-3.5" />Withdrawals</TabsTrigger>
            <TabsTrigger value="telegram" className="gap-1.5 text-xs sm:text-sm"><Bot className="h-3.5 w-3.5" />Telegram</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm"><Settings className="h-3.5 w-3.5" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="coins">
            <div className="space-y-4">
              <CoinManagement userId={user.id} isSuperAdmin={true} />
              <BlockedWordsManager />
            </div>
          </TabsContent>
          <TabsContent value="users"><UserManagement currentUserId={user.id} isSuperAdmin={true} /></TabsContent>
          <TabsContent value="commissions"><CommissionDashboard /></TabsContent>
          <TabsContent value="mpesa"><MpesaSettings /></TabsContent>
          <TabsContent value="landing"><LandingPageSettings /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalManagement /></TabsContent>
          <TabsContent value="telegram"><TelegramSettings /></TabsContent>
          <TabsContent value="settings"><PlatformSettings /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
