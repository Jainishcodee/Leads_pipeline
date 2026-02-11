// Custom hooks for Firestore data fetching
import { useState, useEffect } from 'react';
import { leadsAPI, tasksAPI, activitiesAPI, foldersAPI, chatAPI, assignmentsAPI, usersAPI } from '@/lib/api';
import type { Lead, Task, ActivityLog, Folder, ChatMessage, LeadAssignment, User } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { timestampToDate } from '@/lib/firestore';

export function useLeads(organizationId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const data = await leadsAPI.getAll(organizationId);
        setLeads(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [organizationId]);

  return { leads, loading, error, refetch: () => leadsAPI.getAll(organizationId).then(setLeads) };
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

export function useFolderLeads(folderId: string, organizationId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const data = await leadsAPI.getByFolder(folderId, organizationId);
        setLeads(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [folderId, organizationId]);

  return { leads, loading, error, refetch: () => leadsAPI.getByFolder(folderId, organizationId).then(setLeads) };
}

export function useLeadTasks(leadId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await tasksAPI.getByLead(leadId);
        setTasks(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [leadId]);

  return { tasks, loading, error, refetch: () => leadId && tasksAPI.getByLead(leadId).then(setTasks) };
}

export function useLeadActivities(leadId: string | undefined) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        setLoading(true);
        const data = await activitiesAPI.getByLead(leadId);
        setActivities(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [leadId]);

  return { activities, loading, error, refetch: () => leadId && activitiesAPI.getByLead(leadId).then(setActivities) };
}

export function useFolders(organizationId: string) {
  const { user, loading: authLoading } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !user || !organizationId) {
      setLoading(false);
      return;
    }

    const fetchFolders = async () => {
      try {
        setLoading(true);
        const data = await foldersAPI.getAll(organizationId);
        setFolders(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, [organizationId, user, authLoading]);

  return {
    folders,
    loading,
    error,
    refetch: () => (user ? foldersAPI.getAll(organizationId).then(setFolders) : Promise.resolve()),
  };
}

export function useUsers(organizationId: string) {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !user || !organizationId) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await usersAPI.getAll(organizationId);
        setUsers(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [organizationId, user, authLoading]);

  return {
    users,
    loading,
    error,
    refetch: () => (user ? usersAPI.getAll(organizationId).then(setUsers) : Promise.resolve()),
  };
}

export function useLeadChat(leadId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const data = await chatAPI.getByLead(leadId);
        const sorted = [...data].sort(
          (a, b) => timestampToDate(a.createdAt).getTime() - timestampToDate(b.createdAt).getTime()
        );
        setMessages(sorted);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [leadId]);

  return { messages, loading, error, refetch: () => leadId && chatAPI.getByLead(leadId).then(setMessages) };
}

export function useLeadAssignments(leadId: string | undefined) {
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const data = await assignmentsAPI.getByLead(leadId);
        setAssignments(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [leadId]);

  return { assignments, loading, error, refetch: () => leadId && assignmentsAPI.getByLead(leadId).then(setAssignments) };
}

export function useOrganizationTasks(organizationId: string) {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !user || !organizationId) {
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await tasksAPI.getByOrganization(organizationId);
        const sorted = [...data].sort(
          (a, b) => timestampToDate(a.createdAt).getTime() - timestampToDate(b.createdAt).getTime()
        );
        setTasks(sorted);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [organizationId, user, authLoading]);

  return { tasks, loading, error, refetch: () => tasksAPI.getByOrganization(organizationId).then(setTasks) };
}

export function useOrganizationActivities(organizationId: string) {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !user || !organizationId) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        setLoading(true);
        const data = await activitiesAPI.getByOrganization(organizationId);
        const sorted = [...data].sort(
          (a, b) => timestampToDate(b.createdAt).getTime() - timestampToDate(a.createdAt).getTime()
        );
        setActivities(sorted);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [organizationId, user, authLoading]);

  return { activities, loading, error, refetch: () => activitiesAPI.getByOrganization(organizationId).then(setActivities) };
}
