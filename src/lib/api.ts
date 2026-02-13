// API service layer for Firebase operations
import { 
  COLLECTIONS,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  getDocuments,
  buildLeadsQuery,
  buildTasksQuery,
  dateToTimestamp
} from './firestore';
import { where } from 'firebase/firestore';
import type { Lead, Task, ActivityLog, Folder, ChatMessage, Notification, LeadAssignment, User, OrganizationInvite, LeadAttachment } from '@/types';

// Leads API
export const leadsAPI = {
  async create(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'>) {
    const leadData = {
      ...lead,
      nextFollowUpDate: dateToTimestamp(lead.nextFollowUpDate),
      convertedAt: dateToTimestamp(lead.convertedAt),
      cancelledAt: dateToTimestamp(lead.cancelledAt),
      lastActivityAt: new Date(),
    };
    return createDocument(COLLECTIONS.LEADS, leadData);
  },

  async update(id: string, data: Partial<Lead>) {
    // Build updateData, removing any undefined values and converting dates properly
    const updateData: any = {
      lastActivityAt: new Date(),
    };

    // Only add fields that are explicitly passed in data
    Object.keys(data).forEach(key => {
      if (key === 'nextFollowUpDate' || key === 'convertedAt' || key === 'cancelledAt') {
        const value = data[key as keyof typeof data];
        if (value !== undefined) {
          updateData[key] = value ? dateToTimestamp(value as Date) : null;
        }
      } else if (data[key as keyof typeof data] !== undefined) {
        updateData[key] = data[key as keyof typeof data];
      }
    });

    return updateDocument(COLLECTIONS.LEADS, id, updateData);
  },

  async delete(id: string) {
    return deleteDocument(COLLECTIONS.LEADS, id);
  },

  async getById(id: string) {
    return getDocument<Lead>(COLLECTIONS.LEADS, id);
  },

  async getByFolder(folderId: string, organizationId: string) {
    const query = buildLeadsQuery({ folderId, organizationId });
    return getDocuments<Lead>(COLLECTIONS.LEADS, query);
  },

  async getAll(organizationId: string) {
    const query = buildLeadsQuery({ organizationId });
    return getDocuments<Lead>(COLLECTIONS.LEADS, query);
  },
};

// Tasks API
export const tasksAPI = {
  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const taskData = {
      ...task,
      dueDate: dateToTimestamp(task.dueDate),
    };
    return createDocument(COLLECTIONS.TASKS, taskData);
  },

  async update(id: string, data: Partial<Task>) {
    type UpdateData = Partial<Omit<Task, 'dueDate'>> & { dueDate?: ReturnType<typeof dateToTimestamp> | null };
    const updateData: UpdateData = {
      ...Object.fromEntries(Object.entries(data || {}).filter(([key]) => key !== 'dueDate')),
    };

    if ('dueDate' in data && data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? dateToTimestamp(data.dueDate) : null;
    }
    return updateDocument(COLLECTIONS.TASKS, id, updateData as unknown as Partial<Task>);
  },

  async delete(id: string) {
    return deleteDocument(COLLECTIONS.TASKS, id);
  },

  async getByLead(leadId: string) {
    const query = buildTasksQuery({ leadId });
    return getDocuments<Task>(COLLECTIONS.TASKS, query);
  },

  async getByAssignee(assignedToId: string) {
    const query = buildTasksQuery({ assignedToId });
    return getDocuments<Task>(COLLECTIONS.TASKS, query);
  },

  async getByOrganization(organizationId: string) {
    const query = buildTasksQuery({ organizationId });
    return getDocuments<Task>(COLLECTIONS.TASKS, query);
  },
};

// Activities API
export const activitiesAPI = {
  async create(activity: Omit<ActivityLog, 'id' | 'createdAt'>) {
    return createDocument(COLLECTIONS.ACTIVITIES, activity);
  },

  async getByLead(leadId: string) {
    const query = [
      // where clause will be added in buildActivitiesQuery
    ];
    return getDocuments<ActivityLog>(COLLECTIONS.ACTIVITIES, query);
  },

  async getByOrganization(organizationId: string) {
    const query = [where('organizationId', '==', organizationId)];
    return getDocuments<ActivityLog>(COLLECTIONS.ACTIVITIES, query);
  },

  async logActivity(
    leadId: string,
    actorId: string,
    actorName: string,
    type: string,
    description: string,
    organizationId: string,
    metadata: any = {}
  ) {
    return this.create({
      leadId,
      actorId,
      actorName,
      type,
      description,
      organizationId,
      metadata,
    });
  },
};

// Folders API
export const foldersAPI = {
  async create(folder: Omit<Folder, 'id' | 'createdAt' | 'leadsCount'>) {
    const folderData = {
      ...folder,
      description: folder.description ?? '',
      venue: folder.venue ?? '',
      eventStartDate: dateToTimestamp(folder.eventStartDate),
      eventEndDate: dateToTimestamp(folder.eventEndDate),
      leadsCount: 0,
    };

    // Strip undefined to avoid Firestore invalid data errors
    const cleaned = Object.fromEntries(
      Object.entries(folderData).filter(([, v]) => v !== undefined)
    );

    return createDocument(COLLECTIONS.FOLDERS, cleaned as unknown as Folder);
  },

  async update(id: string, data: Partial<Folder>) {
    const updateData = {
      ...data,
      eventStartDate: data.eventStartDate ? dateToTimestamp(data.eventStartDate) : undefined,
      eventEndDate: data.eventEndDate ? dateToTimestamp(data.eventEndDate) : undefined,
    };
    return updateDocument(COLLECTIONS.FOLDERS, id, updateData);
  },

  async delete(id: string) {
    return deleteDocument(COLLECTIONS.FOLDERS, id);
  },

  async getAll(organizationId: string) {
    return getDocuments<Folder>(COLLECTIONS.FOLDERS, [
      where('organizationId', '==', organizationId)
    ]);
  },

  async incrementLeadCount(id: string) {
    const folder = await getDocument<Folder>(COLLECTIONS.FOLDERS, id);
    if (folder) {
      await updateDocument(COLLECTIONS.FOLDERS, id, {
        leadsCount: (folder.leadsCount || 0) + 1,
      });
    }
  },

  async decrementLeadCount(id: string) {
    const folder = await getDocument<Folder>(COLLECTIONS.FOLDERS, id);
    if (folder && folder.leadsCount > 0) {
      await updateDocument(COLLECTIONS.FOLDERS, id, {
        leadsCount: folder.leadsCount - 1,
      });
    }
  },
};

// Chat Messages API
export const chatAPI = {
  async create(message: Omit<ChatMessage, 'id' | 'createdAt'>) {
    return createDocument(COLLECTIONS.CHAT_MESSAGES, {
      ...message,
      organizationId: (message as any).organizationId,
      read: false,
      readBy: [],
    });
  },

  async getByLead(leadId: string) {
    return getDocuments<ChatMessage>(COLLECTIONS.CHAT_MESSAGES, [
      where('leadId', '==', leadId)
    ]);
  },

  async markMessagesAsRead(leadId: string, userId: string) {
    const messages = await this.getByLead(leadId);
    const unreadMessages = messages.filter(msg => 
      msg.senderId !== userId && (!msg.readBy || !msg.readBy.includes(userId))
    );
    
    await Promise.all(
      unreadMessages.map(msg => 
        updateDocument(COLLECTIONS.CHAT_MESSAGES, msg.id, {
          read: true,
          readBy: [...(msg.readBy || []), userId],
        })
      )
    );
  },
};

// Notifications API
export const notificationsAPI = {
  async create(notification: Omit<Notification, 'id' | 'createdAt'>) {
    return createDocument(COLLECTIONS.NOTIFICATIONS, notification);
  },

  async markAsRead(id: string) {
    return updateDocument(COLLECTIONS.NOTIFICATIONS, id, { read: true });
  },

  async markAllAsRead(userId: string) {
    const notifications = await this.getByUser(userId);
    const unreadNotifications = notifications.filter(n => !n.read);
    
    await Promise.all(
      unreadNotifications.map(n => this.markAsRead(n.id))
    );
  },

  async delete(id: string) {
    return deleteDocument(COLLECTIONS.NOTIFICATIONS, id);
  },

  async getByUser(userId: string) {
    return getDocuments<Notification>(COLLECTIONS.NOTIFICATIONS, [where('userId', '==', userId)]);
  },
};

// Users API
export const usersAPI = {
  async getAll(organizationId?: string) {
    const constraints = organizationId ? [where('organizationId', '==', organizationId)] : [];
    return getDocuments<User>(COLLECTIONS.USERS, constraints);
  },

  async getUnassigned() {
    // Firestore's where('organizationId', '==', null) won't match documents where the field is missing
    // So we get all users and filter in code to catch null, undefined, and empty string
    const allUsers = await getDocuments<User>(COLLECTIONS.USERS, []);
    return allUsers.filter(user => 
      !user.organizationId || 
      user.organizationId === null || 
      user.organizationId === undefined ||
      user.organizationId === ''
    );
  },

  async getByEmail(email: string) {
    const constraints = [where('email', '==', email.toLowerCase())];
    const results = await getDocuments<User>(COLLECTIONS.USERS, constraints);
    return results[0] || null;
  },

  async update(id: string, data: Partial<User>) {
    return updateDocument(COLLECTIONS.USERS, id, data);
  },
};

// Invites API
export const invitesAPI = {
  async create(invite: Omit<OrganizationInvite, 'id' | 'createdAt' | 'respondedAt' | 'status'>) {
    const payload = {
      ...invite,
      status: 'pending' as const,
    };
    return createDocument(COLLECTIONS.INVITES, payload);
  },

  async accept(inviteId: string) {
    return updateDocument<OrganizationInvite>(COLLECTIONS.INVITES, inviteId, {
      status: 'accepted',
      respondedAt: new Date(),
    });
  },

  async reject(inviteId: string) {
    return updateDocument<OrganizationInvite>(COLLECTIONS.INVITES, inviteId, {
      status: 'rejected',
      respondedAt: new Date(),
    });
  },

  async getByOrganization(organizationId: string) {
    return getDocuments<OrganizationInvite>(COLLECTIONS.INVITES, [where('organizationId', '==', organizationId)]);
  },

  async getByEmail(email: string) {
    return getDocuments<OrganizationInvite>(COLLECTIONS.INVITES, [where('email', '==', email.toLowerCase())]);
  },
};

// Lead Assignments API
export const assignmentsAPI = {
  async create(assignment: Omit<LeadAssignment, 'id' | 'assignedAt'>) {
    return createDocument(COLLECTIONS.LEAD_ASSIGNMENTS, assignment);
  },

  async delete(id: string) {
    return deleteDocument(COLLECTIONS.LEAD_ASSIGNMENTS, id);
  },

  async getByLead(leadId: string) {
    return getDocuments<LeadAssignment>(COLLECTIONS.LEAD_ASSIGNMENTS, []);
  },
};

// Organizations API
export const organizationsAPI = {
  async create(name: string) {
    return createDocument(COLLECTIONS.ORGANIZATIONS, { name });
  },

  async getAll() {
    return getDocuments<{ id: string; name: string }>(COLLECTIONS.ORGANIZATIONS, []);
  },
};

// Broadcast Messages API (replaced adminChat)
// Using real-time listeners directly in BroadcastMessages component

// Lead Attachments API
export const attachmentsAPI = {
  async create(attachment: Omit<LeadAttachment, 'id' | 'createdAt'>) {
    return createDocument(COLLECTIONS.LEAD_ATTACHMENTS, attachment);
  },

  async delete(id: string) {
    return deleteDocument(COLLECTIONS.LEAD_ATTACHMENTS, id);
  },

  async getByLead(leadId: string, organizationId: string) {
    return getDocuments<LeadAttachment>(COLLECTIONS.LEAD_ATTACHMENTS, [
      where('leadId', '==', leadId),
      where('organizationId', '==', organizationId),
    ]);
  },
};
