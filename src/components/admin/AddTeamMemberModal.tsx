import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { invitesAPI, notificationsAPI, usersAPI } from '@/lib/api';
import { getDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { User } from '@/types';

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  availableUsers: User[];
  currentTeamMembers: User[];
  organizationId: string;
}

export function AddTeamMemberModal({
  open,
  onOpenChange,
  onSuccess,
  availableUsers,
  currentTeamMembers,
  organizationId,
}: AddTeamMemberModalProps) {
  const { user: authUser, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>(availableUsers);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('your organization');

  useEffect(() => {
    if (open) {
      setSearchResults(availableUsers);
    }
  }, [open, availableUsers]);

  useEffect(() => {
    const loadOrg = async () => {
      if (!organizationId) return;
      try {
        const org = await getDocument<{ name?: string }>('organizations', organizationId);
        if (org?.name) {
          setOrganizationName(org.name);
        }
      } catch (err) {
        console.error('Failed to load organization name', err);
      }
    };
    loadOrg();
  }, [organizationId]);

  const currentTeamMemberIds = currentTeamMembers.map(u => u.id);
  const nonTeamUsers = searchResults.filter(
    u => !currentTeamMemberIds.includes(u.id)
      && u.role !== 'admin'
      && (u.organizationId == null || u.organizationId === undefined || u.organizationId === '')
      && u.id !== authUser?.uid
  );

  const filteredUsers = nonTeamUsers.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a name or email to search');
      return;
    }

    try {
      setSearchLoading(true);
      const users = await usersAPI.getUnassigned();
      const query = searchQuery.trim().toLowerCase();
      const matched = users.filter((u) =>
        u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
      );
      setSearchResults(matched);
      if (matched.length === 0) {
        toast.info('No users matched that search');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to add');
      return;
    }

    if (!organizationId) {
      toast.error('No organization found for this account');
      return;
    }

    try {
      setLoading(true);

      const userById = new Map(searchResults.map((u) => [u.id, u]));

      await Promise.all(
        selectedUsers.map(async (userId) => {
          const targetUser = userById.get(userId);
          if (!targetUser) {
            throw new Error('Selected user not found in search results');
          }
          if (targetUser.organizationId) {
            throw new Error(`${targetUser.email} already belongs to an organization`);
          }
          await usersAPI.update(userId, {
            organizationId,
            role: 'member',
          });

          await notificationsAPI.create({
            userId,
            organizationId,
            type: 'invite_accept',
            title: 'You were added to the organization',
            message: `An admin added you to ${organizationName}. You now have member access.`,
            read: false,
          });
        })
      );

      toast.success(`Added ${selectedUsers.length} user(s) to the team`);

      setSelectedUsers([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding team members:', error);
      toast.error('Failed to add team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!organizationId || !authUser) {
      toast.error('Missing organization or user context');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setInviteLoading(true);

      const normalizedEmail = inviteEmail.trim().toLowerCase();

      await invitesAPI.create({
        email: normalizedEmail,
        organizationId,
        organizationName,
        invitedById: authUser.uid,
        invitedByEmail: profile?.email,
      });

      // Optional: open a mail client so the admin can send a manual invite message
      const subject = encodeURIComponent('Invitation to join our team');
      const body = encodeURIComponent(
        `Hi,\n\nI would like to invite you to join our organization in the Mocha pipeline workspace. After signing up with this email, you can accept the invite from inside the app.\n\nThanks!`
      );
      window.open(`mailto:${normalizedEmail}?subject=${subject}&body=${body}`, '_blank');

      toast.success(`Invitation sent to ${normalizedEmail}`);

      setInviteEmail('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Team Members</DialogTitle>
          <DialogDescription>
            Add existing users to your team or invite new members via email
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Add Existing Users</TabsTrigger>
            <TabsTrigger value="invite">Invite via Email</TabsTrigger>
          </TabsList>

          {/* Add Existing Users Tab */}
          <TabsContent value="existing" className="space-y-4 mt-4">
            {/* Search Users */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchUsers}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Only users not linked to any organization will appear.
              </p>
            </div>

            {/* Users List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No users available to add</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <Card key={user.id} className="p-0">
                    <CardContent className="p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded capitalize flex-shrink-0">
                          {user.role}
                        </span>
                      </label>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUsers}
                disabled={loading || selectedUsers.length === 0}
              >
                {loading ? 'Adding...' : `Add ${selectedUsers.length} User${selectedUsers.length === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Invite via Email Tab */}
          <TabsContent value="invite" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                An invitation email will be sent to this address. The user will be able to sign up and automatically join your team.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={inviteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteUser}
                disabled={inviteLoading || !inviteEmail.trim()}
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
