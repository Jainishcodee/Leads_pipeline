import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/auth/AuthContext';
import { useFirestoreCollection } from '@/lib/useFirestore';
import { organizationsAPI, usersAPI } from '@/lib/api';
import type { User } from '@/types';

export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState<string>('');
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('none');

  const { data: organizations } = useFirestoreCollection<{ id: string; name: string }>('organizations', [], { listen: true });
  const { data: users } = useFirestoreCollection<User>('users', [], { listen: true });

  if (profile?.role !== 'superadmin') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Only super admins can view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    try {
      setSaving(true);
      await organizationsAPI.create(orgName.trim());
      setOrgName('');
    } catch (error) {
      console.error('Failed to create organization', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdmin = async (organizationId: string) => {
    try {
      setAssigning(organizationId);
      const updates: Promise<unknown>[] = [];

      const currentOrgAdmin = users.find(
        (u) => u.organizationId === organizationId && u.role === 'admin'
      );

      // Demote existing admin if changing or clearing
      if (currentOrgAdmin && currentOrgAdmin.id !== selectedAdminId && selectedAdminId === 'none') {
        updates.push(usersAPI.update(currentOrgAdmin.id, { role: 'member', organizationId }));
      }

      if (selectedAdminId !== 'none') {
        // Demote any other admin currently in this org (should be at most one)
        if (currentOrgAdmin && currentOrgAdmin.id !== selectedAdminId) {
          updates.push(usersAPI.update(currentOrgAdmin.id, { role: 'member', organizationId }));
        }

        // Promote chosen user
        updates.push(usersAPI.update(selectedAdminId, { role: 'admin', organizationId }));
      }

      await Promise.all(updates);
    } catch (error) {
      console.error('Failed to update admin', error);
    } finally {
      setAssigning('');
      setEditingOrgId(null);
      setSelectedAdminId('none');
    }
  };

  const adminUsers = users.filter((u) => u.role === 'admin');

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Super Admin</h1>
          <p className="text-muted-foreground mt-1">Manage organizations and admins.</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          Log out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Create Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <Button onClick={handleCreateOrg} disabled={saving || !orgName.trim()} className="w-full">
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organizations yet.</p>
            ) : (
              organizations.map((org) => {
                const orgAdmin = adminUsers.find((u) => u.organizationId === org.id);
                const isEditing = editingOrgId === org.id;
                const candidates = users.filter((u) => {
                  if (u.role === 'superadmin') return false;
                  // Exclude admins of other orgs
                  if (u.role === 'admin' && u.organizationId && u.organizationId !== org.id) return false;
                  return true;
                });

                return (
                  <div key={org.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Admin: {orgAdmin ? orgAdmin.name || orgAdmin.email : 'Unassigned'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{orgAdmin ? '1 admin' : 'No admin'}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingOrgId(org.id);
                            setSelectedAdminId(orgAdmin?.id ?? 'none');
                          }}
                        >
                          {isEditing ? 'Editing' : 'Edit'}
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <Select
                          value={selectedAdminId}
                          onValueChange={(val) => setSelectedAdminId(val)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select admin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {candidates.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleSaveAdmin(org.id)}
                          disabled={assigning === org.id}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingOrgId(null);
                            setSelectedAdminId('none');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }
