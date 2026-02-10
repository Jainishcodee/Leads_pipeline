import { useState } from 'react';
import { Search, Plus, Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { mockNotifications } from '@/data/mockData';

interface HeaderProps {
  onMenuClick?: () => void;
  onNewLead?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, onNewLead, showMenuButton = false }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = mockNotifications.filter(n => !n.read).length;

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

          <div className="relative flex-1 max-w-md">
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
        <div className="flex items-center gap-2 md:gap-3">
          <Button 
            onClick={onNewLead}
            className="btn-mocha hidden sm:flex"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">New Lead</span>
          </Button>
          <Button 
            onClick={onNewLead}
            size="icon"
            className="btn-mocha sm:hidden h-9 w-9"
          >
            <Plus className="w-4 h-4" />
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
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  mockNotifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      className="flex flex-col items-start p-3 cursor-pointer"
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
