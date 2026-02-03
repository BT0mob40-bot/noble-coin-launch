import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Ban, Shield, ShieldAlert, UserCog, Loader2, Search, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserWithDetails {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  fiat_balance: number;
}

interface UserManagementProps {
  currentUserId: string;
  isSuperAdmin: boolean;
}

export function UserManagement({ currentUserId, isSuperAdmin }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email, created_at');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const { data: walletsData } = await supabase
        .from('wallets')
        .select('user_id, fiat_balance');

      if (profilesData) {
        const usersWithDetails = profilesData.map(profile => ({
          id: profile.user_id,
          email: profile.email || 'Unknown',
          created_at: profile.created_at,
          roles: rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [],
          fiat_balance: walletsData?.find(w => w.user_id === profile.user_id)?.fiat_balance || 0,
        }));
        setUsers(usersWithDetails);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, currentRoles: string[]) => {
    try {
      // Remove existing role-based entries (except banned)
      const rolesToRemove = currentRoles.filter(r => r !== 'banned' && r !== newRole);
      for (const role of rolesToRemove) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as any);
      }

      // Add new role if not already present
      if (!currentRoles.includes(newRole)) {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as any });
      }

      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
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
        toast.success('User unbanned');
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'banned' });
        toast.success('User banned');
      }
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'default';
      case 'coin_creator': return 'secondary';
      case 'banned': return 'destructive';
      default: return 'outline';
    }
  };

  const getPrimaryRole = (roles: string[]) => {
    if (roles.includes('super_admin')) return 'super_admin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('coin_creator')) return 'coin_creator';
    return 'user';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              {isSuperAdmin ? 'Manage all users and their roles' : 'View platform users'}
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 bg-muted/30"
            />
          </div>
        </div>
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
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Joined</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isBanned = user.roles.includes('banned');
                const primaryRole = getPrimaryRole(user.roles);
                const isCurrentUser = user.id === currentUserId;

                return (
                  <TableRow key={user.id} className={isBanned ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          primaryRole === 'super_admin' ? 'bg-primary/20 text-primary' :
                          primaryRole === 'admin' ? 'bg-accent/20 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {primaryRole === 'super_admin' ? (
                            <ShieldAlert className="h-4 w-4" />
                          ) : primaryRole === 'admin' ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <UserCog className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {isCurrentUser && (
                            <p className="text-xs text-muted-foreground">(You)</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Wallet className="h-3 w-3 text-muted-foreground" />
                        KES {user.fiat_balance.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <div className="flex justify-end gap-2">
                            <Select
                              value={primaryRole}
                              onValueChange={(value) => handleRoleChange(user.id, value, user.roles)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="coin_creator">Creator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBanUser(user.id, isBanned)}
                              className={isBanned ? 'text-success' : 'text-destructive'}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              {isBanned ? 'Unban' : 'Ban'}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
