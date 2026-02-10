import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Settings, 
  Plus, 
  ChevronDown,
  ChevronRight,
  Coffee,
  Users,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockFolders, mockOrganization, currentUser } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
}

export function Sidebar({ isExpanded = false, onExpandedChange, isMobile = false }: SidebarProps) {
  const location = useLocation();
  const [foldersOpen, setFoldersOpen] = useState(true);
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isFolderActive = (folderId: string) => 
    location.pathname === `/folders/${folderId}`;

  const displayName = user?.displayName || user?.email?.split('@')[0] || currentUser.name;
  const displayMeta = user?.email || currentUser.role;

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
          <div className={cn(
            'flex items-center gap-3',
            !expanded && 'justify-center'
          )}>
            <div className="w-10 h-10 rounded-xl gradient-mocha flex items-center justify-center flex-shrink-0">
              <Coffee className="w-5 h-5 text-primary-foreground" />
            </div>
            {expanded && (
              <div className="overflow-hidden">
                <h1 className="font-semibold text-foreground truncate">Mocha Leads</h1>
                <p className="text-xs text-muted-foreground truncate">{mockOrganization.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* Dashboard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/"
                className={cn(
                  'sidebar-item',
                  isActive('/') && 'sidebar-item-active',
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
                {mockFolders.map((folder) => (
                  <NavLink
                    key={folder.id}
                    to={`/folders/${folder.id}`}
                    className={cn(
                      'sidebar-item text-sm py-2',
                      isFolderActive(folder.id) && 'sidebar-item-active'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-mocha-400 flex-shrink-0" />
                    <span className="truncate flex-1">{folder.name}</span>
                    <span className="text-xs text-muted-foreground">{folder.leadsCount}</span>
                  </NavLink>
                ))}
                <button className="sidebar-item text-sm py-2 text-muted-foreground hover:text-foreground w-full">
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Add Folder</span>
                </button>
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
                to="/team"
                className={cn(
                  'sidebar-item',
                  isActive('/team') && 'sidebar-item-active',
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

          {/* Settings */}
          {currentUser.role === 'admin' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/settings"
                  className={cn(
                    'sidebar-item',
                    isActive('/settings') && 'sidebar-item-active',
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
              <div className={cn(
                'flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer',
                !expanded && 'justify-center'
              )}>
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarFallback className="bg-mocha-200 text-mocha-700 text-sm">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
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
                      onClick={() => signOut()}
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
                {currentUser.name}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
