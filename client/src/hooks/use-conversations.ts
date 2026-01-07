import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  getActiveConversation,
  createNewConversation as createGuestConversation,
  addMessageToConversation as addGuestMessage,
  setActiveConversation as setGuestActiveConversation,
  getConversationsByCategory as getGuestConversationsByCategory,
  getAllConversations as getGuestConversations,
  startFreshSession,
  clearActiveConversation,
  type GuestConversation,
  type ChatMessage,
} from "@/lib/guest-storage";
import type { Conversation } from "@shared/schema";

interface UseConversationsOptions {
  userId?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

export function useConversations({ userId }: UseConversationsOptions = {}) {
  const isAuthenticated = !!userId;

  const { data: dbConversations = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const createConversationMutation = useMutation({
    mutationFn: async ({ title, category }: { title: string; category: string }) => {
      const res = await apiRequest("POST", "/api/conversations", { title, category });
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; category?: string; messages?: ConversationMessage[] }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${id}`, data);
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const syncGuestConversationsMutation = useMutation({
    mutationFn: async () => {
      const guestConvos = getGuestConversations();
      const results: Conversation[] = [];
      
      for (const guestConvo of guestConvos) {
        if (guestConvo.messages.length === 0) continue;
        
        const res = await apiRequest("POST", "/api/conversations", {
          title: guestConvo.title || "Imported Chat",
          category: guestConvo.category || "general",
          messages: guestConvo.messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now(),
          })),
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const getAllConversations = (): (Conversation | GuestConversation)[] => {
    if (isAuthenticated) {
      return dbConversations;
    }
    return getGuestConversations();
  };

  const getConversationsByCategory = (): Record<string, (Conversation | GuestConversation)[]> => {
    if (isAuthenticated) {
      const grouped: Record<string, Conversation[]> = {};
      for (const convo of dbConversations) {
        const cat = convo.category || "general";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(convo);
      }
      return grouped;
    }
    return getGuestConversationsByCategory();
  };

  const createConversation = async (title = "New conversation", category = "general"): Promise<string> => {
    if (isAuthenticated) {
      const result = await createConversationMutation.mutateAsync({ title, category });
      return result.id;
    }
    const guestConvo = createGuestConversation();
    return guestConvo.id;
  };

  const addMessage = async (
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ) => {
    if (isAuthenticated) {
      const convo = dbConversations.find(c => c.id === conversationId);
      if (convo) {
        const messages = [...(convo.messages as ConversationMessage[] || []), { role, content, timestamp: Date.now() }];
        await updateConversationMutation.mutateAsync({
          id: conversationId,
          messages,
          title: messages.length === 1 && role === "user" ? content.slice(0, 50) : undefined,
        });
      }
    } else {
      addGuestMessage(role, content);
    }
  };

  const setActiveConversation = (conversationId: string) => {
    if (!isAuthenticated) {
      setGuestActiveConversation(conversationId);
    }
  };

  const getActiveConvo = (): Conversation | GuestConversation | null => {
    if (isAuthenticated && dbConversations.length > 0) {
      return dbConversations[0];
    }
    return getActiveConversation();
  };

  return {
    conversations: getAllConversations(),
    conversationsByCategory: getConversationsByCategory(),
    activeConversation: getActiveConvo(),
    isLoading,
    isAuthenticated,
    createConversation,
    addMessage,
    setActiveConversation,
    syncGuestConversations: syncGuestConversationsMutation.mutateAsync,
    deleteConversation: deleteConversationMutation.mutateAsync,
    refetch,
  };
}
