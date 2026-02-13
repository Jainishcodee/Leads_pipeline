import { useMemo, useState } from 'react';
import { Search, Plus, Bell, Menu, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/auth/AuthContext';
import { useFirestoreCollection } from '@/lib/useFirestore';
import { where } from 'firebase/firestore';
import { invitesAPI, notificationsAPI, usersAPI } from '@/lib/api';
import { browserNotifications } from '@/lib/browserNotifications';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick?: () => void;
  onNewLead?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, onNewLead, showMenuButton = false }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const constraints = useMemo(
    () => (profile?.id ? [where('userId', '==', profile.id)] : []),
    [profile?.id]
  );
  const { data: notifications = [] } = useFirestoreCollection<any>('notifications', constraints, { listen: true });
  const unreadCount = notifications.filter((n) => !n.read).length;

  const inviteConstraints = useMemo(
    () => (profile?.email ? [
      where('email', '==', profile.email.toLowerCase()),
      where('status', '==', 'pending'),
    ] : []),
    [profile?.email]
  );

  const { data: pendingInvites = [] } = useFirestoreCollection<any>('invites', inviteConstraints, { listen: true });

  const handleAcceptInvite = async (invite: any) => {
    if (!profile?.id) return;
    if (profile.organizationId) {
      toast.error('You are already linked to an organization');
      return;
    }
    setProcessingInviteId(invite.id);
    try {
      const orgName = invite.organizationName || 'organization';
      await invitesAPI.accept(invite.id);
      await usersAPI.update(profile.id, {
        organizationId: invite.organizationId,
        role: profile.role || 'member',
      });

      if (invite.invitedById) {
        await notificationsAPI.create({
          userId: invite.invitedById,
          organizationId: invite.organizationId,
          type: 'invite_accept',
          title: 'Invite accepted',
          message: `${profile.email} accepted your invitation to ${orgName}`,
          read: false,
        });
      }

      toast.success('Invitation accepted');
    } catch (error) {
      console.error('Failed to accept invite', error);
      toast.error('Could not accept invite');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleRejectInvite = async (invite: any) => {
    setProcessingInviteId(invite.id);
    try {
      const orgName = invite.organizationName || 'organization';
      await invitesAPI.reject(invite.id);

      if (invite.invitedById) {
        await notificationsAPI.create({
          userId: invite.invitedById,
          organizationId: invite.organizationId,
          type: 'invite_reject',
          title: 'Invite rejected',
          message: `${invite.email} declined the invitation to ${orgName}`,
          read: false,
        });
      }

      toast.success('Invitation rejected');
    } catch (error) {
      console.error('Failed to reject invite', error);
      toast.error('Could not reject invite');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read
      if (!notification.read) {
        await notificationsAPI.markAsRead(notification.id);
      }
      
      // Navigate to relevant page if leadId exists
      if (notification.leadId) {
        navigate(`/leads/${notification.leadId}`);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  return (
    <header className="h-14 md:h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-3 md:px-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          {showMenuButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <div className="relative flex-1 max-w-[155px] sm:max-w-xs md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-mocha bg-muted/50 h-9 md:h-10 text-sm"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            onClick={onNewLead}
            className="btn-mocha h-9 md:h-10"
            size="sm"
          >
            <Plus className="w-3 h-4" />
            <span className="ml-1.2">New Lead</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 md:w-80">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              
              {/* Browser Notification Prompt */}
              {browserNotifications.isSupported() && !browserNotifications.hasPermission() && (
                <div className="p-3 border-b border-border bg-mocha-50">
                  <div className="flex items-start gap-2">
                    <BellRing className="w-4 h-4 text-mocha-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Enable Browser Notifications</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Get notified even when you're working in other tabs
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs"
                        onClick={() => browserNotifications.requestPermission()}
                      >
                        Enable Notifications
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {pendingInvites.length > 0 && (
                <div className="p-3 border-b border-border space-y-2">
                  <p className="text-sm font-medium">Invitations</p>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="rounded border border-border p-2">
                      <p className="text-sm font-semibold">Join organization</p>
                      <p className="text-xs text-muted-foreground">You were invited to join org {invite.organizationId}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="btn-mocha"
                          disabled={Boolean(processingInviteId)}
                          onClick={() => handleAcceptInvite(invite)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(processingInviteId)}
                          onClick={() => handleRejectInvite(invite)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      className="flex flex-col items-start p-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-mocha-500 mt-1.5 flex-shrink-0" />
                        )}
                        <div className={!notification.read ? '' : 'ml-4'}>
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
