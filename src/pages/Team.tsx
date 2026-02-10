import { 
  Plus, 
  Mail, 
  MoreHorizontal,
  Shield,
  User,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockUsers, currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';

const roleConfig = {
  admin: { 
    label: 'Admin', 
    icon: Shield, 
    className: 'bg-mocha-100 text-mocha-700' 
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
};

export default function Team() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's team
          </p>
        </div>
        {currentUser.role === 'admin' && (
          <Button className="btn-mocha">
            <Plus className="w-4 h-4 mr-1.5" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Team Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockUsers.map((user) => {
          const role = roleConfig[user.role];
          const RoleIcon = role.icon;

          return (
            <div key={user.id} className="card-premium p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-mocha-100 text-mocha-700">
                      {user.name.split(' ').map(n => n[0]).join('')}
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
                
                {currentUser.role === 'admin' && user.id !== currentUser.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Change Role</DropdownMenuItem>
                      <DropdownMenuItem>View Activity</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <a 
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {user.email}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
