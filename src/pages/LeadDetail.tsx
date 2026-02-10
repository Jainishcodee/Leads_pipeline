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
import { 
  mockLeads, 
  mockAssignments, 
  mockTasks, 
  mockChatMessages,
  mockActivities,
  mockUsers
} from '@/data/mockData';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ActivityLog } from '@/types';

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
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
  const [activities, setActivities] = useState<ActivityLog[]>(() => 
    mockActivities.filter(a => a.leadId === leadId)
  );
  const [tasks, setTasks] = useState(() => 
    mockTasks.filter(t => t.leadId === leadId)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);

  const lead = mockLeads.find(l => l.id === leadId);
  const assignments = mockAssignments.filter(a => a.leadId === leadId);
  const messages = mockChatMessages.filter(m => m.leadId === leadId);

  const userById = new Map(mockUsers.map(user => [user.id, user]));

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
    
    // Update the task status in state
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus as any } : t
    ));
    
    // Show toast notification
    toast.success(`Task marked as ${label}`);

    // Create new activity log entry
    const newActivity: ActivityLog = {
      id: `act_${Date.now()}_${Math.random()}`,
      leadId: leadId!,
      actorId: mockUsers[0]?.id || 'user_1',
      actorName: mockUsers[0]?.name || 'Current User',
      actionType: 'task_update',
      description: `Updated task "${taskTitle}" status from ${getTaskStatusLabel(oldStatus)} to ${label}`,
      beforeData: { taskId, status: oldStatus },
      afterData: { taskId, status: newStatus },
      createdAt: new Date(),
    };

    // Add the new activity to the beginning of the activities list
    setActivities(prev => {
      const updated = [newActivity, ...prev];
      console.log('Activity added:', newActivity);
      console.log('Total activities:', updated.length);
      return updated;
    });
  };

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

  const handleStatusChange = (status: string) => {
    toast.success(`Lead marked as ${status}`);
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
    };
  }, []);

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
                  <span className="hidden md:inline">Created {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
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
                    onClick={() => handleStatusChange('Converted')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Convert</span>
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive/10 text-xs md:text-sm"
                    onClick={() => handleStatusChange('Cancelled')}
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
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem>Assign Team</DropdownMenuItem>
                  <DropdownMenuItem>Add Task</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete Lead</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8">
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              Follow-up
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8">
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              Task
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              Assign
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0 text-xs md:text-sm h-8">
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
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
                          {assignment.userName?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{assignment.roleInLead}</p>
                      </div>
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
                                  {task.assignedToName}
                                  {userById.get(task.assignedToId)?.role && (
                                    <span className="text-[10px] uppercase tracking-wide">
                                      · {userById.get(task.assignedToId)?.role}
                                    </span>
                                  )}
                                </span>
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(task.dueDate), 'MMM d')}
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
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-6">
                          {activities.map((activity) => (
                            <div key={activity.id} className="relative pl-10">
                              <div className="absolute left-2 w-4 h-4 rounded-full bg-mocha-200 border-2 border-background" />
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{activity.actorName}</span>
                                  {' '}
                                  <span className="text-muted-foreground">{activity.description}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
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
            onSendMessage={(msg) => {
              toast.success('Message sent');
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
    </div>
  );
}
