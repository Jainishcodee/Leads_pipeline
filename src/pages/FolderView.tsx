import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Download, 
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { EditFolderModal } from '@/components/folders/EditFolderModal';
import { useFolderLeads, useFolders } from '@/hooks/useFirebaseData';
import { format } from 'date-fns';
import { timestampToDate } from '@/lib/firestore';
import { useAuth } from '@/auth/AuthContext';
import { toast } from 'sonner';
import { foldersAPI } from '@/lib/api';
import type { Lead } from '@/types';

export default function FolderView() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { profile, user } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { folders, loading: foldersLoading } = useFolders(organizationId);
  const { leads: folderLeads, loading: leadsLoading } = useFolderLeads(folderId || '', organizationId, {
    role: profile?.role,
    userId: user?.uid,
  });
  
  const folder = folders.find(f => f.id === folderId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const handleDeleteFolder = async () => {
    if (!folder || !folderId) return;
    
    try {
      setIsDeleting(true);
      await foldersAPI.delete(folderId);
      toast.success('Folder deleted successfully');
      setDeleteDialogOpen(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const exportToCSV = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Company Name',
        'Location',
        'Status',
        'Priority',
        'WhatsApp Number',
        'Email',
        'Manager Name',
        'Manager Phone',
        'Interests',
        'Complete Address',
        'Reference',
        'Created By',
        'Created At',
      ];

      // Prepare CSV rows
      const rows = filteredLeads.map(lead => [
        lead.companyName || '',
        lead.location || '',
        lead.status || '',
        lead.priority || '',
        lead.whatsappNumber || '',
        lead.emailId || '',
        lead.managerName || '',
        lead.managerPhone || '',
        Array.isArray(lead.interest) ? lead.interest.join('; ') : (lead.interest || ''),
        lead.completeAddress || '',
        lead.reference || '',
        lead.createdByName || '',
        lead.createdAt ? format(timestampToDate(lead.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => 
            // Escape commas and quotes in cell content
            `"${String(cell).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${folder?.name || 'leads'}_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${filteredLeads.length} leads to CSV`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export to CSV');
    }
  };
  
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
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditFolderOpen(true)}>
                  Edit Folder
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
              <SelectItem value="all">All</SelectItem>
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
      </div>

      {/* Leads View */}
      <LeadsTable leads={filteredLeads} />

      <CreateLeadModal 
        open={createLeadOpen} 
        onOpenChange={setCreateLeadOpen}
        defaultFolderId={folderId}
      />

      {folder && (
        <EditFolderModal
          open={editFolderOpen}
          onOpenChange={setEditFolderOpen}
          folder={folder}
          onSuccess={() => {
            // Folder list will automatically refresh due to useEffect in useFolders
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteFolder}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
