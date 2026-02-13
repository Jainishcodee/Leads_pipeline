import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Calendar,
  ArrowUpDown,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { CreateLeadModal } from './CreateLeadModal';
import { cn } from '@/lib/utils';
import { timestampToDate } from '@/lib/firestore';
import { useAuth } from '@/auth/AuthContext';
import { leadsAPI } from '@/lib/api';
import { toast } from 'sonner';
import type { Lead } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

interface LeadsTableProps {
  leads: Lead[];
  showFolder?: boolean;
}

export function LeadsTable({ leads, showFolder = false }: LeadsTableProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const basePath = profile?.role === 'admin' ? '/admin' : '/dashboard';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  
  const [sortField, setSortField] = useState<'lastActivityAt' | 'createdAt' | 'nextFollowUpDate'>('lastActivityAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    
    try {
      setIsDeleting(true);
      await leadsAPI.delete(leadToDelete.id);
      toast.success('Lead deleted successfully');
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (lead: Lead, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const openEditModal = (lead: Lead, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLeadToEdit(lead);
    setEditModalOpen(true);
  };

  const toDate = (value: Lead[typeof sortField] | null | undefined) =>
    value ? timestampToDate(value) : null;

  const sortedLeads = [...leads].sort((a, b) => {
    const aVal = toDate(a[sortField]);
    const bVal = toDate(b[sortField]);
    if (!aVal) return 1;
    if (!bVal) return -1;
    const comparison = aVal.getTime() - bVal.getTime();
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Mobile card view
  const MobileLeadCard = ({ lead }: { lead: Lead }) => (
    <div 
      className="card-premium p-4 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => navigate(`${basePath}/leads/${lead.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
              {lead.companyName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">{lead.companyName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {lead.location}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
      
      <div className="flex items-center gap-2 mt-3">
        <StatusBadge status={lead.status} />
        <PriorityBadge priority={lead.priority} />
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{lead.managerName}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lead.nextFollowUpDate && (
            <span className={cn(
              'flex items-center gap-1',
              toDate(lead.nextFollowUpDate) && toDate(lead.nextFollowUpDate)! < new Date() && 'text-destructive'
            )}>
              <Calendar className="w-3 h-3" />
              {format(toDate(lead.nextFollowUpDate)!, 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {sortedLeads.map((lead) => (
          <MobileLeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="card-premium p-12 text-center">
            <p className="text-muted-foreground">No leads found</p>
          </div>
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-[280px]">Company</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Priority</th>
                {showFolder && <th>Folder</th>}
                <th>
                  <button 
                    onClick={() => toggleSort('nextFollowUpDate')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Follow-up
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th>
                  <button 
                    onClick={() => toggleSort('lastActivityAt')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Last Activity
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="cursor-pointer"
                  onClick={() => navigate(`${basePath}/leads/${lead.id}`)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
                          {lead.companyName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{lead.companyName}</p>
                        <p className="text-xs text-muted-foreground">{lead.location}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="text-sm font-medium">{lead.managerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a 
                          href={`tel:${lead.managerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {lead.managerPhone}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={lead.priority} />
                  </td>
                  {showFolder && (
                    <td>
                      <span className="text-sm text-muted-foreground">{lead.folderName}</span>
                    </td>
                  )}
                  <td>
                    {lead.nextFollowUpDate ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className={cn(
                          toDate(lead.nextFollowUpDate) && toDate(lead.nextFollowUpDate)! < new Date() && 'text-destructive font-medium'
                        )}>
                          {format(toDate(lead.nextFollowUpDate)!, 'MMM d')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    <span className="text-sm text-muted-foreground">
                      {lead.lastActivityAt
                        ? formatDistanceToNow(timestampToDate(lead.lastActivityAt), { addSuffix: true })
                        : '—'}
                    </span>
                  </td>
                  <td>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${basePath}/leads/${lead.id}`);
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => openEditModal(lead, e)}>
                            Edit Lead
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => openDeleteDialog(lead, e)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {leads.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No leads found</p>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{leadToDelete?.companyName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteLead}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Lead Modal */}
      {leadToEdit && (
        <CreateLeadModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          editingLead={leadToEdit}
          onSuccess={() => {
            setEditModalOpen(false);
            setLeadToEdit(null);
          }}
        />
      )}
    </>
  );
}
