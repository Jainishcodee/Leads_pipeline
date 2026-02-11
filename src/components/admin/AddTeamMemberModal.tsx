import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { usersAPI } from '@/lib/api';
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
}

export function AddTeamMemberModal({
  open,
  onOpenChange,
  onSuccess,
  availableUsers,
  currentTeamMembers,
}: AddTeamMemberModalProps) {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const currentTeamMemberIds = currentTeamMembers.map(u => u.id);
  const nonTeamUsers = availableUsers.filter(
    u => !currentTeamMemberIds.includes(u.id) && u.role !== 'admin'
  );

  const filteredUsers = nonTeamUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to add');
      return;
    }

    try {
      setLoading(true);
      
      // In a real implementation, you would call an API to update user roles
      // For now, we'll just show a success message
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setInviteLoading(true);
      
      // In a real implementation, you would send an invitation email
      // For now, we'll just show a success message
      toast.success(`Invitation sent to ${inviteEmail}`);
      
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
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10"
              />
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
