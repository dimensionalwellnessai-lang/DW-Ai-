const GUEST_DATA_KEY = "dwai_guest_data";
const GUEST_SESSION_KEY = "dwai_guest_session";

export interface AiLearning {
  topic: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface GuestData {
  messages: Array<{
    role: "assistant" | "user";
    content: string;
    category?: string;
    attachments?: { name: string; type: string; url: string }[];
    timestamp: number;
  }>;
  mood: string | null;
  preferences: {
    themeMode: "accent-only" | "full-background";
  };
  learnings: AiLearning[];
  createdAt: number;
  lastActiveAt: number;
}

export function getGuestData(): GuestData | null {
  try {
    const data = localStorage.getItem(GUEST_DATA_KEY);
    if (data) {
      return JSON.parse(data);
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
    if (!existing.learnings) {
      existing.learnings = [];
    }
    return existing;
  }
  
  const newData: GuestData = {
    messages: [],
    mood: null,
    preferences: {
      themeMode: "accent-only",
    },
    learnings: [],
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

export function addGuestMessage(
  role: "assistant" | "user",
  content: string,
  category?: string,
  attachments?: { name: string; type: string; url: string }[]
): void {
  const data = getGuestData() || initGuestData();
  data.messages.push({
    role,
    content,
    category,
    attachments,
    timestamp: Date.now(),
  });
  saveGuestData(data);
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
  return data?.messages.length || 0;
}

export function addGuestLearning(topic: string, details: Record<string, unknown>): void {
  const data = getGuestData() || initGuestData();
  if (!data.learnings) {
    data.learnings = [];
  }
  const existingIndex = data.learnings.findIndex(l => l.topic === topic);
  if (existingIndex >= 0) {
    data.learnings[existingIndex] = { topic, details, timestamp: Date.now() };
  } else {
    data.learnings.push({ topic, details, timestamp: Date.now() });
  }
  saveGuestData(data);
}

export function getGuestLearnings(): AiLearning[] {
  const data = getGuestData();
  return data?.learnings || [];
}
