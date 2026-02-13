// Firestore seed script (Admin SDK) - Run once to populate Firestore with initial data
// Usage: node scripts/seedFirebase.js (set GOOGLE_APPLICATION_CREDENTIALS or other ADC)

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIRESTORE_PROJECT_ID ||
  'mocha-cafe-e6fa0';

const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.SERVICE_ACCOUNT_PATH ||
  path.resolve(process.cwd(), 'serviceAccount.json');

// Prefer explicit service account JSON if available; fallback to ADC
const hasServiceAccountFile = fs.existsSync(SERVICE_ACCOUNT_PATH);
const credential = hasServiceAccountFile
  ? cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')))
  : applicationDefault();

// Initialize Admin SDK (uses Application Default Credentials)
if (!hasServiceAccountFile && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn(
    '⚠️  GOOGLE_APPLICATION_CREDENTIALS not set and serviceAccount.json not found; falling back to Application Default Credentials. If this fails, set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.'
  );
} else {
  console.log('🔑 Using service account credentials');
}

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(`ENV GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
}

console.log(`Resolved service account path: ${SERVICE_ACCOUNT_PATH} (exists: ${hasServiceAccountFile})`);
console.log(`Resolved projectId: ${PROJECT_ID}`);

initializeApp({ credential, projectId: PROJECT_ID });
const db = getFirestore();

// Helper to convert Date to Firestore Timestamp
const toTimestamp = (date) => Timestamp.fromDate(date);

const ORGANIZATION_ID = 'org_1';

// Seed data
const seedData = {
  organization: {
    id: ORGANIZATION_ID,
    name: 'Spice Masters FMCG',
    logo: null,
    createdAt: toTimestamp(new Date('2024-01-01'))
  },

  users: [
    {
      id: 'user_1',
      email: 'jainishshah356@gmail.com',
      name: 'Admin User',
      avatar: null,
      role: 'admin',
      organizationId: ORGANIZATION_ID,
      createdAt: toTimestamp(new Date('2024-01-01'))
    },
    {
      id: 'user_2',
      email: 'rahul@spicemasters.com',
      name: 'Rahul Sharma',
      avatar: null,
      role: 'member',
      organizationId: ORGANIZATION_ID,
      createdAt: toTimestamp(new Date('2024-01-15'))
    },
    {
      id: 'user_3',
      email: 'akash@spicemasters.com',
      name: 'Akash Patel',
      avatar: null,
      role: 'member',
      organizationId: ORGANIZATION_ID,
      createdAt: toTimestamp(new Date('2024-01-15'))
    },
    {
      id: 'user_4',
      email: 'raj@spicemasters.com',
      name: 'Raj Kumar',
      avatar: null,
      role: 'member',
      organizationId: ORGANIZATION_ID,
      createdAt: toTimestamp(new Date('2024-02-01'))
    }
  ],

  folders: [
    {
      id: 'folder_1',
      name: 'Gulf Food 2024',
      description: 'Leads from Gulf Food Exhibition Dubai',
      eventStartDate: toTimestamp(new Date('2024-02-19')),
      eventEndDate: toTimestamp(new Date('2024-02-23')),
      venue: 'Dubai World Trade Centre',
      organizationId: ORGANIZATION_ID,
      createdById: 'user_1',
      leadsCount: 45,
      createdAt: toTimestamp(new Date('2024-02-01'))
    },
    {
      id: 'folder_2',
      name: 'Anuga 2024',
      description: 'Leads from Anuga Food Fair Cologne',
      eventStartDate: toTimestamp(new Date('2024-10-05')),
      eventEndDate: toTimestamp(new Date('2024-10-09')),
      venue: 'Koelnmesse, Cologne',
      organizationId: ORGANIZATION_ID,
      createdById: 'user_1',
      leadsCount: 32,
      createdAt: toTimestamp(new Date('2024-09-15'))
    },
    {
      id: 'folder_3',
      name: 'Telephonic Leads',
      description: 'Inbound calls and inquiries',
      eventStartDate: null,
      eventEndDate: null,
      venue: null,
      organizationId: ORGANIZATION_ID,
      createdById: 'user_2',
      leadsCount: 18,
      createdAt: toTimestamp(new Date('2024-01-20'))
    }
  ],

  leads: [
    {
      id: 'lead_1',
      companyName: 'Al Rashid Trading LLC',
      location: 'Dubai, UAE',
      whatsappNumber: '+971501234567',
      emailId: 'imports@alrashid.ae',
      interest: ['Spices', 'Ready-to-Eat', 'Pickles'],
      reference: 'Gulf Food Exhibition',
      completeAddress: 'Al Quoz Industrial Area 3, Dubai, UAE',
      managerName: 'Ahmed Al Rashid',
      managerPhone: '+971501234567',
      managerEmail: 'ahmed@alrashid.ae',
      managerWhatsapp: '+971501234567',
      status: 'qualified',
      priority: 'high',
      valueEstimate: 150000,
      nextFollowUpDate: toTimestamp(new Date(Date.now() + 86400000)),
      notes: 'Very interested in our premium spice range.',
      tags: ['Premium', 'UAE Market', 'Distribution'],
      folderId: 'folder_1',
      folderName: 'Gulf Food 2024',
      organizationId: ORGANIZATION_ID,
      createdById: 'user_2',
      createdByName: 'Rahul Sharma',
      convertedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      duplicateOfLeadId: null,
      lastActivityAt: toTimestamp(new Date()),
      createdAt: toTimestamp(new Date('2024-02-20')),
      updatedAt: toTimestamp(new Date())
    },
    {
      id: 'lead_2',
      companyName: 'Euro Foods GmbH',
      location: 'Hamburg, Germany',
      whatsappNumber: '+4915123456789',
      emailId: 'sourcing@eurofoods.de',
      interest: ['Organic Spices', 'Masala Blends'],
      reference: 'Anuga 2024',
      completeAddress: 'Speicherstadt 12, 20457 Hamburg, Germany',
      managerName: 'Hans Mueller',
      managerPhone: '+4915123456789',
      managerEmail: 'h.mueller@eurofoods.de',
      managerWhatsapp: '+4915123456789',
      status: 'sample_sent',
      priority: 'high',
      valueEstimate: 200000,
      nextFollowUpDate: toTimestamp(new Date(Date.now() + 172800000)),
      notes: 'Requested organic certification documents.',
      tags: ['Organic', 'EU Market', 'Retail'],
      folderId: 'folder_2',
      folderName: 'Anuga 2024',
      organizationId: ORGANIZATION_ID,
      createdById: 'user_3',
      createdByName: 'Akash Patel',
      convertedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      duplicateOfLeadId: null,
      lastActivityAt: toTimestamp(new Date()),
      createdAt: toTimestamp(new Date('2024-10-06')),
      updatedAt: toTimestamp(new Date())
    }
  ],

  tasks: [
    {
      id: 'task_1',
      leadId: 'lead_1',
      organizationId: ORGANIZATION_ID,
      assignedToId: 'user_2',
      assignedToName: 'Rahul Sharma',
      title: 'Send welcome email with company profile',
      description: 'Include product catalog and pricing sheet',
      dueDate: toTimestamp(new Date('2024-02-21')),
      status: 'done',
      priority: 'high',
      checklist: [],
      createdAt: toTimestamp(new Date('2024-02-20')),
      updatedAt: toTimestamp(new Date('2024-02-21'))
    },
    {
      id: 'task_2',
      leadId: 'lead_1',
      organizationId: ORGANIZATION_ID,
      assignedToId: 'user_3',
      assignedToName: 'Akash Patel',
      title: 'Prepare sample kit for UAE',
      dueDate: toTimestamp(new Date(Date.now() + 172800000)),
      status: 'in_progress',
      priority: 'high',
      checklist: [
        { id: 'c1', text: 'Prepare samples', completed: true },
        { id: 'c2', text: 'Get packaging ready', completed: true },
        { id: 'c3', text: 'Create shipping label', completed: false },
        { id: 'c4', text: 'Ship via DHL', completed: false }
      ],
      createdAt: toTimestamp(new Date('2024-02-21')),
      updatedAt: toTimestamp(new Date())
    }
  ],

  invites: [
    {
      id: 'invite_1',
      email: 'newmember@spicemasters.com',
      organizationId: ORGANIZATION_ID,
      invitedById: 'user_1',
      invitedByEmail: 'jainishshah356@gmail.com',
      status: 'pending',
      createdAt: toTimestamp(new Date('2024-02-22T08:00:00')),
      respondedAt: null,
    },
  ],

  notifications: [
    {
      id: 'notif_1',
      userId: 'user_2',
      organizationId: ORGANIZATION_ID,
      type: 'invite',
      title: 'You have been invited',
      message: 'Admin invited you to join Spice Masters FMCG.',
      leadId: null,
      read: false,
      createdAt: toTimestamp(new Date('2024-02-22T09:00:00')),
    },
    {
      id: 'notif_2',
      userId: 'user_1',
      organizationId: ORGANIZATION_ID,
      type: 'task',
      title: 'Task due soon',
      message: 'Prepare sample kit for UAE is due soon.',
      leadId: 'lead_1',
      read: false,
      createdAt: toTimestamp(new Date('2024-02-21T12:00:00')),
    },
  ],

  broadcastMessages: [
    {
      id: 'broadcast_1',
      organizationId: ORGANIZATION_ID,
      senderId: 'user_1',
      senderName: 'Admin User',
      message: 'Welcome to the team! Please check your tasks and update progress regularly.',
      createdAt: toTimestamp(new Date('2024-02-22T07:30:00')),
    },
    {
      id: 'chat_2',
      organizationId: ORGANIZATION_ID,
      senderId: 'user_2',
      senderName: 'Rahul Sharma',
      recipientId: 'team',
      recipientName: 'Team Members',
      message: 'Samples will be ready by tomorrow.',
      read: false,
      createdAt: toTimestamp(new Date('2024-02-22T08:15:00')),
    }
  ],

  activities: [
    {
      id: 'activity_1',
      leadId: 'lead_1',
      actorId: 'user_3',
      actorName: 'Akash Patel',
      type: 'task_completed',
      description: 'Completed task: Send welcome email with company profile',
      metadata: { taskId: 'task_1' },
      organizationId: 'org_1',
      createdAt: toTimestamp(new Date('2024-02-21T10:00:00'))
    },
    {
      id: 'activity_2',
      leadId: 'lead_1',
      actorId: 'user_2',
      actorName: 'Rahul Sharma',
      type: 'status_change',
      description: 'Changed status from Contacted to Qualified',
      metadata: { from: 'contacted', to: 'qualified' },
      organizationId: ORGANIZATION_ID,
      createdAt: toTimestamp(new Date('2024-02-21T09:00:00'))
    }
  ]
};

async function seedFirestore() {
  console.log('🚀 Starting Firestore seed...');
  
  try {
    // Seed organization
    console.log('📦 Seeding organization...');
    await db.doc(`organizations/${seedData.organization.id}`).set(seedData.organization);
    
    // Seed users
    console.log('👥 Seeding users...');
    for (const user of seedData.users) {
      await db.doc(`users/${user.id}`).set(user, { merge: true });
    }
    
    // Seed folders
    console.log('📁 Seeding folders...');
    for (const folder of seedData.folders) {
      await db.doc(`folders/${folder.id}`).set(folder, { merge: true });
    }
    
    // Seed leads
    console.log('🎯 Seeding leads...');
    for (const lead of seedData.leads) {
      await db.doc(`leads/${lead.id}`).set(lead, { merge: true });
    }
    
    // Seed tasks
    console.log('✅ Seeding tasks...');
    for (const task of seedData.tasks) {
      await db.doc(`tasks/${task.id}`).set(task, { merge: true });
    }
    
    // Seed activities
    console.log('📊 Seeding activities...');
    for (const activity of seedData.activities) {
      await db.doc(`activities/${activity.id}`).set(activity, { merge: true });
    }

    console.log('✉️  Seeding invites...');
    for (const invite of seedData.invites) {
      await db.doc(`invites/${invite.id}`).set(invite, { merge: true });
    }

    console.log('🔔 Seeding notifications...');
    for (const notification of seedData.notifications) {
      await db.doc(`notifications/${notification.id}`).set(notification, { merge: true });
    }

    console.log('� Seeding broadcast messages...');
    for (const msg of seedData.broadcastMessages) {
      await db.doc(`broadcastMessages/${msg.id}`).set(msg, { merge: true });
    }
    
    console.log('✨ Firestore seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  - 1 organization`);
    console.log(`  - ${seedData.users.length} users`);
    console.log(`  - ${seedData.folders.length} folders`);
    console.log(`  - ${seedData.leads.length} leads`);
    console.log(`  - ${seedData.tasks.length} tasks`);
    console.log(`  - ${seedData.activities.length} activities`);
    console.log('\n✅ Your Firebase database is ready to use!');
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seed function
seedFirestore();
