// Firestore utility functions and helpers
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  DocumentData,
  QueryConstraint,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Collection names
export const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  USERS: 'users',
  INVITES: 'invites',
  FOLDERS: 'folders',
  LEADS: 'leads',
  LEAD_ASSIGNMENTS: 'leadAssignments',
  TASKS: 'tasks',
  ACTIVITIES: 'activities',
  CHAT_MESSAGES: 'chatMessages',
  NOTIFICATIONS: 'notifications',
} as const;

// Helper to convert Firestore timestamp to Date
export const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
};

// Helper to convert Date to Firestore timestamp
export const dateToTimestamp = (date: Date | null | undefined): Timestamp | null => {
  if (!date) return null;
  return Timestamp.fromDate(date);
};

// Generic CRUD operations

export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
}

export async function getDocuments<T>(
  collectionName: string, 
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
}

export async function createDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

// Batch operations
export async function batchWrite(operations: Array<{
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data?: any;
}>) {
  try {
    const batch = writeBatch(db);
    
    operations.forEach(op => {
      if (op.type === 'create' && op.data) {
        const docRef = doc(collection(db, op.collection));
        batch.set(docRef, {
          ...op.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (op.type === 'update' && op.id && op.data) {
        const docRef = doc(db, op.collection, op.id);
        batch.update(docRef, {
          ...op.data,
          updatedAt: serverTimestamp(),
        });
      } else if (op.type === 'delete' && op.id) {
        const docRef = doc(db, op.collection, op.id);
        batch.delete(docRef);
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error in batch write:', error);
    throw error;
  }
}

// Query builders
export function buildLeadsQuery(filters: {
  organizationId?: string;
  folderId?: string;
  status?: string;
  createdById?: string;
}) {
  const constraints: QueryConstraint[] = [];
  
  if (filters.organizationId) {
    constraints.push(where('organizationId', '==', filters.organizationId));
  }
  if (filters.folderId) {
    constraints.push(where('folderId', '==', filters.folderId));
  }
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters.createdById) {
    constraints.push(where('createdById', '==', filters.createdById));
  }
  
  // Always order by createdAt descending
  constraints.push(orderBy('createdAt', 'desc'));
  
  return constraints;
}

export function buildTasksQuery(filters: {
  leadId?: string;
  assignedToId?: string;
  status?: string;
  organizationId?: string;
}) {
  const constraints: QueryConstraint[] = [];
  
  if (filters.leadId) {
    constraints.push(where('leadId', '==', filters.leadId));
  }
  if (filters.organizationId) {
    constraints.push(where('organizationId', '==', filters.organizationId));
  }
  if (filters.assignedToId) {
    constraints.push(where('assignedToId', '==', filters.assignedToId));
  }
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }
  
  // Always order by createdAt descending
  constraints.push(orderBy('createdAt', 'desc'));
  
  return constraints;
}

export function buildActivitiesQuery(filters: {
  leadId?: string;
  organizationId?: string;
  actorId?: string;
}) {
  const constraints: QueryConstraint[] = [];
  
  if (filters.leadId) {
    constraints.push(where('leadId', '==', filters.leadId));
  }
  if (filters.organizationId) {
    constraints.push(where('organizationId', '==', filters.organizationId));
  }
  if (filters.actorId) {
    constraints.push(where('actorId', '==', filters.actorId));
  }
  
  // Always order by createdAt descending
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(50));
  
  return constraints;
}
