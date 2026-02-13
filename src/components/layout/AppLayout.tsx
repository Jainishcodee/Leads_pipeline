import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { ProfileCompletionModal } from '@/components/auth/ProfileCompletionModal';
import { NotificationListener } from '@/components/NotificationListener';
import { useAuth } from '@/auth/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

export function AppLayout() {
  const { user, profile } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar - hover to expand */}
      {!isMobile && (
        <Sidebar 
          isExpanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />
      )}

      {/* Mobile Sidebar - Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar isMobile onExpandedChange={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)}
          onNewLead={() => setCreateLeadOpen(true)}
          showMenuButton={isMobile}
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

      {/* Profile Completion Modal */}
      {user && profile && (
        <ProfileCompletionModal
          key={profileRefreshKey}
          user={profile}
          authUserId={user.uid}
          onComplete={() => setProfileRefreshKey(prev => prev + 1)}
        />
      )}

      {/* Real-time Notification Listener */}
      <NotificationListener />
    </div>
  );
}
