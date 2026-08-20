// Custom hooks for Firestore data fetching
import { useEffect, useMemo, useState } from 'react';
import { where, orderBy } from 'firebase/firestore';
import { leadsAPI, tasksAPI, activitiesAPI, foldersAPI, chatAPI, assignmentsAPI, usersAPI } from '@/lib/api';
import type { Lead, Task, ActivityLog, Folder, ChatMessage, LeadAssignment, User, UserRole } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { timestampToDate, buildLeadsQuery, buildTasksQuery, buildActivitiesQuery } from '@/lib/firestore';
import { useFirestoreCollection } from '@/lib/useFirestore';

export function useLeads(
  organizationId: string,
  options?: { role?: UserRole; userId?: string; skip?: boolean; listen?: boolean }
) {
  const constraints = useMemo(() => buildLeadsQuery({ organizationId }), [organizationId]);
  const listen = options?.listen ?? true;
  const skip = Boolean(options?.skip || !organizationId);
  const { data, loading, error, refetch } = useFirestoreCollection<Lead>('leads', constraints, {
    listen,
    skip,
  });
  const assignmentConstraints = useMemo(
    () =>
      options?.role === 'member' && options?.userId && organizationId
        ? [where('organizationId', '==', organizationId), where('userId', '==', options.userId)]
        : [],
    [organizationId, options?.role, options?.userId]
  );
  const taskConstraints = useMemo(
    () =>
      options?.role === 'member' && options?.userId && organizationId
        ? [where('organizationId', '==', organizationId), where('assignedToId', '==', options.userId)]
        : [],
    [organizationId, options?.role, options?.userId]
  );
  const shouldFetchAssignments = Boolean(!skip && options?.role === 'member' && options?.userId && organizationId);
  const shouldFetchTasks = Boolean(!skip && options?.role === 'member' && options?.userId && organizationId);
  const {
    data: assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
  } = useFirestoreCollection<LeadAssignment>('leadAssignments', assignmentConstraints, {
    listen: listen && shouldFetchAssignments,
    skip: !shouldFetchAssignments,
  });
  const {
    data: assignedTasks,
    loading: tasksLoading,
    error: tasksError,
  } = useFirestoreCollection<Task>('tasks', taskConstraints, {
    listen: listen && shouldFetchTasks,
    skip: !shouldFetchTasks,
  });

  const leads = useMemo(() => {
    if (!options?.role || options.role === 'admin' || options.role === 'superadmin') {
      return data;
    }
    if (options.role === 'member' && options.userId) {
      const assignedLeadIds = new Set(assignments.map((assignment) => assignment.leadId));
      const taskLeadIds = new Set(assignedTasks.map((task) => task.leadId));
      return data.filter(
        (lead) => lead.createdById === options.userId || assignedLeadIds.has(lead.id) || taskLeadIds.has(lead.id)
      );
    }
    return data;
  }, [data, assignments, assignedTasks, options?.role, options?.userId]);

  return {
    leads,
    loading: loading || (options?.role === 'member' ? assignmentsLoading || tasksLoading : false),
    error: error || assignmentsError || tasksError,
    refetch,
  };
}

export function useLead(leadId: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const fetchLead = async () => {
      try {
        setLoading(true);
        const data = await leadsAPI.getById(leadId);
        setLead(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  return { lead, loading, error, refetch: () => leadId && leadsAPI.getById(leadId).then(setLead) };
}

export function useFolderLeads(
  folderId: string,
  organizationId: string,
  options?: { role?: UserRole; userId?: string }
) {
  const constraints = useMemo(() => buildLeadsQuery({ organizationId, folderId }), [folderId, organizationId]);
  const { data, loading, error, refetch } = useFirestoreCollection<Lead>('leads', constraints, { listen: true });
  const assignmentConstraints = useMemo(
    () =>
      options?.role === 'member' && options?.userId && organizationId
        ? [where('organizationId', '==', organizationId), where('userId', '==', options.userId)]
        : [],
    [organizationId, options?.role, options?.userId]
  );
  const taskConstraints = useMemo(
    () =>
      options?.role === 'member' && options?.userId && organizationId
        ? [where('organizationId', '==', organizationId), where('assignedToId', '==', options.userId)]
        : [],
    [organizationId, options?.role, options?.userId]
  );
  const shouldListenAssignments = Boolean(options?.role === 'member' && options?.userId && organizationId);
  const shouldListenTasks = Boolean(options?.role === 'member' && options?.userId && organizationId);
  const {
    data: assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
  } = useFirestoreCollection<LeadAssignment>('leadAssignments', assignmentConstraints, {
    listen: shouldListenAssignments,
    skip: !shouldListenAssignments,
  });
  const {
    data: assignedTasks,
    loading: tasksLoading,
    error: tasksError,
  } = useFirestoreCollection<Task>('tasks', taskConstraints, {
    listen: shouldListenTasks,
    skip: !shouldListenTasks,
  });

  const leads = useMemo(() => {
    if (!options?.role || options.role === 'admin' || options.role === 'superadmin') {
      return data;
    }
    if (options.role === 'member' && options.userId) {
      const assignedLeadIds = new Set(assignments.map((assignment) => assignment.leadId));
      const taskLeadIds = new Set(assignedTasks.map((task) => task.leadId));
      return data.filter(
        (lead) => lead.createdById === options.userId || assignedLeadIds.has(lead.id) || taskLeadIds.has(lead.id)
      );
    }
    return data;
  }, [data, assignments, assignedTasks, options?.role, options?.userId]);

  return {
    leads,
    loading: loading || (options?.role === 'member' ? assignmentsLoading || tasksLoading : false),
    error: error || assignmentsError || tasksError,
    refetch,
  };
}

export function useLeadTasks(leadId: string | undefined, organizationId?: string) {
  const constraints = useMemo(
    () => (leadId ? buildTasksQuery({ leadId, organizationId }) : []),
    [leadId, organizationId]
  );
  const { data, loading, error, refetch } = useFirestoreCollection<Task>('tasks', constraints, { listen: true });
  return { tasks: data, loading, error, refetch };
}

export function useLeadActivities(leadId: string | undefined, organizationId?: string) {
  const constraints = useMemo(
    () => (leadId ? buildActivitiesQuery({ leadId, organizationId }) : []),
    [leadId, organizationId]
  );
  const { data, loading, error, refetch } = useFirestoreCollection<ActivityLog>('activities', constraints, { listen: true });
  return { activities: data, loading, error, refetch };
}

export function useFolders(organizationId: string, options?: { skip?: boolean; listen?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const listen = options?.listen ?? true;
  const skip = Boolean(options?.skip);

  const constraints = useMemo(
    () => (organizationId ? [where('organizationId', '==', organizationId)] : []),
    [organizationId]
  );

  const shouldListen = Boolean(user && organizationId && !authLoading && !skip);
  const { data, loading, error, refetch } = useFirestoreCollection<Folder>('folders', constraints, {
    listen,
    skip: !shouldListen,
  });

  if (!shouldListen) {
    return { folders: [], loading: authLoading, error: null, refetch: () => Promise.resolve() };
  }

  return { folders: data, loading, error, refetch };
}

export function useUsers(organizationId: string) {
  const { user, loading: authLoading } = useAuth();
  const constraints = useMemo(
    () => (organizationId ? [where('organizationId', '==', organizationId)] : []),
    [organizationId]
  );

  const shouldListen = Boolean(user && organizationId && !authLoading);
  const { data, loading, error, refetch } = useFirestoreCollection<User>('users', constraints, {
    listen: shouldListen,
  });

  if (!shouldListen) {
    return { users: [], loading: authLoading, error: null, refetch: () => Promise.resolve() };
  }

  return { users: data, loading, error, refetch };
}

export function useLeadChat(leadId: string | undefined, organizationId?: string) {
  const constraints = useMemo(
    () =>
      leadId
        ? [
            where('leadId', '==', leadId),
            ...(organizationId ? [where('organizationId', '==', organizationId)] : []),
            orderBy('createdAt', 'asc'),
          ]
        : [],
    [leadId, organizationId]
  );
  const { data, loading, error, refetch } = useFirestoreCollection<ChatMessage>('chatMessages', constraints, {
    listen: Boolean(leadId),
  });

  return { messages: data, loading, error, refetch };
}

export function useLeadAssignments(leadId: string | undefined, organizationId?: string) {
  const constraints = useMemo(
    () =>
      leadId
        ? [
            where('leadId', '==', leadId),
            ...(organizationId ? [where('organizationId', '==', organizationId)] : []),
          ]
        : [],
    [leadId, organizationId]
  );
  const { data, loading, error, refetch } = useFirestoreCollection<LeadAssignment>('leadAssignments', constraints, {
    listen: Boolean(leadId),
  });

  return { assignments: data, loading, error, refetch };
}

export function useOrganizationTasks(organizationId: string, opts?: { role?: UserRole; userId?: string }) {
  const { user, loading: authLoading } = useAuth();
  const constraints = useMemo(() => buildTasksQuery({ organizationId }), [organizationId]);
  const shouldListen = Boolean(user && organizationId && !authLoading);
  const { data, loading, error, refetch } = useFirestoreCollection<Task>('tasks', constraints, {
    listen: shouldListen,
  });

  if (!shouldListen) {
    return { tasks: [], loading: authLoading, error: null, refetch: () => Promise.resolve() };
  }

  const tasks = useMemo(() => {
    if (!opts?.role || opts.role === 'admin' || opts.role === 'superadmin') return data;
    if (opts.role === 'member' && opts.userId) {
      return data.filter((t) => t.assignedToId === opts.userId || t.createdById === opts.userId);
    }
    return data;
  }, [data, opts?.role, opts?.userId]);

  return { tasks, loading, error, refetch };
}

export function useOrganizationActivities(organizationId: string) {
  const { user, loading: authLoading } = useAuth();
  const constraints = useMemo(() => buildActivitiesQuery({ organizationId }), [organizationId]);
  const shouldListen = Boolean(user && organizationId && !authLoading);
  const { data, loading, error, refetch } = useFirestoreCollection<ActivityLog>('activities', constraints, {
    listen: shouldListen,
  });

  if (!shouldListen) {
    return { activities: [], loading: authLoading, error: null, refetch: () => Promise.resolve() };
  }

  return { activities: data, loading, error, refetch };
}
