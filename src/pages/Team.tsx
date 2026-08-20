import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, MessageCircle, Shield, User, Eye, Plus, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUsers } from '@/hooks/useFirebaseData';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/utils';
import { AddTeamMemberModal } from '@/components/admin/AddTeamMemberModal';
import { useFirestoreCollection, useFirestoreDoc } from '@/lib/useFirestore';
import { where } from 'firebase/firestore';
import { updateDocument } from '@/lib/firestore';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const roleConfig = {
  admin: { 
    label: 'Admin', 
    icon: Shield, 
    className: 'bg-green-200 text-mocha-700' 
  },
  member: { 
    label: 'Member', 
    icon: User, 
    className: 'bg-blue-100 text-blue-700' 
  },
  observer: { 
    label: 'Observer', 
    icon: Eye, 
    className: 'bg-slate-100 text-slate-700' 
  },
  superadmin: {
    label: 'Super Admin',
    icon: Shield,
    className: 'bg-amber-100 text-amber-700',
  },
};

export default function Team() {
  const { profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { users, loading } = useUsers(organizationId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const [teamName, setTeamName] = useState('Team Members');
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(false);

  const { data: organization } = useFirestoreDoc<{ id: string; name?: string }>(
    'organizations',
    organizationId || null,
    { listen: true }
  );

  const inviteConstraints = useMemo(
    () => (organizationId && isAdmin ? [
      where('organizationId', '==', organizationId),
      where('status', '==', 'pending'),
    ] : []),
    [organizationId, isAdmin]
  );

  const { data: pendingInvites = [] } = useFirestoreCollection<any>('invites', inviteConstraints, { listen: true });

  useEffect(() => {
    if (organization?.name) {
      setTeamName(organization.name);
    }
  }, [organization?.name]);

  const handleSaveTeamName = async () => {
    if (!isAdmin || !organizationId) return;
    const nextName = teamName.trim();
    if (!nextName) {
      toast.error('Team name cannot be empty');
      return;
    }

    try {
      setSavingTeamName(true);
      await updateDocument('organizations', organizationId, { name: nextName });
      toast.success('Team name updated');
      setEditingTeamName(false);
    } catch (error) {
      console.error('Failed to update team name:', error);
      toast.error('Failed to update team name');
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleCancelEditTeamName = () => {
    setEditingTeamName(false);
    if (organization?.name) {
      setTeamName(organization.name);
    }
  };

  const sortedUsers = useMemo(() => {
    const priority: Record<string, number> = {
      superadmin: 0,
      admin: 1,
      member: 2,
      observer: 3,
    };
    return [...users].sort((a, b) => {
      const aRank = priority[a.role] ?? 9;
      const bRank = priority[b.role] ?? 9;
      return aRank - bRank;
    });
  }, [users]);

  if (!organizationId) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="card-premium p-6">
          <p className="text-muted-foreground">No organization assigned. Ask a super admin to link you to an organization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {editingTeamName ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-10 text-lg font-semibold max-w-xs"
                  aria-label="Team name"
                  autoFocus
                />
                <Button
                  variant="outline"
                  onClick={handleSaveTeamName}
                  disabled={savingTeamName}
                  className="h-10"
                >
                  {savingTeamName ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelEditTeamName}
                  disabled={savingTeamName}
                  className="h-10"
                >
                  Cancel
                </Button>
              </div>
              <p className="text-muted-foreground">
                Manage your organization's team
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">Team {organization?.name || 'Members'}</h1>
                {isAdmin && (
                  <button
                    onClick={() => setEditingTeamName(true)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Edit team name"
                  >
                    <Edit className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                Manage your organization's team
              </p>
            </>
          )}
        </div>
        {isAdmin && (
          <Button className="btn-mocha" onClick={() => setAddTeamMemberOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Invite Member
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="card-premium p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Pending invites</h3>
              <p className="text-sm text-muted-foreground">Invitations awaiting acceptance</p>
            </div>
            <Badge variant="secondary">{pendingInvites.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              pendingInvites.map((invite: any) => (
                <div key={invite.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                  <div>
                    <p className="font-medium text-sm">{invite.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </p>
                  </div>
                  <Badge className="capitalize" variant="outline">{invite.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Team Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-sm text-muted-foreground">Loading team...</div>
        ) : users.length === 0 ? (
          <div className="col-span-full text-sm text-muted-foreground">No team members yet.</div>
        ) : (
          sortedUsers.map((user) => {
            const role = roleConfig[user.role] || roleConfig.member;
            const RoleIcon = role.icon;
            const initials = user.name.split(' ').map((n) => n[0]).join('') || 'U';
            const phone = user.phone || '';
            const whatsappHref = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : undefined;
            return (
              <div key={user.id} className="card-premium p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar || ''} alt={user.name} />
                      <AvatarFallback className="bg-mocha-100 text-mocha-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <Badge className={cn('mt-1', role.className)}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {role.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm text-muted-foreground">
                  <a 
                    href={`mailto:${user.email}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </a>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {phone}
                    </a>
                  )}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddTeamMemberModal
        open={addTeamMemberOpen}
        onOpenChange={setAddTeamMemberOpen}
        availableUsers={users}
        currentTeamMembers={users}
        organizationId={organizationId}
        onSuccess={() => setAddTeamMemberOpen(false)}
      />
    </div>
  );
}
