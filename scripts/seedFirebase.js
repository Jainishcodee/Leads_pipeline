// Firebase seed script - Run this once to populate Firestore with initial data
// Usage: node scripts/seedFirebase.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3I2bhp2w21OSIodIq1By8xPH-B2y0hhQ",
  authDomain: "mocha-cafe-e6fa0.firebaseapp.com",
  projectId: "mocha-cafe-e6fa0",
  storageBucket: "mocha-cafe-e6fa0.firebasestorage.app",
  messagingSenderId: "52119654233",
  appId: "1:52119654233:web:5b2d3d2a4a157285de4648",
  measurementId: "G-TM2C9WL3RS",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to convert Date to Firestore Timestamp
const toTimestamp = (date) => Timestamp.fromDate(date);

// Seed data
const seedData = {
  organization: {
    id: 'org_1',
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
      organizationId: 'org_1',
      createdAt: toTimestamp(new Date('2024-01-01'))
    },
    {
      id: 'user_2',
      email: 'rahul@spicemasters.com',
      name: 'Rahul Sharma',
      avatar: null,
      role: 'member',
      organizationId: 'org_1',
      createdAt: toTimestamp(new Date('2024-01-15'))
    },
    {
      id: 'user_3',
      email: 'akash@spicemasters.com',
      name: 'Akash Patel',
      avatar: null,
      role: 'member',
      organizationId: 'org_1',
      createdAt: toTimestamp(new Date('2024-01-15'))
    },
    {
      id: 'user_4',
      email: 'raj@spicemasters.com',
      name: 'Raj Kumar',
      avatar: null,
      role: 'member',
      organizationId: 'org_1',
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
      organizationId: 'org_1',
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
      organizationId: 'org_1',
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
      organizationId: 'org_1',
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
      organizationId: 'org_1',
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
      organizationId: 'org_1',
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
      assignedToId: 'user_3',
      assignedToName: 'Akash Patel',
      title: 'Prepare sample kit for UAE',
      description: 'Include top 10 spices and 3 RTE products',
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
      organizationId: 'org_1',
      createdAt: toTimestamp(new Date('2024-02-21T09:00:00'))
    }
  ]
};

async function seedFirestore() {
  console.log('🚀 Starting Firestore seed...');
  
  try {
    // Seed organization
    console.log('📦 Seeding organization...');
    await setDoc(doc(db, 'organizations', seedData.organization.id), seedData.organization);
    
    // Seed users
    console.log('👥 Seeding users...');
    for (const user of seedData.users) {
      await setDoc(doc(db, 'users', user.id), user);
    }
    
    // Seed folders
    console.log('📁 Seeding folders...');
    for (const folder of seedData.folders) {
      await setDoc(doc(db, 'folders', folder.id), folder);
    }
    
    // Seed leads
    console.log('🎯 Seeding leads...');
    for (const lead of seedData.leads) {
      await setDoc(doc(db, 'leads', lead.id), lead);
    }
    
    // Seed tasks
    console.log('✅ Seeding tasks...');
    for (const task of seedData.tasks) {
      await setDoc(doc(db, 'tasks', task.id), task);
    }
    
    // Seed activities
    console.log('📊 Seeding activities...');
    for (const activity of seedData.activities) {
      await setDoc(doc(db, 'activities', activity.id), activity);
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
