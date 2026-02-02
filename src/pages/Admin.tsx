import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Coins, 
  Users, 
  Settings,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Ban,
  TrendingUp,
  Star,
  CreditCard
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { MpesaSettings } from '@/components/admin/MpesaSettings';
import { CoinFormDialog } from '@/components/admin/CoinFormDialog';
import { PlatformSettings } from '@/components/admin/PlatformSettings';

interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  total_supply: number;
  circulating_supply: number;
  is_active: boolean;
  is_featured: boolean;
  is_trending: boolean;
  trading_paused: boolean;
  logo_url: string | null;
  description: string | null;
}

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const { user, isSuperAdmin } = useAuth();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCoin, setShowCreateCoin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: coinsData } = await supabase
        .from('coins')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email, created_at');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (coinsData) setCoins(coinsData);

      if (profilesData && rolesData) {
        const usersWithRoles = profilesData.map(profile => ({
          id: profile.user_id,
          email: profile.email || 'Unknown',
          created_at: profile.created_at,
          roles: rolesData
            .filter(r => r.user_id === profile.user_id)
            .map(r => r.role),
        }));
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoin = async (coinId: string, updates: Partial<Coin>) => {
    try {
      const { error } = await supabase
        .from('coins')
        .update(updates)
        .eq('id', coinId);

      if (error) throw error;
      toast.success('Coin updated successfully!');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update coin');
    }
  };

  const handleDeleteCoin = async (coinId: string) => {
    if (!confirm('Are you sure you want to delete this coin?')) return;

    try {
      const { error } = await supabase
        .from('coins')
        .delete()
        .eq('id', coinId);

      if (error) throw error;
      toast.success('Coin deleted successfully!');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coin');
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      if (isBanned) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'banned');
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'banned' });
      }
      toast.success(isBanned ? 'User unbanned' : 'User banned');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

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
            <h1 className="text-3xl font-bold font-display">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">
            Manage coins, users, and platform settings
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Coins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coins.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Coins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coins.filter(c => c.is_active).length}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Banned Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.roles.includes('banned')).length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="coins" className="space-y-6">
          <TabsList>
            <TabsTrigger value="coins" className="gap-2">
              <Coins className="h-4 w-4" />
              Coins
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="mpesa" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  M-PESA
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Coins Tab */}
          <TabsContent value="coins">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manage Coins</CardTitle>
                  <CardDescription>Create, edit, and manage coin listings</CardDescription>
                </div>
                <Button variant="hero" className="gap-2" onClick={() => setShowCreateCoin(true)}>
                  <Plus className="h-4 w-4" />
                  Create Coin
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Coin</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Supply</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coins.map((coin) => (
                        <TableRow key={coin.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                                {coin.logo_url ? (
                                  <img src={coin.logo_url} alt={coin.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Coins className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{coin.name}</p>
                                <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>KES {coin.price.toFixed(4)}</TableCell>
                          <TableCell>{(coin.total_supply / 1000000).toFixed(1)}M</TableCell>
                          <TableCell>
                            <Badge variant={coin.is_active ? 'default' : 'secondary'}>
                              {coin.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {coin.is_featured && (
                                <Badge variant="outline" className="gap-1">
                                  <Star className="h-3 w-3" /> Featured
                                </Badge>
                              )}
                              {coin.is_trending && (
                                <Badge variant="outline" className="gap-1">
                                  <TrendingUp className="h-3 w-3" /> Trending
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateCoin(coin.id, { is_featured: !coin.is_featured })}
                              >
                                <Star className={`h-4 w-4 ${coin.is_featured ? 'fill-primary text-primary' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateCoin(coin.id, { is_trending: !coin.is_trending })}
                              >
                                <TrendingUp className={`h-4 w-4 ${coin.is_trending ? 'text-success' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateCoin(coin.id, { is_active: !coin.is_active })}
                              >
                                {coin.is_active ? (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCoin(coin.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>View and manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {u.roles.map((role) => (
                                <Badge 
                                  key={role} 
                                  variant={role === 'banned' ? 'destructive' : role.includes('admin') ? 'default' : 'secondary'}
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {u.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBanUser(u.id, u.roles.includes('banned'))}
                                className={u.roles.includes('banned') ? 'text-success' : 'text-destructive'}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                {u.roles.includes('banned') ? 'Unban' : 'Ban'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* M-PESA Tab */}
          {isSuperAdmin && (
            <TabsContent value="mpesa">
              <MpesaSettings />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {isSuperAdmin && (
            <TabsContent value="settings">
              <PlatformSettings />
            </TabsContent>
          )}
        </Tabs>

        {/* Coin Form Dialog */}
        {user && (
          <CoinFormDialog
            open={showCreateCoin}
            onOpenChange={setShowCreateCoin}
            onSuccess={fetchData}
            userId={user.id}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
