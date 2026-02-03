import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Coins, 
  Users, 
  Settings,
  CreditCard,
  DollarSign,
  Layout
} from 'lucide-react';
import { MpesaSettings } from '@/components/admin/MpesaSettings';
import { PlatformSettings } from '@/components/admin/PlatformSettings';
import { CoinManagement } from '@/components/admin/CoinManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { CommissionDashboard } from '@/components/admin/CommissionDashboard';
import { LandingPageSettings } from '@/components/admin/LandingPageSettings';

export default function Admin() {
  const { user, isSuperAdmin, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin ? 'Super Admin Access' : 'Admin Access'}
              </p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="coins" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="coins" className="gap-2">
              <Coins className="h-4 w-4" />
              Coins
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="commissions" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Commissions
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="mpesa" className="gap-2">
                <CreditCard className="h-4 w-4" />
                M-PESA
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="landing" className="gap-2">
                <Layout className="h-4 w-4" />
                Landing Page
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Platform
              </TabsTrigger>
            )}
          </TabsList>

          {/* Coins Tab */}
          <TabsContent value="coins">
            <CoinManagement userId={user.id} isSuperAdmin={isSuperAdmin} />
          </TabsContent>

          {/* Users Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="users">
              <UserManagement currentUserId={user.id} isSuperAdmin={isSuperAdmin} />
            </TabsContent>
          )}

          {/* Commissions Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="commissions">
              <CommissionDashboard />
            </TabsContent>
          )}

          {/* M-PESA Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="mpesa">
              <MpesaSettings />
            </TabsContent>
          )}

          {/* Landing Page Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="landing">
              <LandingPageSettings />
            </TabsContent>
          )}

          {/* Platform Settings Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="settings">
              <PlatformSettings />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
