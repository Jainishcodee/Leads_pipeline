// Custom React hooks for Firebase operations
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  DocumentData 
} from 'firebase/firestore';
import { db } from './firebase';
import { timestampToDate } from './firestore';

interface UseFirestoreOptions {
  listen?: boolean; // Enable real-time updates
  skip?: boolean; // Skip fetching when true
}

export function useFirestoreDoc<T>(
  collectionName: string,
  docId: string | null,
  options: UseFirestoreOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Import inside effect to avoid circular dependencies
    import('./firestore').then(({ getDocument }) => {
      getDocument<T>(collectionName, docId)
        .then((doc) => {
          setData(doc);
          setError(null);
        })
        .catch((err) => {
          setError(err);
          setData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, [collectionName, docId]);

  return { data, loading, error };
}

export function useFirestoreCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: UseFirestoreOptions = { listen: false }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options.skip) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (options.listen) {
      // Real-time listener
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          
          setData(documents);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore listener error:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      import('./firestore').then(({ getDocuments }) => {
        getDocuments<T>(collectionName, constraints)
          .then((docs) => {
            setData(docs);
            setError(null);
          })
          .catch((err) => {
            setError(err);
            setData([]);
          })
          .finally(() => {
            setLoading(false);
          });
      });
    }
  }, [collectionName, JSON.stringify(constraints), options.listen, options.skip]);

  return {
    data,
    loading,
    error,
    refetch: () => {
      if (!options.skip) {
        setLoading(true);
      }
    },
  };
}

// Specialized hooks
export function useLeads(organizationId: string, folderId?: string) {
  const [constraints, setConstraints] = useState<QueryConstraint[]>([]);

  useEffect(() => {
    import('./firestore').then(({ buildLeadsQuery }) => {
      const queryConstraints = buildLeadsQuery({
        organizationId,
        folderId,
      });
      setConstraints(queryConstraints);
    });
  }, [organizationId, folderId]);

  return useFirestoreCollection('leads', constraints, { listen: true });
}

export function useTasks(leadId?: string, assignedToId?: string) {
  const [constraints, setConstraints] = useState<QueryConstraint[]>([]);

  useEffect(() => {
    import('./firestore').then(({ buildTasksQuery }) => {
      const queryConstraints = buildTasksQuery({
        leadId,
        assignedToId,
      });
      setConstraints(queryConstraints);
    });
  }, [leadId, assignedToId]);

  return useFirestoreCollection('tasks', constraints, { listen: true });
}

export function useActivities(leadId?: string, organizationId?: string) {
  const [constraints, setConstraints] = useState<QueryConstraint[]>([]);

  useEffect(() => {
    import('./firestore').then(({ buildActivitiesQuery }) => {
      const queryConstraints = buildActivitiesQuery({
        leadId,
        organizationId,
      });
      setConstraints(queryConstraints);
    });
  }, [leadId, organizationId]);

  return useFirestoreCollection('activities', constraints, { listen: true });
}

export function useFolders(organizationId: string) {
  const { data, loading, error } = useFirestoreCollection(
    'folders',
    [],
    { listen: true }
  );

  return {
    data: data.filter((folder: any) => folder.organizationId === organizationId),
    loading,
    error,
  };
}

export function useUsers(organizationId: string) {
  const { data, loading, error } = useFirestoreCollection(
    'users',
    [],
    { listen: false }
  );

  return {
    data: data.filter((user: any) => user.organizationId === organizationId),
    loading,
    error,
  };
}
