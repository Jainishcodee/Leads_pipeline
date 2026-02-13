// Mocha Leads - Core Types

export type UserRole = 'superadmin' | 'admin' | 'member' | 'observer';

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'sample_requested' 
  | 'sample_sent' 
  | 'negotiation' 
  | 'converted' 
  | 'cancelled';

export type LeadPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskReviewStatus = 'pending' | 'approved' | 'changes_requested';

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  role: UserRole;
  organizationId: string | null;
  phone?: string;
  invitationStatus?: 'pending' | 'accepted' | 'rejected';
  invitedById?: string;
  invitedByEmail?: string;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  eventStartDate?: Date;
  eventEndDate?: Date;
  venue?: string;
  organizationId: string;
  createdById: string;
  leadsCount: number;
  createdAt: Date;
}

export interface Lead {
  id: string;
  // Required fields
  companyName: string;
  location: string;
  whatsappNumber: string;
  emailId: string;
  interest: string[];
  reference?: string;
  completeAddress: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  managerWhatsapp: string;
  
  // Additional fields
  status: LeadStatus;
  priority: LeadPriority;
  valueEstimate?: number;
  nextFollowUpDate?: Date;
  notes?: string;
  tags: string[];
  
  // Relations
  folderId: string;
  folderName?: string;
  organizationId: string;
  createdById: string;
  createdByName?: string;
  
  // Conversion/Cancellation
  convertedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  duplicateOfLeadId?: string;
  
  // Timestamps
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual/computed
  assignedTeam?: LeadAssignment[];
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  organizationId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  roleInLead: string; // e.g., "Welcome Mail", "Samples", "Financials", "Observer"
  createdAt: Date;
}

export interface Task {
  id: string;
  leadId: string;
  organizationId: string;
  assignedToId: string;
  assignedToName?: string;
  createdById?: string;
  createdByName?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: TaskStatus;
  priority: LeadPriority;
  checklist?: TaskChecklistItem[];
  reviewStatus?: TaskReviewStatus;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  leadId: string;
  organizationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  mentions?: string[]; // user IDs
  attachments?: Attachment[];
  isSystemMessage?: boolean;
  createdAt: Date;
  editedAt?: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ActivityLog {
  id: string;
  leadId: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  actionType: string;
  description: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: 'assignment' | 'task' | 'mention' | 'status_change' | 'due_soon' | 'invite' | 'invite_accept' | 'invite_reject';
  title: string;
  message: string;
  leadId?: string;
  read: boolean;
  createdAt: Date;
}

export interface OrganizationInvite {
  id: string;
  email: string;
  organizationId: string;
  organizationName?: string;
  invitedById: string;
  invitedByEmail?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  respondedAt?: Date;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  tasks: TaskTemplateItem[];
  createdAt: Date;
}

export interface TaskTemplateItem {
  title: string;
  description?: string;
  dueDaysFromCreation: number;
  assigneeRole?: string; // Role to auto-assign, e.g., "Samples Lead"
  priority: LeadPriority;
}

// Dashboard types
export interface DashboardKPIs {
  totalLeads: number;
  ongoingLeads: number;
  convertedLeads: number;
  cancelledLeads: number;
  successRate: number;
  avgTimeToConvert: number; // days
}

export interface FolderStats {
  folderId: string;
  folderName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface LeadAgeingBucket {
  label: string;
  count: number;
  percentage: number;
}
