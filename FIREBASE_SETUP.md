# Firebase Integration Guide

## Database Schema

### Collections Structure

```
organizations/
  {orgId}/
    - id: string
    - name: string
    - logo: string | null
    - createdAt: timestamp

users/
  {userId}/
    - id: string (matches Firebase Auth UID)
    - email: string
    - name: string
    - avatar: string | null
    - role: 'admin' | 'member' | 'observer'
    - organizationId: string
    - createdAt: timestamp

folders/
  {folderId}/
    - id: string
    - name: string
    - description: string | null
    - eventStartDate: timestamp | null
    - eventEndDate: timestamp | null
    - venue: string | null
    - organizationId: string
    - createdById: string
    - leadsCount: number
    - createdAt: timestamp

leads/
  {leadId}/
    - id: string
    - companyName: string
    - location: string
    - whatsappNumber: string
    - emailId: string
    - interest: array<string>
    - reference: string | null
    - completeAddress: string
    - managerName: string
    - managerPhone: string
    - managerEmail: string
    - managerWhatsapp: string
    - status: LeadStatus
    - priority: 'low' | 'medium' | 'high'
    - valueEstimate: number | null
    - nextFollowUpDate: timestamp | null
    - notes: string | null
    - tags: array<string>
    - folderId: string
    - folderName: string
    - organizationId: string
    - createdById: string
    - createdByName: string
    - convertedAt: timestamp | null
    - cancelledAt: timestamp | null
    - cancellationReason: string | null
    - duplicateOfLeadId: string | null
    - lastActivityAt: timestamp
    - createdAt: timestamp
    - updatedAt: timestamp

leadAssignments/
  {assignmentId}/
    - id: string
    - leadId: string
    - userId: string
    - userName: string
    - roleInLead: string
    - assignedAt: timestamp

tasks/
  {taskId}/
    - id: string
    - leadId: string
    - assignedToId: string
    - assignedToName: string
    - title: string
    - description: string | null
    - dueDate: timestamp | null
    - status: 'todo' | 'in_progress' | 'done'
    - priority: 'low' | 'medium' | 'high'
    - checklist: array<{id: string, text: string, completed: boolean}>
    - createdAt: timestamp
    - updatedAt: timestamp

activities/
  {activityId}/
    - id: string
    - leadId: string
    - actorId: string
    - actorName: string
    - type: string
    - description: string
    - metadata: object
    - createdAt: timestamp

chatMessages/
  {messageId}/
    - id: string
    - leadId: string
    - senderId: string
    - senderName: string
    - message: string
    - createdAt: timestamp

notifications/
  {notificationId}/
    - id: string
    - userId: string
    - type: string
    - title: string
    - message: string
    - read: boolean
    - linkTo: string | null
    - createdAt: timestamp
```

## Firestore Indexes

### Required Composite Indexes

1. **leads** collection:
   - organizationId (Ascending) + createdAt (Descending)
   - folderId (Ascending) + status (Ascending)
   - organizationId (Ascending) + status (Ascending)
   - createdById (Ascending) + createdAt (Descending)

2. **tasks** collection:
   - leadId (Ascending) + status (Ascending)
   - assignedToId (Ascending) + dueDate (Ascending)
   - assignedToId (Ascending) + status (Ascending)

3. **activities** collection:
   - leadId (Ascending) + createdAt (Descending)
   - organizationId (Ascending) + createdAt (Descending)

4. **chatMessages** collection:
   - leadId (Ascending) + createdAt (Ascending)

5. **notifications** collection:
   - userId (Ascending) + read (Ascending) + createdAt (Descending)

## Firebase Setup Steps

### 1. Install Firebase Dependencies

```bash
npm install firebase
```

### 2. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in test mode (we'll add rules later)
5. Get your Firebase config from Project Settings

### 3. Security Rules (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOrgMember(orgId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId;
    }
    
    function isAdmin(orgId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId;
    }
    
    // Organizations
    match /organizations/{orgId} {
      allow read: if isOrgMember(orgId);
      allow write: if isAdmin(orgId);
    }
    
    // Users
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Folders
    match /folders/{folderId} {
      allow read: if isOrgMember(resource.data.organizationId);
      allow create: if isAuthenticated();
      allow update, delete: if isOrgMember(resource.data.organizationId);
    }
    
    // Leads
    match /leads/{leadId} {
      allow read: if isOrgMember(resource.data.organizationId);
      allow create: if isAuthenticated();
      allow update, delete: if isOrgMember(resource.data.organizationId);
    }
    
    // Lead Assignments
    match /leadAssignments/{assignmentId} {
      allow read, write: if isAuthenticated();
    }
    
    // Tasks
    match /tasks/{taskId} {
      allow read, write: if isAuthenticated();
    }
    
    // Activities
    match /activities/{activityId} {
      allow read, write: if isAuthenticated();
    }
    
    // Chat Messages
    match /chatMessages/{messageId} {
      allow read, write: if isAuthenticated();
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. Run Seed Script

After setting up Firebase config, run:

```bash
npm run seed-firebase
```

This will populate your Firestore with initial data matching the current mock data.

## Migration Checklist

- [x] Create Firebase configuration
- [x] Create Firestore utility functions
- [x] Create custom hooks for data fetching
- [x] Create seed data script
- [x] Update auth to use Firebase
- [x] Replace mock data with Firebase queries
- [x] Test all CRUD operations
- [x] Deploy security rules
- [x] Create Firestore indexes
