const GUEST_DATA_KEY = "dwai_guest_data";
const GUEST_SESSION_KEY = "dwai_guest_session";

export interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

export interface GuestConversation {
  id: string;
  title: string;
  category: string;
  messages: ChatMessage[];
  createdAt: number;
  lastMessageAt: number;
}

export interface GuestData {
  conversations: GuestConversation[];
  activeConversationId: string | null;
  mood: string | null;
  preferences: {
    themeMode: "accent-only" | "full-background";
  };
  createdAt: number;
  lastActiveAt: number;
}

const CATEGORIES = [
  { id: "planning", keywords: ["plan", "schedule", "organize", "todo", "task", "goal"] },
  { id: "emotional", keywords: ["feel", "emotion", "stress", "anxious", "sad", "happy", "worried", "overwhelm"] },
  { id: "wellness", keywords: ["health", "exercise", "sleep", "meditat", "breath", "relax", "calm"] },
  { id: "productivity", keywords: ["work", "focus", "productiv", "habit", "routine"] },
  { id: "relationships", keywords: ["friend", "family", "relationship", "social", "people"] },
];

function detectCategory(messages: ChatMessage[]): string {
  const text = messages.map(m => m.content.toLowerCase()).join(" ");
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(keyword => text.includes(keyword))) {
      return cat.id;
    }
  }
  return "general";
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === "user");
  if (firstUserMessage) {
    const content = firstUserMessage.content;
    if (content.length <= 40) return content;
    return content.substring(0, 37) + "...";
  }
  return "New conversation";
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getGuestData(): GuestData | null {
  try {
    const data = localStorage.getItem(GUEST_DATA_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.messages && !parsed.conversations) {
        const conversations: GuestConversation[] = [];
        if (parsed.messages.length > 0) {
          conversations.push({
            id: generateId(),
            title: generateTitle(parsed.messages),
            category: detectCategory(parsed.messages),
            messages: parsed.messages,
            createdAt: parsed.createdAt || Date.now(),
            lastMessageAt: Date.now(),
          });
        }
        return {
          conversations,
          activeConversationId: conversations[0]?.id || null,
          mood: parsed.mood || null,
          preferences: parsed.preferences || { themeMode: "accent-only" },
          createdAt: parsed.createdAt || Date.now(),
          lastActiveAt: Date.now(),
        };
      }
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse guest data:", e);
  }
  return null;
}

export function saveGuestData(data: GuestData): void {
  try {
    data.lastActiveAt = Date.now();
    localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save guest data:", e);
  }
}

export function initGuestData(): GuestData {
  const existing = getGuestData();
  if (existing) {
    return existing;
  }
  
  const newData: GuestData = {
    conversations: [],
    activeConversationId: null,
    mood: null,
    preferences: {
      themeMode: "accent-only",
    },
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  
  saveGuestData(newData);
  return newData;
}

export function clearGuestData(): void {
  localStorage.removeItem(GUEST_DATA_KEY);
  localStorage.removeItem(GUEST_SESSION_KEY);
}

export function isGuestSession(): boolean {
  return localStorage.getItem(GUEST_SESSION_KEY) === "true";
}

export function setGuestSession(isGuest: boolean): void {
  if (isGuest) {
    localStorage.setItem(GUEST_SESSION_KEY, "true");
  } else {
    localStorage.removeItem(GUEST_SESSION_KEY);
  }
}

export function getActiveConversation(): GuestConversation | null {
  const data = getGuestData();
  if (!data || !data.activeConversationId) return null;
  return data.conversations.find(c => c.id === data.activeConversationId) || null;
}

export function createNewConversation(): GuestConversation {
  const data = getGuestData() || initGuestData();
  const newConvo: GuestConversation = {
    id: generateId(),
    title: "New conversation",
    category: "general",
    messages: [],
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
  };
  data.conversations.unshift(newConvo);
  data.activeConversationId = newConvo.id;
  saveGuestData(data);
  return newConvo;
}

export function addMessageToConversation(
  role: "assistant" | "user",
  content: string
): GuestConversation {
  const data = getGuestData() || initGuestData();
  
  let conversation = data.conversations.find(c => c.id === data.activeConversationId);
  
  if (!conversation) {
    conversation = createNewConversation();
    data.conversations = [conversation, ...data.conversations.filter(c => c.id !== conversation!.id)];
    data.activeConversationId = conversation.id;
  }
  
  conversation.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  
  conversation.lastMessageAt = Date.now();
  conversation.title = generateTitle(conversation.messages);
  conversation.category = detectCategory(conversation.messages);
  
  saveGuestData(data);
  return conversation;
}

export function setActiveConversation(conversationId: string): void {
  const data = getGuestData();
  if (data) {
    data.activeConversationId = conversationId;
    saveGuestData(data);
  }
}

export function getConversationsByCategory(): Record<string, GuestConversation[]> {
  const data = getGuestData();
  if (!data) return {};
  
  const grouped: Record<string, GuestConversation[]> = {};
  for (const convo of data.conversations) {
    if (!grouped[convo.category]) {
      grouped[convo.category] = [];
    }
    grouped[convo.category].push(convo);
  }
  return grouped;
}

export function getAllConversations(): GuestConversation[] {
  const data = getGuestData();
  return data?.conversations || [];
}

export function updateGuestMood(mood: string | null): void {
  const data = getGuestData() || initGuestData();
  data.mood = mood;
  saveGuestData(data);
}

export function updateGuestPreferences(
  preferences: Partial<GuestData["preferences"]>
): void {
  const data = getGuestData() || initGuestData();
  data.preferences = { ...data.preferences, ...preferences };
  saveGuestData(data);
}

export function getGuestMessageCount(): number {
  const data = getGuestData();
  if (!data) return 0;
  return data.conversations.reduce((acc, c) => acc + c.messages.length, 0);
}
