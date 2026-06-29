import { useState, useCallback } from 'react';
import { api } from './api';

/**
 * Custom hook for making API calls with loading and error states
 */
export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (
      apiCall: () => Promise<{ data?: T; error?: string }>
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiCall();
        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          setData(result.data || null);
          setError(null);
        }
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setData(null);
        return { error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { data, error, isLoading, execute };
}

/**
 * Hook for fetching contacts
 */
export function useContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async (accountId?: string) => {
    setIsLoading(true);
    setError(null);
    const { contacts, error } = await api.getContacts(accountId);
    if (error) {
      setError(error);
    } else {
      setContacts(contacts || []);
    }
    setIsLoading(false);
  }, []);

  const createContact = useCallback(async (contactData: any) => {
    setError(null);
    const { contact, error } = await api.createContact(contactData);
    if (!error && contact) {
      setContacts(prev => [...prev, contact]);
    } else {
      setError(error || 'Failed to create contact');
    }
    return { contact, error };
  }, []);

  const updateContact = useCallback(async (id: string, contactData: any) => {
    setError(null);
    const { contact, error } = await api.updateContact(id, contactData);
    if (!error && contact) {
      setContacts(prev =>
        prev.map(c => (c._id === id ? contact : c))
      );
    } else {
      setError(error || 'Failed to update contact');
    }
    return { contact, error };
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    setError(null);
    const { success, error } = await api.deleteContact(id);
    if (success) {
      setContacts(prev => prev.filter(c => c._id !== id));
    } else {
      setError(error || 'Failed to delete contact');
    }
    return { success, error };
  }, []);

  return {
    contacts,
    isLoading,
    error,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}

/**
 * Hook for managing broadcasts
 */
export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async (accountId?: string) => {
    setIsLoading(true);
    setError(null);
    const { broadcasts, error } = await api.getBroadcasts(accountId);
    if (error) {
      setError(error);
    } else {
      setBroadcasts(broadcasts || []);
    }
    setIsLoading(false);
  }, []);

  const createBroadcast = useCallback(async (broadcastData: any) => {
    setError(null);
    const { broadcast, error } = await api.createBroadcast(broadcastData);
    if (!error && broadcast) {
      setBroadcasts(prev => [...prev, broadcast]);
    } else {
      setError(error || 'Failed to create broadcast');
    }
    return { broadcast, error };
  }, []);

  const updateBroadcast = useCallback(async (id: string, broadcastData: any) => {
    setError(null);
    const { broadcast, error } = await api.updateBroadcast(id, broadcastData);
    if (!error && broadcast) {
      setBroadcasts(prev =>
        prev.map(b => (b._id === id ? broadcast : b))
      );
    } else {
      setError(error || 'Failed to update broadcast');
    }
    return { broadcast, error };
  }, []);

  const deleteBroadcast = useCallback(async (id: string) => {
    setError(null);
    const { success, error } = await api.deleteBroadcast(id);
    if (success) {
      setBroadcasts(prev => prev.filter(b => b._id !== id));
    } else {
      setError(error || 'Failed to delete broadcast');
    }
    return { success, error };
  }, []);

  const sendBroadcast = useCallback(async (id: string) => {
    setError(null);
    const { success, error } = await api.sendBroadcast(id);
    if (success) {
      setBroadcasts(prev =>
        prev.map(b =>
          b._id === id ? { ...b, status: 'sending' } : b
        )
      );
    } else {
      setError(error || 'Failed to send broadcast');
    }
    return { success, error };
  }, []);

  return {
    broadcasts,
    isLoading,
    error,
    fetchBroadcasts,
    createBroadcast,
    updateBroadcast,
    deleteBroadcast,
    sendBroadcast,
  };
}

/**
 * Hook for managing templates
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (accountId?: string) => {
    setIsLoading(true);
    setError(null);
    const { templates, error } = await api.getTemplates(accountId);
    if (error) {
      setError(error);
    } else {
      setTemplates(templates || []);
    }
    setIsLoading(false);
  }, []);

  const createTemplate = useCallback(async (templateData: any) => {
    setError(null);
    const { template, error } = await api.createTemplate(templateData);
    if (!error && template) {
      setTemplates(prev => [...prev, template]);
    } else {
      setError(error || 'Failed to create template');
    }
    return { template, error };
  }, []);

  const updateTemplate = useCallback(async (id: string, templateData: any) => {
    setError(null);
    const { template, error } = await api.updateTemplate(id, templateData);
    if (!error && template) {
      setTemplates(prev =>
        prev.map(t => (t._id === id ? template : t))
      );
    } else {
      setError(error || 'Failed to update template');
    }
    return { template, error };
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    setError(null);
    const { success, error } = await api.deleteTemplate(id);
    if (success) {
      setTemplates(prev => prev.filter(t => t._id !== id));
    } else {
      setError(error || 'Failed to delete template');
    }
    return { success, error };
  }, []);

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

/**
 * Hook for fetching conversations
 */
export function useConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (accountId?: string) => {
    setIsLoading(true);
    setError(null);
    const { conversations, error } = await api.getConversations(accountId);
    if (error) {
      setError(error);
    } else {
      setConversations(conversations || []);
    }
    setIsLoading(false);
  }, []);

  const getMessages = useCallback(async (conversationId: string) => {
    setError(null);
    const { messages, error } = await api.getConversationMessages(conversationId);
    return { messages, error };
  }, []);

  const sendMessage = useCallback(async (messageData: any) => {
    setError(null);
    const { message, error } = await api.sendMessage(messageData);
    if (!error && message) {
      // Update conversations list if needed
    } else {
      setError(error || 'Failed to send message');
    }
    return { message, error };
  }, []);

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
    getMessages,
    sendMessage,
  };
}

/**
 * Hook for fetching stats
 */
export function useStats() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (accountId?: string) => {
    setIsLoading(true);
    setError(null);
    const { stats, error } = await api.getStats(accountId);
    if (error) {
      setError(error);
    } else {
      setStats(stats || null);
    }
    setIsLoading(false);
  }, []);

  return { stats, isLoading, error, fetchStats };
}
