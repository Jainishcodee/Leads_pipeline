import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  MoreHorizontal,
  Tag,
  DollarSign,
  FileText,
  Users,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { StatusBadge } from '@/components/leads/StatusBadge';
import { PriorityBadge } from '@/components/leads/PriorityBadge';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ActivityLog } from '@/types';
import { useLead, useLeadTasks, useLeadActivities, useLeadAssignments, useLeadChat, useUsers } from '@/hooks/useFirebaseData';
import { leadsAPI, tasksAPI, activitiesAPI, assignmentsAPI, chatAPI } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';
import { timestampToDate } from '@/lib/firestore';

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');  
  const [followUpDate, setFollowUpDate] = useState('');  
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigneeRole, setAssigneeRole] = useState('');  
  
  const { lead, loading: leadLoading, refetch: refetchLead } = useLead(leadId);
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useLeadTasks(leadId);
  const { activities, loading: activitiesLoading, refetch: refetchActivities } = useLeadActivities(leadId);
  const { assignments, loading: assignmentsLoading, refetch: refetchAssignments } = useLeadAssignments(leadId);
  const organizationId = 'org_1';
  const { users, loading: usersLoading } = useUsers(organizationId);
  const { messages, refetch: refetchMessages } = useLeadChat(leadId);
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    createdAt: Date;
  }>>([]);
  const [activeAttachment, setActiveAttachment] = useState<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    createdAt: Date;
  } | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);

  const toDate = (value: unknown) => (value ? timestampToDate(value) : null);
  
  const userById = new Map(users.map((member) => [member.id, member]));
  const teamOptions = users;

  const getTaskStatusLabel = (status: string) => {
    if (status === 'done') return 'Completed';
    if (status === 'in_progress') return 'Ongoing';
    return 'Pending';
  };
  
  const handleTaskStatusChange = (taskId: string, newStatus: string, taskTitle: string) => {
    // Find the task to get the old status
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    const label = getTaskStatusLabel(newStatus);
    
    // Update the task status
    tasksAPI.update(taskId, { status: newStatus as any })
      .then(() => {
        refetchTasks();
        toast.success(`Task marked as ${label}`);
        
        // Log activity
        if (leadId && user) {
          activitiesAPI.logActivity(
            leadId,
            user.uid,
            user.email?.split('@')[0] || 'User',
            'task_update',
            `Updated task "${taskTitle}" status from ${getTaskStatusLabel(oldStatus)} to ${label}`,
            'org_1',
            { taskId, oldStatus, newStatus }
          ).then(() => refetchActivities());
        }
      })
      .catch((error) => {
        console.error('Error updating task:', error);
        toast.error('Failed to update task');
      });
  };

  const handleConvert = async () => {
    if (!leadId || !user) return;
    
    try {
      await leadsAPI.update(leadId, {
        status: 'converted',
        convertedAt: new Date(),
      });
      
      await activitiesAPI.logActivity(
        leadId,
        user.uid,
        user.email?.split('@')[0] || 'User',
        'status_change',
        'Converted lead to customer',
        'org_1',
        { newStatus: 'converted' }
      );
      
      toast.success('Lead converted successfully!');
      setShowConvertDialog(false);
      refetchLead();
      refetchActivities();
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('Failed to convert lead');
    }
  };

  const handleCancel = async () => {
    if (!leadId || !user || !cancellationReason) return;
    
    try {
      await leadsAPI.update(leadId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason,
      });
      
      await activitiesAPI.logActivity(
        leadId,
        user.uid,
        user.email?.split('@')[0] || 'User',
        'status_change',
        `Cancelled lead: ${cancellationReason}`,
        'org_1',
        { newStatus: 'cancelled', reason: cancellationReason }
      );
      
      toast.success('Lead cancelled');
      setShowCancelDialog(false);
      setCancellationReason('');
      refetchLead();
      refetchActivities();
    } catch (error) {
      console.error('Error cancelling lead:', error);
      toast.error('Failed to cancel lead');
    }
  };

  const handleSetFollowUp = async () => {
    if (!leadId || !user || !followUpDate) return;
    
    try {
      await leadsAPI.update(leadId, {
        nextFollowUpDate: new Date(followUpDate),
      });
      
      await activitiesAPI.logActivity(
        leadId,
        user.uid,
        user.email?.split('@')[0] || 'User',
        'follow_up_scheduled',
        `Scheduled follow-up for ${format(new Date(followUpDate), 'MMM d, yyyy')}`,
        'org_1',
        { followUpDate }
      );
      
      toast.success('Follow-up scheduled');
      setShowFollowUpDialog(false);
      setFollowUpDate('');
      refetchLead();
      refetchActivities();
    } catch (error) {
      console.error('Error setting follow-up:', error);
      toast.error('Failed to set follow-up');
    }
  };

  const handleCreateTask = async () => {
    if (!leadId || !user || !newTaskTitle) return;
    
    try {
      await tasksAPI.create({
        leadId,
        assignedToId: user.uid,
        assignedToName: user.email?.split('@')[0] || 'Unknown',
        title: newTaskTitle,
        description: newTaskDescription || null,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate) : null,
        status: 'todo',
        priority: newTaskPriority,
        checklist: [],
      });
      
      await activitiesAPI.logActivity(
        leadId,
        user.uid,
        user.email?.split('@')[0] || 'User',
        'task_created',
        `Created task: ${newTaskTitle}`,
        'org_1',
        { taskTitle: newTaskTitle }
      );
      
      toast.success('Task created successfully');
      setShowTaskDialog(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskPriority('medium');
      refetchTasks();
      refetchActivities();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleAssign = async () => {
    if (!leadId || !user || !selectedAssignee || !assigneeRole) return;
    
    try {
      const assignee = userById.get(selectedAssignee);
      if (!assignee) return;
      
      await assignmentsAPI.create({
        leadId,
        userId: selectedAssignee,
        userName: assignee.name,
        roleInLead: assigneeRole,
      });
      
      await activitiesAPI.logActivity(
        leadId,
        user.uid,
        user.email?.split('@')[0] || 'User',
        'team_assigned',
        `Assigned ${assignee.name} as ${assigneeRole}`,
        'org_1',
        { assigneeId: selectedAssignee, assigneeName: assignee.name, role: assigneeRole }
      );
      
      toast.success(`Assigned ${assignee.name} to lead`);
      setShowAssignDialog(false);
      setSelectedAssignee('');
      setAssigneeRole('');
      refetchAssignments();
      refetchActivities();
    } catch (error) {
      console.error('Error assigning team member:', error);
      toast.error('Failed to assign team member');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, userName: string) => {
    try {
      await assignmentsAPI.delete(assignmentId);
      toast.success(`Removed ${userName} from lead`);
      refetchAssignments();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const createdAt = new Date();
    const newAttachments = files.map((file, index) => ({
      id: `file_${createdAt.getTime()}_${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type || 'application/octet-stream',
      size: file.size,
      createdAt,
    }));

    setAttachments((prev) => [...newAttachments, ...prev]);
    event.target.value = '';
  };

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((file) => URL.revokeObjectURL(file.url));
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  if (leadLoading || tasksLoading || activitiesLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Lead not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className={cn(
        'flex-1 overflow-y-auto transition-all duration-300',
        chatOpen ? 'lg:mr-96' : ''
      )}>
        <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="mt-0.5 flex-shrink-0 h-8 w-8 md:h-10 md:w-10"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg md:text-2xl font-semibold truncate">{lead.companyName}</h1>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={lead.status} />
                    <PriorityBadge priority={lead.priority} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs md:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                    {lead.location}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{lead.folderName}</span>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">
                    Created{' '}
                    {toDate(lead.createdAt)
                      ? formatDistanceToNow(toDate(lead.createdAt)!, { addSuffix: true })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons - responsive layout */}
            <div className="flex items-center gap-2 flex-wrap">
              {lead.status !== 'converted' && lead.status !== 'cancelled' && (
                <>
                  <Button 
                    className="bg-status-converted hover:bg-status-converted/90 text-primary-foreground text-xs md:text-sm"
                    size="sm"
                    onClick={() => setShowConvertDialog(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Convert</span>
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive/10 text-xs md:text-sm"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditMode(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Assign Team
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowTaskDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete Lead</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8"
              onClick={() => setShowFollowUpDialog(true)}
            >
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              Follow-up
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8"
              onClick={() => setShowTaskDialog(true)}
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              Task
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8"
              onClick={() => setShowAssignDialog(true)}
            >
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              Assign
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8"
              onClick={() => toast.info('AI suggestions coming soon!')}
            >
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
              AI
            </Button>
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Lead Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Company Info */}
              <div className="card-premium p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-mocha-500" />
                    Company
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="mt-0.5">{lead.completeAddress}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <a href={`mailto:${lead.emailId}`} className="text-primary hover:underline mt-0.5 block">
                      {lead.emailId}
                    </a>
                  </div>
                  <div>
                    <p className="text-muted-foreground">WhatsApp</p>
                    <a href={`https://wa.me/${lead.whatsappNumber.replace(/\+/g, '')}`} className="text-primary hover:underline mt-0.5 block">
                      {lead.whatsappNumber}
                    </a>
                  </div>
                </div>
              </div>

              {/* Manager Info */}
              <div className="card-premium p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-mocha-500" />
                    Contact Person
                  </h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-mocha-100 text-mocha-700">
                      {lead.managerName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{lead.managerName}</p>
                    <p className="text-sm text-muted-foreground">{lead.managerEmail}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`tel:${lead.managerPhone}`}>
                      <Phone className="w-4 h-4 mr-1.5" />
                      Call
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`https://wa.me/${lead.managerWhatsapp.replace(/\+/g, '')}`}>
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                      WhatsApp
                    </a>
                  </Button>
                </div>
              </div>

              {/* Interest & Tags */}
              <div className="card-premium p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-mocha-500" />
                  Interest & Tags
                </h3>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Products Interested</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.interest.map((item, i) => (
                      <Badge key={i} variant="secondary" className="bg-mocha-100 text-mocha-700">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {lead.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, i) => (
                        <Badge key={i} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {lead.valueEstimate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                    <p className="text-lg font-semibold text-mocha-600 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {lead.valueEstimate.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Team Assignments */}
              <div className="card-premium p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-mocha-500" />
                    Assigned Team
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAssignDialog(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
                          {(userById.get(assignment.userId)?.name || assignment.userName || 'U')
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {userById.get(assignment.userId)?.name || assignment.userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {userById.get(assignment.userId)?.email || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{assignment.roleInLead}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveAssignment(
                            assignment.id,
                            userById.get(assignment.userId)?.name || assignment.userName || 'Member'
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Tasks & Activity */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="w-full justify-start bg-muted/50 p-1">
                  <TabsTrigger value="tasks" className="flex-1 max-w-32">Tasks</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1 max-w-32">Activity</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1 max-w-32">Notes</TabsTrigger>
                  <TabsTrigger value="files" className="flex-1 max-w-32">Files</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="mt-4">
                  <div className="space-y-3">
                    {tasks.length === 0 ? (
                      <div className="card-premium p-8 text-center">
                        <p className="text-muted-foreground">No tasks yet</p>
                        <Button className="btn-mocha mt-4">
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Task
                        </Button>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="card-premium p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn(
                                  'font-medium',
                                  task.status === 'done' && 'line-through text-muted-foreground'
                                )}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={task.status}
                                    onValueChange={(value) => {
                                      handleTaskStatusChange(task.id, value, task.title);
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todo">Pending</SelectItem>
                                      <SelectItem value="in_progress">Ongoing</SelectItem>
                                      <SelectItem value="done">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <PriorityBadge priority={task.priority} />
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {userById.get(task.assignedToId)?.name || task.assignedToName || 'Unassigned'}
                                  {userById.get(task.assignedToId)?.role && (
                                    <span className="text-[10px] uppercase tracking-wide">
                                      · {userById.get(task.assignedToId)?.role}
                                    </span>
                                  )}
                                </span>
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(timestampToDate(task.dueDate), 'MMM d')}
                                  </span>
                                )}
                              </div>
                              {task.checklist && task.checklist.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  {task.checklist.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 text-sm">
                                      <div className={cn(
                                        'w-4 h-4 rounded border flex items-center justify-center',
                                        item.completed 
                                          ? 'bg-mocha-500 border-mocha-500' 
                                          : 'border-mocha-300'
                                      )}>
                                        {item.completed && (
                                          <CheckCircle className="w-3 h-3 text-white" />
                                        )}
                                      </div>
                                      <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <div className="card-premium p-4">
                    {activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-10 h-10 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">No activities yet</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Base timeline - light/muted */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                        
                        {/* Highlighted timeline - blue/active path */}
                        {activities.length > 0 && (
                          <div 
                            className="absolute left-4 w-0.5 bg-mocha-700 transition-all duration-300"
                            style={{
                              top: 0,
                              height: `${(activities.length * 1.5 * 24) + 12}px`
                            }}
                          />
                        )}
                        
                        <div className="space-y-6 relative z-10">
                          {activities.map((activity, index) => (
                            <div 
                              key={activity.id} 
                              className="relative pl-10 group"
                            >
                              {/* Circle marker */}
                              <div className={cn(
                                "absolute left-1.5 w-5 h-5 rounded-full border-2 transition-all duration-300",
                                index === 0 
                                  ? "bg-mocha-300 border-mocha-700 shadow-lg shadow-mocha-700/40" 
                                  : "bg-mocha-200 border-mocha-600 hover:border-mocha-700"
                              )} />
                              
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{activity.actorName}</span>
                                  {' '}
                                  <span className="text-muted-foreground">{activity.description}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(timestampToDate(activity.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="card-premium p-5">
                    {lead.notes ? (
                      <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">No notes yet</p>
                        <Button variant="outline" className="mt-4">
                          Add Note
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-4">
                  <div className="space-y-4">
                    <div className="card-premium p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Files</h3>
                          <p className="text-sm text-muted-foreground">
                            Upload any file type. Files open in a preview pop-up.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload Files
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFilesSelected}
                        />
                      </div>
                    </div>

                    {attachments.length === 0 ? (
                      <div className="card-premium p-8 text-center">
                        <p className="text-muted-foreground">No files attached</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attachments.map((file) => (
                          <div key={file.id} className="card-premium p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{file.name}</p>
                                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>{file.type || 'Unknown type'}</span>
                                  <span>{formatFileSize(file.size)}</span>
                                  <span>
                                    {format(file.createdAt, 'MMM d, yyyy • h:mm a')}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveAttachment(file)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Panel - full screen on mobile */}
      {chatOpen && (
        <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-96 z-50 md:top-16">
          <ChatPanel 
            messages={messages}
            leadId={leadId!}
            onClose={() => setChatOpen(false)}
            onSendMessage={async (msg) => {
              if (!leadId || !user) return;

              try {
                await chatAPI.create({
                  leadId,
                  senderId: user.uid,
                  senderName: user.displayName || user.email?.split('@')[0] || 'User',
                  message: msg,
                });
                await refetchMessages();
              } catch (error) {
                console.error('Error sending message:', error);
                toast.error('Failed to send message');
              }
            }}
          />
        </div>
      )}

      {/* Chat FAB */}
      <Button
        className={cn(
          'fixed bottom-4 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg z-40',
          'bg-primary hover:bg-primary/90 transition-all',
          chatOpen && 'hidden'
        )}
        onClick={() => setChatOpen(!chatOpen)}
      >
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </Button>

      <Dialog open={!!activeAttachment} onOpenChange={(open) => !open && setActiveAttachment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
          </DialogHeader>
          {activeAttachment && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{activeAttachment.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeAttachment.type || 'Unknown type'} • {formatFileSize(activeAttachment.size)} •{' '}
                    {format(activeAttachment.createdAt, 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                {activeAttachment.type.startsWith('image/') ? (
                  <img
                    src={activeAttachment.url}
                    alt={activeAttachment.name}
                    className="max-h-[60vh] w-full object-contain"
                  />
                ) : activeAttachment.type === 'application/pdf' ? (
                  <iframe
                    src={activeAttachment.url}
                    title={activeAttachment.name}
                    className="h-[60vh] w-full"
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
                    <p>This file type does not support inline preview.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to convert this lead to a customer? This action will mark the lead as successfully converted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvert} className="bg-status-converted hover:bg-status-converted/90">
                Convert Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">Reason for Cancellation *</Label>
              <Textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter the reason for cancelling this lead..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="destructive"
                disabled={!cancellationReason}
              >
                Cancel Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="follow-up-date">Follow-up Date *</Label>
              <Input
                id="follow-up-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSetFollowUp}
                disabled={!followUpDate}
              >
                Schedule Follow-up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g., Send follow-up email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Add task details..."
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as any)}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTask}
                disabled={!newTaskTitle}
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Team Member *</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading team...
                    </SelectItem>
                  ) : (
                    teamOptions.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role in Lead *</Label>
              <Input
                id="role"
                value={assigneeRole}
                onChange={(e) => setAssigneeRole(e.target.value)}
                placeholder="e.g., Sales Representative, Account Manager"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssign}
                disabled={!selectedAssignee || !assigneeRole}
              >
                Assign Team Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
