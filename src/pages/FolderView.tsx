import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Download, 
  LayoutGrid, 
  List,
  Calendar,
  MapPin,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { useFolderLeads, useFolders } from '@/hooks/useFirebaseData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { timestampToDate } from '@/lib/firestore';
import { useAuth } from '@/auth/AuthContext';

export default function FolderView() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const { profile, user } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { folders, loading: foldersLoading } = useFolders(organizationId);
  const { leads: folderLeads, loading: leadsLoading } = useFolderLeads(folderId || '', organizationId, {
    role: profile?.role,
    userId: user?.uid,
  });
  
  const folder = folders.find(f => f.id === folderId);
  
  if (foldersLoading || leadsLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading folder...</p>
      </div>
    );
  }

  // Apply filters
  const filteredLeads = folderLeads.filter(lead => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false;
    return true;
  });

  if (!folder) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Folder not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{folder.name}</h1>
          {folder.description && (
            <p className="text-muted-foreground mt-1">{folder.description}</p>
          )}
          {folder.eventStartDate && (
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(timestampToDate(folder.eventStartDate), 'MMM d')}
                {' - '}
                {folder.eventEndDate
                  ? format(timestampToDate(folder.eventEndDate), 'MMM d, yyyy')
                  : '—'}
              </span>
              {folder.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {folder.venue}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button 
            className="btn-mocha"
            onClick={() => setCreateLeadOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem>Edit Folder</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete Folder</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm overflow-x-auto">
        <div className="flex-shrink-0">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold ml-1">{folderLeads.length}</span>
        </div>
        <div className="w-px h-4 bg-border flex-shrink-0" />
        <div className="flex-shrink-0">
          <span className="text-muted-foreground">Converted:</span>
          <span className="font-semibold ml-1 text-status-converted">
            {folderLeads.filter(l => l.status === 'converted').length}
          </span>
        </div>
        <div className="w-px h-4 bg-border flex-shrink-0" />
        <div className="flex-shrink-0">
          <span className="text-muted-foreground">Ongoing:</span>
          <span className="font-semibold ml-1">
            {folderLeads.filter(l => l.status !== 'converted' && l.status !== 'cancelled').length}
          </span>
        </div>
      </div>

      {/* Filters & View toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="sample_requested">Sample Requested</SelectItem>
              <SelectItem value="sample_sent">Sample Sent</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-md',
              viewMode === 'table' && 'bg-background shadow-sm'
            )}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4 mr-1.5" />
            Table
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-md',
              viewMode === 'kanban' && 'bg-background shadow-sm'
            )}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-4 h-4 mr-1.5" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Leads View */}
      {viewMode === 'table' ? (
        <LeadsTable leads={filteredLeads} />
      ) : (
        <div className="text-center py-12 card-premium">
          <p className="text-muted-foreground">Kanban view coming soon</p>
        </div>
      )}

      <CreateLeadModal 
        open={createLeadOpen} 
        onOpenChange={setCreateLeadOpen}
        defaultFolderId={folderId}
      />
    </div>
  );
}
