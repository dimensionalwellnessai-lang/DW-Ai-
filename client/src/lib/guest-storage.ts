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

export interface DimensionAssessment {
  dimension: string;
  level: number; // 1-5 scale
  notes: string;
  supports: string[];
  lastUpdated: number;
}

export interface GettingToKnowYou {
  supportStyle: string | null;
  peakEnergyTime: string | null;
  dayStructure: string | null;
  currentNeeds: string[];
  completedAt: number | null;
}

export type BodyGoal = "slim_fit" | "build_muscle" | "tone" | "maintain" | "endurance" | "custom";
export type DietaryStyle = "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "paleo" | "custom";
export type WorkoutEnvironment = "gym" | "home" | "outdoors" | "studio";
export type WorkoutIntensity = "gentle" | "steady" | "focused" | "athlete";
export type RoutineType = "meditation" | "meal_plan" | "workout" | "budget_plan" | "spiritual_practice";

export type BudgetTier = "frugal" | "moderate" | "comfortable" | "flexible";
export type MoneyEmotion = "anxious" | "neutral" | "confident" | "empowered";
export type SpiritualPractice = "meditation" | "prayer" | "breathwork" | "journaling" | "gratitude" | "nature" | "yoga" | "mindfulness";
export type ReflectionCadence = "daily" | "few_times_week" | "weekly" | "as_needed";
export type GroundingNeed = "calm" | "clarity" | "connection" | "energy" | "release";

export interface BodyProfile {
  currentState: string;
  bodyGoal: BodyGoal | null;
  focusAreas: string[];
  measurements?: {
    weightKg?: number;
    heightCm?: number;
    bodyFatPercent?: number;
  };
  energyLevel: string;
  notes: string;
  updatedAt: number;
}

export interface MealPrepPreferences {
  dietaryStyle: DietaryStyle | null;
  restrictions: string[];
  allergies: string[];
  dislikedIngredients: string[];
  caloricTarget: number | null;
  mealsPerDay: number;
  syncWithBodyGoal: boolean;
  notes: string;
  updatedAt: number;
}

export interface WorkoutPreferences {
  environment: WorkoutEnvironment | null;
  availableEquipment: string[];
  sessionLengthMinutes: number;
  frequencyPerWeek: number;
  intensity: WorkoutIntensity | null;
  focusMuscleGroups: string[];
  injuryNotes: string;
  prefersAiCoaching: boolean;
  updatedAt: number;
}

export interface SavedRoutine {
  id: string;
  type: RoutineType;
  title: string;
  description: string;
  data: Record<string, unknown>;
  tags: string[];
  dimensionSignals?: string[];
  createdAt: number;
  lastUsedAt: number;
}

export interface FinanceProfile {
  budgetTier: BudgetTier | null;
  moneyEmotion: MoneyEmotion | null;
  savingsGoal: string | null;
  monthlyBudget: number | null;
  spendingBoundaries: string[];
  financialPriorities: string[];
  stressors: string[];
  notes: string;
  updatedAt: number;
}

export interface SpiritualProfile {
  practices: SpiritualPractice[];
  reflectionCadence: ReflectionCadence | null;
  groundingNeeds: GroundingNeed[];
  beliefSystem: string | null;
  values: string[];
  dailyIntention: string;
  gratitudeAreas: string[];
  notes: string;
  updatedAt: number;
}

export interface DimensionSignals {
  movementFocus: string | null;
  nutritionFocus: string | null;
  costTier: BudgetTier | null;
  mindfulState: GroundingNeed | null;
  bodyEnergy: string | null;
  financialStress: boolean;
}

export type WellnessDimension = 
  | "physical" 
  | "emotional" 
  | "social" 
  | "intellectual" 
  | "spiritual" 
  | "occupational" 
  | "financial" 
  | "environmental";

export interface DimensionFoundation {
  dimension: WellnessDimension;
  philosophy: string;
  nonNegotiables: string[];
  whatMatters: string;
  confidence: number;
  updatedAt: number;
}

export interface FoundationsProfile {
  overallPhilosophy: string;
  coreValues: string[];
  whatMattersMost: string;
  whatFeelsMisaligned: string;
  whatWontCompromise: string[];
  dimensionFoundations: DimensionFoundation[];
  confidence: number;
  clarifyingPrompts: string[];
  inferredFromConversations: boolean;
  updatedAt: number;
}

export type CommunityFocus = "volunteering" | "mentoring" | "advocacy" | "local_events" | "online_groups" | "donations";
export type AvailabilityLevel = "few_hours_month" | "weekly" | "bi_weekly" | "flexible";

export interface CommunityProfile {
  impactGoals: string[];
  preferredCauses: string[];
  focusAreas: CommunityFocus[];
  availability: AvailabilityLevel | null;
  locationCity: string | null;
  locationCountry: string | null;
  preferOnline: boolean;
  preferLocal: boolean;
  currentInvolvement: string[];
  notes: string;
  updatedAt: number;
}

export interface CommunityOpportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  type: CommunityFocus;
  isOnline: boolean;
  location: string | null;
  url: string | null;
  tags: string[];
  matchScore: number;
  discoveredAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  dimension: WellnessDimension | null;
  startTime: number;
  endTime: number;
  isAllDay: boolean;
  location: string | null;
  virtualLink: string | null;
  reminders: number[];
  recurring: boolean;
  recurrencePattern: string | null;
  relatedFoundationIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DimensionWellnessProfile {
  id: string;
  dimension: WellnessDimension;
  shortPhrase: string;
  anchorPlan: {
    coreIntention: string;
    earlySignals: string[];
    stabilizers: string[];
    safetyNet: string;
  };
  usageStory: string;
  rituals: string[];
  assessmentLevel: number;
  assessmentNotes: string;
  evidence: string[];
  aiSuggestions: {
    id: string;
    content: string;
    sourceConversationId: string | null;
    status: "pending" | "accepted" | "declined";
    createdAt: number;
  }[];
  updatedAt: number;
}

export interface GuestData {
  conversations: GuestConversation[];
  activeConversationId: string | null;
  mood: string | null;
  dimensionAssessments: DimensionAssessment[];
  gettingToKnowYou: GettingToKnowYou | null;
  bodyProfile: BodyProfile | null;
  mealPrepPreferences: MealPrepPreferences | null;
  workoutPreferences: WorkoutPreferences | null;
  financeProfile: FinanceProfile | null;
  spiritualProfile: SpiritualProfile | null;
  foundationsProfile: FoundationsProfile | null;
  communityProfile: CommunityProfile | null;
  communityOpportunities: CommunityOpportunity[];
  calendarEvents: CalendarEvent[];
  dimensionWellnessProfiles: DimensionWellnessProfile[];
  savedRoutines: SavedRoutine[];
  systemModules?: SystemModule[];
  scheduleEvents?: ScheduleEvent[];
  systemPreferences?: SystemPreferences;
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
      if (!parsed.dimensionAssessments) {
        parsed.dimensionAssessments = [];
      }
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
          dimensionAssessments: [],
          gettingToKnowYou: null,
          bodyProfile: null,
          mealPrepPreferences: null,
          workoutPreferences: null,
          financeProfile: null,
          spiritualProfile: null,
          foundationsProfile: null,
          communityProfile: null,
          communityOpportunities: [],
          calendarEvents: [],
          dimensionWellnessProfiles: [],
          savedRoutines: [],
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
    dimensionAssessments: [],
    gettingToKnowYou: null,
    bodyProfile: null,
    mealPrepPreferences: null,
    workoutPreferences: null,
    financeProfile: null,
    spiritualProfile: null,
    foundationsProfile: null,
    communityProfile: null,
    communityOpportunities: [],
    calendarEvents: [],
    dimensionWellnessProfiles: [],
    savedRoutines: [],
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

export function getDimensionAssessments(): DimensionAssessment[] {
  const data = getGuestData();
  return data?.dimensionAssessments || [];
}

export function getDimensionAssessment(dimension: string): DimensionAssessment | null {
  const assessments = getDimensionAssessments();
  return assessments.find(a => a.dimension === dimension) || null;
}

export function saveDimensionAssessment(assessment: DimensionAssessment): void {
  const data = getGuestData() || initGuestData();
  if (!data.dimensionAssessments) {
    data.dimensionAssessments = [];
  }
  const existing = data.dimensionAssessments.findIndex(a => a.dimension === assessment.dimension);
  if (existing >= 0) {
    data.dimensionAssessments[existing] = { ...assessment, lastUpdated: Date.now() };
  } else {
    data.dimensionAssessments.push({ ...assessment, lastUpdated: Date.now() });
  }
  saveGuestData(data);
}

export function getGettingToKnowYou(): GettingToKnowYou | null {
  const data = getGuestData();
  return data?.gettingToKnowYou || null;
}

export function saveGettingToKnowYou(gtky: GettingToKnowYou): void {
  const data = getGuestData() || initGuestData();
  data.gettingToKnowYou = gtky;
  saveGuestData(data);
}

export function hasCompletedOnboarding(): boolean {
  const gtky = getGettingToKnowYou();
  return gtky?.completedAt != null;
}

export function getBodyProfile(): BodyProfile | null {
  const data = getGuestData();
  return data?.bodyProfile || null;
}

export function saveBodyProfile(profile: BodyProfile): void {
  const data = getGuestData() || initGuestData();
  data.bodyProfile = { ...profile, updatedAt: Date.now() };
  saveGuestData(data);
}

export function hasCompletedBodyScan(): boolean {
  const profile = getBodyProfile();
  return profile?.bodyGoal != null;
}

export function getMealPrepPreferences(): MealPrepPreferences | null {
  const data = getGuestData();
  return data?.mealPrepPreferences || null;
}

export function saveMealPrepPreferences(prefs: MealPrepPreferences): void {
  const data = getGuestData() || initGuestData();
  data.mealPrepPreferences = { ...prefs, updatedAt: Date.now() };
  saveGuestData(data);
}

export function getWorkoutPreferences(): WorkoutPreferences | null {
  const data = getGuestData();
  return data?.workoutPreferences || null;
}

export function saveWorkoutPreferences(prefs: WorkoutPreferences): void {
  const data = getGuestData() || initGuestData();
  data.workoutPreferences = { ...prefs, updatedAt: Date.now() };
  saveGuestData(data);
}

export function getSavedRoutines(): SavedRoutine[] {
  const data = getGuestData();
  return data?.savedRoutines || [];
}

export function getSavedRoutinesByType(type: RoutineType): SavedRoutine[] {
  return getSavedRoutines().filter(r => r.type === type);
}

export function saveRoutine(routine: Omit<SavedRoutine, "id" | "createdAt" | "lastUsedAt">): SavedRoutine {
  const data = getGuestData() || initGuestData();
  if (!data.savedRoutines) data.savedRoutines = [];
  
  const newRoutine: SavedRoutine = {
    ...routine,
    id: generateId(),
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };
  
  data.savedRoutines.unshift(newRoutine);
  saveGuestData(data);
  return newRoutine;
}

export function updateRoutineLastUsed(routineId: string): void {
  const data = getGuestData();
  if (!data) return;
  
  const routine = data.savedRoutines?.find(r => r.id === routineId);
  if (routine) {
    routine.lastUsedAt = Date.now();
    saveGuestData(data);
  }
}

export function deleteRoutine(routineId: string): void {
  const data = getGuestData();
  if (!data || !data.savedRoutines) return;
  
  data.savedRoutines = data.savedRoutines.filter(r => r.id !== routineId);
  saveGuestData(data);
}

export function getFinanceProfile(): FinanceProfile | null {
  const data = getGuestData();
  return data?.financeProfile || null;
}

export function saveFinanceProfile(profile: FinanceProfile): void {
  const data = getGuestData() || initGuestData();
  data.financeProfile = { ...profile, updatedAt: Date.now() };
  saveGuestData(data);
}

export function hasCompletedFinanceProfile(): boolean {
  const profile = getFinanceProfile();
  return profile?.budgetTier != null;
}

export function getSpiritualProfile(): SpiritualProfile | null {
  const data = getGuestData();
  return data?.spiritualProfile || null;
}

export function saveSpiritualProfile(profile: SpiritualProfile): void {
  const data = getGuestData() || initGuestData();
  data.spiritualProfile = { ...profile, updatedAt: Date.now() };
  saveGuestData(data);
}

export function hasCompletedSpiritualProfile(): boolean {
  const profile = getSpiritualProfile();
  return profile?.practices != null && profile.practices.length > 0;
}

export function getDimensionSignals(): DimensionSignals {
  const body = getBodyProfile();
  const finance = getFinanceProfile();
  const spiritual = getSpiritualProfile();
  
  return {
    movementFocus: body?.bodyGoal || null,
    nutritionFocus: body?.bodyGoal || null,
    costTier: finance?.budgetTier || null,
    mindfulState: spiritual?.groundingNeeds?.[0] || null,
    bodyEnergy: body?.energyLevel || null,
    financialStress: finance?.moneyEmotion === "anxious",
  };
}

export function getFoundationsProfile(): FoundationsProfile | null {
  const data = getGuestData();
  return data?.foundationsProfile || null;
}

export function saveFoundationsProfile(profile: FoundationsProfile): void {
  const data = getGuestData() || initGuestData();
  data.foundationsProfile = { ...profile, updatedAt: Date.now() };
  saveGuestData(data);
}

export function getFoundationsConfidence(): number {
  const profile = getFoundationsProfile();
  return profile?.confidence || 0;
}

export function hasFoundations(): boolean {
  const profile = getFoundationsProfile();
  return profile != null && profile.confidence > 0.3;
}

export function getCommunityProfile(): CommunityProfile | null {
  const data = getGuestData();
  return data?.communityProfile || null;
}

export function saveCommunityProfile(profile: CommunityProfile): void {
  const data = getGuestData() || initGuestData();
  data.communityProfile = { ...profile, updatedAt: Date.now() };
  saveGuestData(data);
}

export function hasCompletedCommunityProfile(): boolean {
  const profile = getCommunityProfile();
  return profile?.focusAreas != null && profile.focusAreas.length > 0;
}

export function getCommunityOpportunities(): CommunityOpportunity[] {
  const data = getGuestData();
  return data?.communityOpportunities || [];
}

export function saveCommunityOpportunity(opp: Omit<CommunityOpportunity, "id" | "discoveredAt">): CommunityOpportunity {
  const data = getGuestData() || initGuestData();
  if (!data.communityOpportunities) data.communityOpportunities = [];
  
  const newOpp: CommunityOpportunity = {
    ...opp,
    id: generateId(),
    discoveredAt: Date.now(),
  };
  
  data.communityOpportunities.push(newOpp);
  saveGuestData(data);
  return newOpp;
}

export function getCalendarEvents(): CalendarEvent[] {
  const data = getGuestData();
  return data?.calendarEvents || [];
}

export function getCalendarEventsByDate(date: Date): CalendarEvent[] {
  const events = getCalendarEvents();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return events.filter(e => 
    (e.startTime >= startOfDay.getTime() && e.startTime <= endOfDay.getTime()) ||
    (e.isAllDay && new Date(e.startTime).toDateString() === date.toDateString())
  );
}

export function saveCalendarEvent(event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): CalendarEvent {
  const data = getGuestData() || initGuestData();
  if (!data.calendarEvents) data.calendarEvents = [];
  
  const newEvent: CalendarEvent = {
    ...event,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.calendarEvents.push(newEvent);
  saveGuestData(data);
  return newEvent;
}

export function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
  const data = getGuestData();
  if (!data?.calendarEvents) return null;
  
  const index = data.calendarEvents.findIndex(e => e.id === eventId);
  if (index < 0) return null;
  
  data.calendarEvents[index] = { 
    ...data.calendarEvents[index], 
    ...updates, 
    updatedAt: Date.now() 
  };
  saveGuestData(data);
  return data.calendarEvents[index];
}

export function deleteCalendarEvent(eventId: string): void {
  const data = getGuestData();
  if (!data?.calendarEvents) return;
  
  data.calendarEvents = data.calendarEvents.filter(e => e.id !== eventId);
  saveGuestData(data);
}

export function getDimensionWellnessProfiles(): DimensionWellnessProfile[] {
  const data = getGuestData();
  return data?.dimensionWellnessProfiles || [];
}

export function getDimensionWellnessProfile(dimension: WellnessDimension): DimensionWellnessProfile | null {
  const profiles = getDimensionWellnessProfiles();
  return profiles.find(p => p.dimension === dimension) || null;
}

export function saveDimensionWellnessProfile(profile: Omit<DimensionWellnessProfile, "id" | "updatedAt">): DimensionWellnessProfile {
  const data = getGuestData() || initGuestData();
  if (!data.dimensionWellnessProfiles) data.dimensionWellnessProfiles = [];
  
  const existingIndex = data.dimensionWellnessProfiles.findIndex(p => p.dimension === profile.dimension);
  
  const newProfile: DimensionWellnessProfile = {
    ...profile,
    id: existingIndex >= 0 ? data.dimensionWellnessProfiles[existingIndex].id : generateId(),
    updatedAt: Date.now(),
  };
  
  if (existingIndex >= 0) {
    data.dimensionWellnessProfiles[existingIndex] = newProfile;
  } else {
    data.dimensionWellnessProfiles.push(newProfile);
  }
  
  saveGuestData(data);
  return newProfile;
}

export function updateDimensionWellnessProfile(dimension: WellnessDimension, updates: Partial<DimensionWellnessProfile>): DimensionWellnessProfile | null {
  const data = getGuestData();
  if (!data?.dimensionWellnessProfiles) return null;
  
  const index = data.dimensionWellnessProfiles.findIndex(p => p.dimension === dimension);
  if (index < 0) return null;
  
  data.dimensionWellnessProfiles[index] = { 
    ...data.dimensionWellnessProfiles[index], 
    ...updates, 
    updatedAt: Date.now() 
  };
  saveGuestData(data);
  return data.dimensionWellnessProfiles[index];
}

export function addAiSuggestionToDimension(
  dimension: WellnessDimension, 
  content: string, 
  sourceConversationId: string | null
): void {
  const data = getGuestData() || initGuestData();
  if (!data.dimensionWellnessProfiles) data.dimensionWellnessProfiles = [];
  
  let profile = data.dimensionWellnessProfiles.find(p => p.dimension === dimension);
  
  if (!profile) {
    profile = {
      id: generateId(),
      dimension,
      shortPhrase: "",
      anchorPlan: { coreIntention: "", earlySignals: [], stabilizers: [], safetyNet: "" },
      usageStory: "",
      rituals: [],
      assessmentLevel: 0,
      assessmentNotes: "",
      evidence: [],
      aiSuggestions: [],
      updatedAt: Date.now(),
    };
    data.dimensionWellnessProfiles.push(profile);
  }
  
  profile.aiSuggestions.push({
    id: generateId(),
    content,
    sourceConversationId,
    status: "pending",
    createdAt: Date.now(),
  });
  profile.updatedAt = Date.now();
  
  saveGuestData(data);
}

export function respondToAiSuggestion(
  dimension: WellnessDimension, 
  suggestionId: string, 
  accept: boolean
): void {
  const data = getGuestData();
  if (!data?.dimensionWellnessProfiles) return;
  
  const profile = data.dimensionWellnessProfiles.find(p => p.dimension === dimension);
  if (!profile) return;
  
  const suggestion = profile.aiSuggestions.find(s => s.id === suggestionId);
  if (!suggestion) return;
  
  suggestion.status = accept ? "accepted" : "declined";
  
  if (accept) {
    profile.evidence.push(suggestion.content);
  }
  
  profile.updatedAt = Date.now();
  saveGuestData(data);
}

export type SystemType = "wake_up" | "training" | "meals" | "meal_prep" | "wind_down" | "meditation" | "spiritual";

export interface RoutineStep {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  isOptional: boolean;
  linkedSubsystem: SystemType | null;
}

export interface SystemModule {
  id: string;
  systemType: SystemType;
  name: string;
  description: string;
  isEnabled: boolean;
  settings: Record<string, unknown>;
  routineSteps: RoutineStep[];
  linkedSubsystems: SystemType[];
  conditionalLogic: {
    condition: string;
    linkedSystem: SystemType;
    showWhenTrue: boolean;
  }[];
  updatedAt: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  scheduledTime: string;
  endTime: string | null;
  dayOfWeek: number | null;
  systemReference: string | null;
  systemType: SystemType | null;
  isRecurring: boolean;
  notes: string;
  createdAt: number;
}

export interface SystemPreferences {
  enabledSystems: SystemType[];
  meditationEnabled: boolean;
  spiritualEnabled: boolean;
  astrologyEnabled: boolean;
  journalingEnabled: boolean;
  mealContainersEnabled: boolean;
  aiRoutingEnabled: boolean;
  preferredWakeTime: string | null;
  preferredSleepTime: string | null;
  updatedAt: number;
}

const DEFAULT_SYSTEM_PREFERENCES: SystemPreferences = {
  enabledSystems: ["wake_up", "meals", "training", "wind_down"],
  meditationEnabled: false,
  spiritualEnabled: false,
  astrologyEnabled: false,
  journalingEnabled: true,
  mealContainersEnabled: true,
  aiRoutingEnabled: true,
  preferredWakeTime: "07:00",
  preferredSleepTime: "22:00",
  updatedAt: Date.now(),
};

export function getSystemPreferences(): SystemPreferences {
  const data = getGuestData();
  return data?.systemPreferences || DEFAULT_SYSTEM_PREFERENCES;
}

export function saveSystemPreferences(prefs: Partial<SystemPreferences>): void {
  const data = getGuestData() || initGuestData();
  data.systemPreferences = { ...getSystemPreferences(), ...prefs, updatedAt: Date.now() };
  saveGuestData(data);
}

export function isSystemEnabled(systemType: SystemType): boolean {
  const prefs = getSystemPreferences();
  return prefs.enabledSystems.includes(systemType);
}

export function toggleSystem(systemType: SystemType, enabled: boolean): void {
  const prefs = getSystemPreferences();
  const enabledSystems = enabled 
    ? Array.from(new Set([...prefs.enabledSystems, systemType]))
    : prefs.enabledSystems.filter(s => s !== systemType);
  saveSystemPreferences({ enabledSystems });
}

export function getSystemModules(): SystemModule[] {
  const data = getGuestData();
  return data?.systemModules || [];
}

export function getSystemModule(systemType: SystemType): SystemModule | null {
  const modules = getSystemModules();
  return modules.find(m => m.systemType === systemType) || null;
}

export function saveSystemModule(module: Omit<SystemModule, "id" | "updatedAt">): SystemModule {
  const data = getGuestData() || initGuestData();
  if (!data.systemModules) data.systemModules = [];
  
  const existingIndex = data.systemModules.findIndex(m => m.systemType === module.systemType);
  
  const newModule: SystemModule = {
    ...module,
    id: existingIndex >= 0 ? data.systemModules[existingIndex].id : generateId(),
    updatedAt: Date.now(),
  };
  
  if (existingIndex >= 0) {
    data.systemModules[existingIndex] = newModule;
  } else {
    data.systemModules.push(newModule);
  }
  
  saveGuestData(data);
  return newModule;
}

export function getScheduleEvents(): ScheduleEvent[] {
  const data = getGuestData();
  return data?.scheduleEvents || [];
}

export function getScheduleEventsByDay(dayOfWeek: number): ScheduleEvent[] {
  return getScheduleEvents().filter(e => e.dayOfWeek === dayOfWeek || e.isRecurring);
}

export function saveScheduleEvent(event: Omit<ScheduleEvent, "id" | "createdAt">): ScheduleEvent {
  const data = getGuestData() || initGuestData();
  if (!data.scheduleEvents) data.scheduleEvents = [];
  
  const newEvent: ScheduleEvent = {
    ...event,
    id: generateId(),
    createdAt: Date.now(),
  };
  
  data.scheduleEvents.push(newEvent);
  saveGuestData(data);
  return newEvent;
}

export function saveScheduleEventWithId(event: ScheduleEvent): void {
  const data = getGuestData() || initGuestData();
  if (!data.scheduleEvents) data.scheduleEvents = [];
  const existingIndex = data.scheduleEvents.findIndex(e => e.id === event.id);
  if (existingIndex >= 0) {
    data.scheduleEvents[existingIndex] = event;
  } else {
    data.scheduleEvents.push(event);
  }
  saveGuestData(data);
}

export function updateScheduleEvent(eventId: string, updates: Partial<ScheduleEvent>): ScheduleEvent | null {
  const data = getGuestData();
  if (!data?.scheduleEvents) return null;
  
  const index = data.scheduleEvents.findIndex(e => e.id === eventId);
  if (index < 0) return null;
  
  data.scheduleEvents[index] = { ...data.scheduleEvents[index], ...updates };
  saveGuestData(data);
  return data.scheduleEvents[index];
}

export function deleteScheduleEvent(eventId: string): void {
  const data = getGuestData();
  if (!data?.scheduleEvents) return;
  
  data.scheduleEvents = data.scheduleEvents.filter(e => e.id !== eventId);
  saveGuestData(data);
}

export function shouldShowSubsystem(parentSystem: SystemType, subsystem: SystemType): boolean {
  const prefs = getSystemPreferences();
  const parentModule = getSystemModule(parentSystem);
  
  if (!parentModule) return false;
  
  const condition = parentModule.conditionalLogic?.find(c => c.linkedSystem === subsystem);
  if (!condition) return true;
  
  switch (condition.condition) {
    case "meditation_enabled":
      return prefs.meditationEnabled === condition.showWhenTrue;
    case "spiritual_enabled":
      return prefs.spiritualEnabled === condition.showWhenTrue;
    case "astrology_enabled":
      return prefs.astrologyEnabled === condition.showWhenTrue;
    case "journaling_enabled":
      return prefs.journalingEnabled === condition.showWhenTrue;
    default:
      return true;
  }
}
