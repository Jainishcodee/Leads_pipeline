// Mock data for Mocha Leads MVP
import type { 
  Organization, 
  User, 
  Folder,
  Notification,
} from '@/types';

export const mockOrganization: Organization = {
  id: 'org_1',
  name: 'Spice Masters FMCG',
  logo: undefined,
  createdAt: new Date('2024-01-01'),
};

export const mockUsers: User[] = [
  {
    id: 'user_1',
    email: 'jainishshah356@gmail.com',
    name: 'Jainish Shah',
    role: 'admin',
    organizationId: 'org_1',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user_2',
    email: 'rahul@spicemasters.com',
    name: 'Rahul Sharma',
    role: 'member',
    organizationId: 'org_1',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user_3',
    email: 'akash@spicemasters.com',
    name: 'Akash Patel',
    role: 'member',
    organizationId: 'org_1',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user_4',
    email: 'raj@spicemasters.com',
    name: 'Raj Kumar',
    role: 'member',
    organizationId: 'org_1',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'user_5',
    email: 'ceo@spicemasters.com',
    name: 'Vikram Singh (CEO)',
    role: 'observer',
    organizationId: 'org_1',
    createdAt: new Date('2024-01-01'),
  },
];

export const mockFolders: Folder[] = [
  {
    id: 'folder_1',
    name: 'Gulf Food 2024',
    description: 'Leads from Gulf Food Exhibition Dubai',
    eventStartDate: new Date('2024-02-19'),
    eventEndDate: new Date('2024-02-23'),
    venue: 'Dubai World Trade Centre',
    organizationId: 'org_1',
    createdById: 'user_1',
    leadsCount: 45,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'folder_2',
    name: 'Anuga 2024',
    description: 'Leads from Anuga Food Fair Cologne',
    eventStartDate: new Date('2024-10-05'),
    eventEndDate: new Date('2024-10-09'),
    venue: 'Koelnmesse, Cologne',
    organizationId: 'org_1',
    createdById: 'user_1',
    leadsCount: 32,
    createdAt: new Date('2024-09-15'),
  },
  {
    id: 'folder_3',
    name: 'Telephonic Leads',
    description: 'Inbound calls and inquiries',
    organizationId: 'org_1',
    createdById: 'user_2',
    leadsCount: 18,
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'folder_4',
    name: 'WhatsApp Inquiries',
    description: 'Leads from WhatsApp business',
    organizationId: 'org_1',
    createdById: 'user_3',
    leadsCount: 24,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'folder_5',
    name: 'Distributor Referrals',
    description: 'Leads referred by existing distributors',
    organizationId: 'org_1',
    createdById: 'user_4',
    leadsCount: 12,
    createdAt: new Date('2024-04-01'),
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif_1',
    userId: 'user_2',
    type: 'assignment',
    title: 'New Lead Assigned',
    message: 'You have been assigned to "Al Rashid Trading LLC"',
    leadId: 'lead_1',
    read: false,
    createdAt: new Date(),
  },
  {
    id: 'notif_2',
    userId: 'user_3',
    type: 'mention',
    title: 'You were mentioned',
    message: 'Rahul Sharma mentioned you in Al Rashid Trading LLC chat',
    leadId: 'lead_1',
    read: false,
    createdAt: new Date(),
  },
  {
    id: 'notif_3',
    userId: 'user_4',
    type: 'due_soon',
    title: 'Task Due Tomorrow',
    message: 'Prepare commercial proposal is due tomorrow',
    leadId: 'lead_1',
    read: true,
    createdAt: new Date(Date.now() - 86400000),
  },
];

// Current user for existing pages (Sidebar.tsx, Team.tsx)
// NOTE: This is a fallback; prefer using auth.user from AuthContext when available
export const currentUser = mockUsers[1]; // Rahul Sharma
