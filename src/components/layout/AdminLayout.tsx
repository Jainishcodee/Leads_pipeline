import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

export function AdminLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
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
          <Sidebar isExpanded={true} onExpandedChange={() => {}} />
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
    </div>
  );
}
