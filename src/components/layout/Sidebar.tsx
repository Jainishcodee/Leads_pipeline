import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Settings, 
  Plus, 
  ChevronDown,
  ChevronRight,
  Users,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { useFolders, useLeads } from '@/hooks/useFirebaseData';
import { useFirestoreDoc } from '@/lib/useFirestore';
import { CreateFolderModal } from '@/components/folders/CreateFolderModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  isMobile?: boolean;
  onOpenBroadcast?: () => void;
  isBroadcastOpen?: boolean;
}

export function Sidebar({
  isExpanded = false,
  onExpandedChange,
  isMobile = false,
  onOpenBroadcast,
  isBroadcastOpen = false,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [deferRealtime, setDeferRealtime] = useState(true);
  const { user, profile, signOut } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { folders, loading: foldersLoading, refetch: refetchFolders } = useFolders(organizationId, {
    skip: deferRealtime,
    listen: !deferRealtime,
  });
  const { leads } = useLeads(organizationId, {
    role: profile?.role,
    userId: user?.uid,
    skip: deferRealtime,
    listen: !deferRealtime,
  });
  const { data: organization } = useFirestoreDoc<{ id: string; name?: string }>(
    'organizations',
    organizationId || null,
    { listen: true }
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => setDeferRealtime(false), 500);
    return () => window.clearTimeout(timerId);
  }, []);

  // Calculate actual lead counts per folder
  const folderLeadCounts = folders.reduce((acc, folder) => {
    const count = leads.filter(lead => lead.folderId === folder.id).length;
    acc[folder.id] = count;
    return acc;
  }, {} as Record<string, number>);

  const isActive = (path: string) => location.pathname === path;
  const isFolderActive = (folderId: string) => 
    location.pathname === `${basePath}/folders/${folderId}`;

  const closeMobileSidebar = () => {
    if (isMobile) {
      onExpandedChange?.(false);
    }
  };

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  const displayMeta = profile?.email || user?.email || '';
  const organizationLabel = organization?.name || 'No organization';

  const basePath = profile?.role === 'admin' || profile?.role === 'superadmin' ? '/admin' : '/dashboard';
  const dashboardPath = basePath;
  const teamPath = `${basePath}/team`;
  const settingsPath = `${basePath}/settings`;

  // Determine if sidebar should show expanded content
  const expanded = isMobile || isExpanded;

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
          expanded ? 'w-64' : 'w-16'
        )}
        onMouseEnter={() => !isMobile && onExpandedChange?.(true)}
        onMouseLeave={() => !isMobile && onExpandedChange?.(false)}
      >
        {/* Logo & Org */}
        <div className="p-3 border-b border-sidebar-border">
          <button
            onClick={() => navigate(basePath)}
            className={cn(
              'flex items-center gap-3 w-full hover:opacity-80 transition-opacity rounded-lg',
              !expanded && 'justify-center'
            )}
            title="Go to Dashboard"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            {expanded && (
              <div className="overflow-hidden">
                <h1 className="font-semibold text-foreground truncate">Japaate</h1>
                <p className="text-xs text-muted-foreground truncate">{organizationLabel}</p>
              </div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* Dashboard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to={dashboardPath}
                onClick={closeMobileSidebar}
                className={cn(
                  'sidebar-item',
                  isActive(dashboardPath) && 'sidebar-item-active',
                  !expanded && 'justify-center px-2'
                )}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                {expanded && <span>Dashboard</span>}
              </NavLink>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right">Dashboard</TooltipContent>
            )}
          </Tooltip>

          {/* Folders Section */}
          {expanded ? (
            <Collapsible open={foldersOpen} onOpenChange={setFoldersOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="sidebar-item justify-between group">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 flex-shrink-0" />
                    <span>Folders</span>
                  </div>
                  {foldersOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-4 mt-1 space-y-0.5">
                {foldersLoading ? (
                  <div className="sidebar-item text-sm py-2 text-muted-foreground">
                    Loading folders...
                  </div>
                ) : (
                  folders.map((folder) => (
                    <NavLink
                      key={folder.id}
                      to={`${basePath}/folders/${folder.id}`}
                      onClick={closeMobileSidebar}
                      className={cn(
                        'sidebar-item text-sm py-2',
                        isFolderActive(folder.id) && 'sidebar-item-active'
                      )}
                    >
                      <div className="w-2 h-2 rounded-full bg-mocha-400 flex-shrink-0" />
                      <span className="truncate flex-1">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">{folderLeadCounts[folder.id] || 0}</span>
                    </NavLink>
                  ))
                )}
                {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                  <button 
                    onClick={() => setCreateFolderOpen(true)}
                    className="sidebar-item text-sm py-2 text-muted-foreground hover:text-foreground w-full"
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span>Add Folder</span>
                  </button>
                )}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="sidebar-item justify-center px-2 cursor-pointer">
                  <FolderOpen className="w-5 h-5 flex-shrink-0" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Folders</TooltipContent>
            </Tooltip>
          )}

          {/* Team */}
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to={teamPath}
                onClick={closeMobileSidebar}
                className={cn(
                  'sidebar-item',
                  isActive(teamPath) && 'sidebar-item-active',
                  !expanded && 'justify-center px-2'
                )}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {expanded && <span>Team</span>}
              </NavLink>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right">Team</TooltipContent>
            )}
          </Tooltip>

          {/* Messages/Chat */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (onOpenBroadcast) {
                    onOpenBroadcast();
                    closeMobileSidebar();
                  } else {
                    setBroadcastOpen(true);
                  }
                }}
                className={cn(
                  'sidebar-item w-full',
                  (isBroadcastOpen || broadcastOpen) && 'sidebar-item-active',
                  !expanded && 'justify-center px-2'
                )}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                {expanded && <span>Messages</span>}
              </button>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right">Messages</TooltipContent>
            )}
          </Tooltip>

          {/* Settings */}
          {profile?.role === 'admin' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to={settingsPath}
                  onClick={closeMobileSidebar}
                  className={cn(
                    'sidebar-item',
                    isActive(settingsPath) && 'sidebar-item-active',
                    !expanded && 'justify-center px-2'
                  )}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {expanded && <span>Settings</span>}
                </NavLink>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right">Settings</TooltipContent>
              )}
            </Tooltip>
          )}
        </nav>

        {/* User Section */}
        <div className="p-2 border-t border-sidebar-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                onClick={() => {
                  navigate(`${basePath}/profile`);
                  closeMobileSidebar();
                }}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer',
                  !expanded && 'justify-center'
                )}
              >
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback className="bg-mocha-200 text-mocha-700 text-sm">
                    {(displayName || 'U').split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {expanded && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{displayMeta}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSignOutDialogOpen(true);
                      }}
                      aria-label="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right">
                {displayName}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>

      <CreateFolderModal
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSuccess={() => refetchFolders()}
        existingFolders={folders}
      />
      
      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut()}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
