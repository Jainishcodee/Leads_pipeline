import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { AddTeamMemberModal } from '@/components/admin/AddTeamMemberModal';
import { BroadcastMessages } from '@/components/admin/BroadcastMessages';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUsers } from '@/hooks/useFirebaseData';
import { useAuth } from '@/auth/AuthContext';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

export function AdminLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { users, refetch: refetchUsers } = useUsers(organizationId);
  const location = useLocation();

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Desktop Sidebar - hover to expand */}
      {!isMobile && (
        <Sidebar 
          isExpanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
          onOpenBroadcast={() => setBroadcastOpen(true)}
          isBroadcastOpen={broadcastOpen}
        />
      )}

      {/* Mobile Sidebar - Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar
            isMobile
            onExpandedChange={() => setMobileMenuOpen(false)}
            onOpenBroadcast={() => setBroadcastOpen(true)}
            isBroadcastOpen={broadcastOpen}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          showMenuButton={isMobile} 
          onMenuClick={() => setMobileMenuOpen(true)}
          onNewLead={() => setCreateLeadOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
      />

      {/* Add Team Member Modal */}
      <AddTeamMemberModal
        open={addTeamMemberOpen}
        onOpenChange={setAddTeamMemberOpen}
        availableUsers={users}
        currentTeamMembers={users.filter(u => u.role === 'member')}
        organizationId={organizationId}
        onSuccess={() => refetchUsers()}
      />

      {/* Broadcast Messages Panel */}
      {broadcastOpen && organizationId && (
        <BroadcastMessages
          organizationId={organizationId}
          onClose={() => setBroadcastOpen(false)}
        />
      )}
    </div>
  );
}
