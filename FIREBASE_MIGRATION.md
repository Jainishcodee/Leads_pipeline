# 🔥 Firebase Integration - Complete Setup Guide

## Overview

This guide will help you migrate from mock data to Firebase with minimal effort. All the infrastructure is ready - you just need to configure Firebase and run the seed script.

## 📋 Prerequisites

- Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- Node.js and npm installed

## 🚀 Quick Start (5 Steps)

### Step 1: Enable Firebase Services

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mocha-cafe-e6fa0`
3. Enable **Firestore Database**:
   - Click "Firestore Database" → "Create database"
   - Start in **test mode** (we'll add security rules later)
   - Choose location closest to you
4. Enable **Authentication**:
   - Click "Authentication" → "Get Started"
   - Enable "Email/Password" sign-in method

### Step 2: Update Firebase Config (Already Done!)

Your Firebase config is already set in `src/lib/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyD3I2bhp2w21OSIodIq1By8xPH-B2y0hhQ",
  authDomain: "mocha-cafe-e6fa0.firebaseapp.com",
  projectId: "mocha-cafe-e6fa0",
  storageBucket: "mocha-cafe-e6fa0.firebasestorage.app",
  messagingSenderId: "52119654233",
  appId: "1:52119654233:web:5b2d3d2a4a157285de4648",
};
```

### Step 3: Update Seed Script Config

Edit `scripts/seedFirebase.js` and replace the config with your actual Firebase config (same as above).

### Step 4: Run the Seed Script

```bash
npm run seed:firebase
```

This will create all collections and populate them with initial data:
- 1 organization (Spice Masters FMCG)
- 4 users (including your admin account)
- 3 folders (Gulf Food 2024, Anuga 2024, Telephonic Leads)
- 2 sample leads
- 2 sample tasks
- 2 sample activities

### Step 5: Deploy Firestore Security Rules

1. In Firebase Console, go to Firestore Database → Rules
2. Replace the content with the rules from `FIREBASE_SETUP.md`
3. Click "Publish"

## 📁 Files Created

### Core Infrastructure
- `src/lib/firestore.ts` - Firestore utility functions (CRUD operations)
- `src/lib/useFirestore.ts` - React hooks for real-time data
- `src/lib/api.ts` - API service layer for all operations

### Configuration
- `FIREBASE_SETUP.md` - Complete Firebase schema and security rules
- `scripts/seedFirebase.js` - Seed script to populate initial data

### Updated Files
- `src/lib/firebase.ts` - Added Firestore initialization
- `package.json` - Added seed script command

## 🔄 How to Use in Components

### Before (Mock Data)
```typescript
import { mockLeads } from '@/data/mockData';

function MyComponent() {
  const leads = mockLeads;
  // ...
}
```

### After (Firebase)
```typescript
import { useLeads } from '@/lib/useFirestore';

function MyComponent() {
  const { data: leads, loading, error } = useLeads('org_1');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  // Use leads data (same structure as mock data!)
}
```

## 📊 Available Hooks

```typescript
// Leads
const { data, loading, error } = useLeads(organizationId, folderId);

// Tasks
const { data, loading, error } = useTasks(leadId, assignedToId);

// Activities
const { data, loading, error } = useActivities(leadId, organizationId);

// Folders
const { data, loading, error } = useFolders(organizationId);

// Users
const { data, loading, error } = useUsers(organizationId);

// Single document
const { data, loading, error } = useFirestoreDoc('leads', leadId);

// Custom collection query
const { data, loading, error } = useFirestoreCollection(
  'leads',
  [where('status', '==', 'qualified')],
  { listen: true } // Enable real-time updates
);
```

## 🔧 API Functions

### Leads
```typescript
import { leadsAPI } from '@/lib/api';

// Create
await leadsAPI.create(leadData);

// Update
await leadsAPI.update(leadId, { status: 'qualified' });

// Delete
await leadsAPI.delete(leadId);

// Get by ID
const lead = await leadsAPI.getById(leadId);

// Get by folder
const leads = await leadsAPI.getByFolder(folderId, orgId);
```

### Tasks
```typescript
import { tasksAPI } from '@/lib/api';

await tasksAPI.create(taskData);
await tasksAPI.update(taskId, { status: 'done' });
await tasksAPI.delete(taskId);
const tasks = await tasksAPI.getByLead(leadId);
```

### Activities
```typescript
import { activitiesAPI } from '@/lib/api';

await activitiesAPI.logActivity(
  leadId,
  userId,
  userName,
  'status_change',
  'Changed status from New to Contacted',
  organizationId,
  { from: 'new', to: 'contacted' }
);
```

## 🎯 Migration Strategy

### Phase 1: Keep Mock Data as Fallback (Recommended)
1. Create new components that use Firebase hooks
2. Test thoroughly in development
3. Switch production to Firebase when ready

### Phase 2: Gradual Migration
1. Start with read-only operations (displaying data)
2. Add write operations (create, update, delete)
3. Remove mock data imports

### Phase 3: Clean Up
1. Delete `src/data/mockData.ts`
2. Remove all mockData imports

## 🔐 Security Considerations

### Current Setup (Test Mode)
- ✅ Good for development
- ❌ NOT suitable for production
- Anyone can read/write your database

### Production Setup
1. Deploy the security rules from `FIREBASE_SETUP.md`
2. Rules ensure:
   - Users can only access their organization's data
   - Admins have write access
   - Members have read access and limited write access

## 📈 Firestore Indexes

Some queries require composite indexes. Firebase will show you which indexes to create when you run queries. You can create them:

1. From the error message link in console
2. Manually in Firebase Console → Firestore → Indexes
3. Using `firestore.indexes.json` (for CI/CD)

Common indexes needed:
- `leads`: organizationId + createdAt (desc)
- `tasks`: assignedToId + status
- `activities`: leadId + createdAt (desc)

## 💰 Cost Estimates

Firestore pricing (as of 2024):
- **Free tier**: 50K reads/day, 20K writes/day, 20K deletes/day, 1GB storage
- **Paid**: ~$0.06 per 100K reads, ~$0.18 per 100K writes

For a small team (5 users):
- Estimated usage: 10-20K reads/day, 1-2K writes/day
- **Cost: $0** (within free tier)

## 🐛 Troubleshooting

### "Permission Denied" Error
- **Cause**: Firestore rules not deployed or too restrictive
- **Fix**: Deploy security rules from `FIREBASE_SETUP.md`

### "Missing Index" Error
- **Cause**: Complex query needs an index
- **Fix**: Click the link in error message to create index

### Seed Script Fails
- **Cause**: Firebase config not updated in seed script
- **Fix**: Update config in `scripts/seedFirebase.js`

### Data Not Updating in Real-time
- **Cause**: Not using `{ listen: true }` option
- **Fix**: Add `{ listen: true }` to `useFirestoreCollection` hook

## 📞 Support

If you encounter issues:
1. Check Firebase Console for errors
2. Check browser console for detailed error messages
3. Verify security rules are deployed
4. Ensure indexes are created

## 🎉 Next Steps

After successful setup:
1. ✅ Run seed script
2. ✅ Verify data in Firebase Console
3. ✅ Update one component to use Firebase hooks
4. ✅ Test CRUD operations
5. ✅ Deploy security rules
6. ✅ Gradually migrate other components
7. ✅ Remove mock data

Your database is ready with the same data structure and relationships as mock data - migration should be seamless!
