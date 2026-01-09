const GUEST_DATA_KEY = "fts_guest_data";
const GUEST_SESSION_KEY = "fts_guest_session";
const CHAT_DRAFT_KEY = "fts_chat_draft";
const BODY_SCAN_DRAFT_KEY = "fts_body_scan_draft";
const SESSION_STARTED_KEY = "fts_session_started";
const LAST_ACTIVITY_KEY = "fts_last_activity";
const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes - if gap is longer, treat as new session

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

export interface BodyPhoto {
  id: string;
  dataUrl: string;
  pose: "front" | "side" | "back";
  capturedAt: number;
}

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
  photos?: BodyPhoto[];
  updatedAt: number;
}

export interface MealPrepPreferences {
  dietaryStyle: DietaryStyle | null;
  restrictions: string[];
  allergies: string[];
  dislikedIngredients: string[];
  bannedIngredients: string[];
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

export interface IngredientSubstitute {
  original: string;
  alternatives: string[];
  reason?: string;
}

export interface SavedRecipe {
  id: string;
  title: string;
  description: string;
  source: string | null;
  sourceUrl: string | null;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: { name: string; amount: string; unit: string; category: string }[];
  ingredientSubstitutes?: IngredientSubstitute[];
  instructions: string[];
  tags: string[];
  dietaryTags: string[];
  notes: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
  isChecked: boolean;
  isInPantry: boolean;
  sourceRecipeIds: string[];
  sourceMealPlanIds: string[];
  notes: string;
  addedAt: number;
}

export interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  isActive: boolean;
  shoppingDate: number | null;
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

export type ImportedDocumentType = 
  | "work_schedule" 
  | "recipe" 
  | "dietary_restrictions" 
  | "brainstorm" 
  | "workout_plan"
  | "budget"
  | "goals"
  | "journal"
  | "other";

export interface ImportedDocument {
  id: string;
  type: ImportedDocumentType;
  title: string;
  content: string;
  parsedData: Record<string, unknown>;
  linkedSystems: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatFeedback {
  id: string;
  messageId: string;
  type: "positive" | "negative";
  comment?: string;
  context: "main" | "talk-it-out";
  createdAt: number;
}

export type UserResourceType = "workout" | "meal_plan";
export type UserResourceVariant = "link" | "file";

export interface UserResource {
  id: string;
  resourceType: UserResourceType;
  variant: UserResourceVariant;
  title: string;
  description: string;
  url?: string;
  fileData?: {
    fileName: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  };
  tags: string[];
  calendarEventId?: string;
  createdAt: number;
  updatedAt: number;
}

export type SoftOnboardingMood = "calm" | "heavy" | "scattered" | "pushing" | "unsure";

export interface SoftOnboarding {
  completed: boolean;
  mood: SoftOnboardingMood | null;
  completedAt: number | null;
}

export type OnboardingLogType = "grounding_practice" | "perspective_shift" | "next_hour_plan" | "session_started";

export type WeeklyRhythm = "structured" | "flexible" | "mixed" | "varies";
export type LifeDimension = "physical" | "emotional" | "mental" | "spiritual" | "financial" | "career" | "relationships" | "family" | "social" | "creative" | "learning" | "environment" | "purpose";

export interface ProfileSetup {
  weeklyRhythm: WeeklyRhythm | null;
  primaryFocus: LifeDimension | null;
  metDW: boolean;
  completedAt: number | null;
}

export interface OnboardingLog {
  id: string;
  type: OnboardingLogType;
  title: string;
  content: string;
  actionStep?: string;
  energyStates: string[];
  backgroundContext: string[];
  dimensionTags: string[];
  createdAt: number;
}

export type PlanningHorizon = "today" | "week" | "month";
export type PlanningDomain = "meals" | "workouts" | "general";

export interface PlanningScope {
  domain: PlanningDomain;
  horizon: PlanningHorizon;
  setAt: number;
}

export interface ContentRotation {
  domain: PlanningDomain;
  lastRotatedAt: number;
  currentIndex: number;
  rotationHistory: string[];
  moodBasedSeed: string | null;
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
  importedDocuments?: ImportedDocument[];
  chatFeedback?: ChatFeedback[];
  softOnboarding?: SoftOnboarding;
  profileSetup?: ProfileSetup;
  userResources?: UserResource[];
  planningScopes?: PlanningScope[];
  contentRotations?: ContentRotation[];
  savedRecipes?: SavedRecipe[];
  groceryLists?: GroceryList[];
  domainExclusions?: Record<string, { domain: string; exclusions: string[]; updatedAt: number }>;
  onboardingLogs?: OnboardingLog[];
  preferences: {
    themeMode: "accent-only" | "full-background";
    useMetricUnits?: boolean;
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

export function deleteMessageFromConversation(messageIndex: number): GuestConversation | null {
  const data = getGuestData();
  if (!data || !data.activeConversationId) return null;
  
  const conversation = data.conversations.find(c => c.id === data.activeConversationId);
  if (!conversation) return null;
  
  conversation.messages = conversation.messages.filter((_, i) => i !== messageIndex);
  conversation.lastMessageAt = Date.now();
  
  if (conversation.messages.length > 0) {
    conversation.title = generateTitle(conversation.messages);
    conversation.category = detectCategory(conversation.messages);
  }
  
  saveGuestData(data);
  return conversation;
}

export function clearActiveConversation(): void {
  const data = getGuestData();
  if (data) {
    data.activeConversationId = null;
    saveGuestData(data);
  }
}

export function saveGuestConversation(conversation: GuestConversation): void {
  const data = getGuestData();
  if (!data) return;
  
  const index = data.conversations.findIndex(c => c.id === conversation.id);
  if (index >= 0) {
    data.conversations[index] = conversation;
    saveGuestData(data);
  }
}

export function isNewSession(): boolean {
  // Check if sessionStorage flag is set (covers tab close/open)
  if (sessionStorage.getItem(SESSION_STARTED_KEY) !== "true") {
    return true;
  }
  
  // Also check time gap since last activity (covers app being idle)
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (lastActivity) {
    const gap = Date.now() - parseInt(lastActivity, 10);
    if (gap > SESSION_GAP_MS) {
      return true;
    }
  }
  
  return false;
}

export function markSessionStarted(): void {
  sessionStorage.setItem(SESSION_STARTED_KEY, "true");
  updateLastActivity();
}

export function updateLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function startFreshSession(): boolean {
  if (isNewSession()) {
    clearActiveConversation();
    markSessionStarted();
    return true; // Session was reset
  } else {
    // Update activity timestamp even for continuing sessions
    updateLastActivity();
    return false; // Session continues
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

const ONBOARDING_COOLDOWN_KEY = "fts_onboarding_dismissed";
const ONBOARDING_COMPLETED_KEY = "fts_onboarding_completed";
const ONBOARDING_COOLDOWN_DAYS = 7;

export function dismissOnboardingDialog(): void {
  localStorage.setItem(ONBOARDING_COOLDOWN_KEY, Date.now().toString());
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
}

export function shouldShowOnboardingDialog(): boolean {
  if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true") {
    return false;
  }
  
  const gtky = getGettingToKnowYou();
  if (gtky?.completedAt != null) {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    return false;
  }
  
  const dismissedAt = localStorage.getItem(ONBOARDING_COOLDOWN_KEY);
  if (!dismissedAt) {
    return true;
  }
  
  const dismissedTime = parseInt(dismissedAt, 10);
  const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
  return daysSinceDismissed >= ONBOARDING_COOLDOWN_DAYS;
}

const SOFT_ONBOARDING_KEY = "fts_soft_onboarding_completed";
const SOFT_ONBOARDING_SESSION_KEY = "fts_soft_onboarding_shown_this_session";

export function getSoftOnboarding(): SoftOnboarding | null {
  const data = getGuestData();
  return data?.softOnboarding || null;
}

export function saveSoftOnboarding(mood: SoftOnboardingMood): void {
  const data = getGuestData() || initGuestData();
  data.softOnboarding = {
    completed: true,
    mood,
    completedAt: Date.now(),
  };
  data.mood = mood;
  saveGuestData(data);
  localStorage.setItem(SOFT_ONBOARDING_KEY, "true");
  sessionStorage.setItem(SOFT_ONBOARDING_SESSION_KEY, "true");
}

export function skipSoftOnboarding(): void {
  localStorage.setItem(SOFT_ONBOARDING_KEY, "skipped");
  sessionStorage.setItem(SOFT_ONBOARDING_SESSION_KEY, "true");
}

export function markSoftOnboardingShownThisSession(): void {
  sessionStorage.setItem(SOFT_ONBOARDING_SESSION_KEY, "true");
}

export function shouldShowSoftOnboarding(): boolean {
  if (sessionStorage.getItem(SOFT_ONBOARDING_SESSION_KEY) === "true") {
    return false;
  }
  const flag = localStorage.getItem(SOFT_ONBOARDING_KEY);
  if (flag === "true" || flag === "skipped") {
    return false;
  }
  const data = getGuestData();
  if (data?.softOnboarding?.completed) {
    return false;
  }
  if (data?.conversations && data.conversations.length > 0) {
    return false;
  }
  return true;
}

export function getSoftOnboardingMood(): SoftOnboardingMood | null {
  const data = getGuestData();
  return data?.softOnboarding?.mood || null;
}

const SOFT_ONBOARDING_PROGRESS_KEY = "fts_soft_onboarding_progress";

export interface SoftOnboardingProgress {
  step: number;
  selectedEnergies: SoftOnboardingMood[];
  selectedBackgrounds: string[];
  selectedResponse: string | null;
}

export function getSoftOnboardingProgress(): SoftOnboardingProgress | null {
  const stored = localStorage.getItem(SOFT_ONBOARDING_PROGRESS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveSoftOnboardingProgress(progress: SoftOnboardingProgress | null): void {
  if (progress === null) {
    localStorage.removeItem(SOFT_ONBOARDING_PROGRESS_KEY);
  } else {
    localStorage.setItem(SOFT_ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
  }
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

export function getUseMetricUnits(): boolean {
  const data = getGuestData();
  return data?.preferences?.useMetricUnits ?? true;
}

export function setUseMetricUnits(useMetric: boolean): void {
  const data = getGuestData() || initGuestData();
  data.preferences = { ...data.preferences, useMetricUnits: useMetric };
  saveGuestData(data);
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

export function getBannedIngredients(): string[] {
  const prefs = getMealPrepPreferences();
  return prefs?.bannedIngredients || [];
}

export function addBannedIngredient(ingredient: string): void {
  const prefs = getMealPrepPreferences() || {
    dietaryStyle: null,
    restrictions: [],
    allergies: [],
    dislikedIngredients: [],
    bannedIngredients: [],
    caloricTarget: null,
    mealsPerDay: 3,
    syncWithBodyGoal: false,
    notes: "",
    updatedAt: Date.now()
  };
  
  const normalized = ingredient.toLowerCase().trim();
  if (!prefs.bannedIngredients.includes(normalized)) {
    prefs.bannedIngredients = [...prefs.bannedIngredients, normalized];
    saveMealPrepPreferences(prefs);
  }
}

export function removeBannedIngredient(ingredient: string): void {
  const prefs = getMealPrepPreferences();
  if (!prefs) return;
  
  const normalized = ingredient.toLowerCase().trim();
  prefs.bannedIngredients = prefs.bannedIngredients.filter(i => i !== normalized);
  saveMealPrepPreferences(prefs);
}

export function getAllExcludedIngredients(): string[] {
  const prefs = getMealPrepPreferences();
  if (!prefs) return [];
  
  const excluded = new Set<string>();
  prefs.bannedIngredients.forEach(i => excluded.add(i.toLowerCase()));
  prefs.allergies.forEach(i => excluded.add(i.toLowerCase()));
  prefs.dislikedIngredients.forEach(i => excluded.add(i.toLowerCase()));
  
  return Array.from(excluded);
}

export type AlternativesDomain = "meals" | "workouts" | "recovery" | "spiritual" | "community";

export interface DomainExclusions {
  domain: AlternativesDomain;
  exclusions: string[];
  updatedAt: number;
}

export function getDomainExclusions(domain: AlternativesDomain): string[] {
  if (domain === "meals") {
    return getAllExcludedIngredients();
  }
  
  const data = getGuestData();
  const domainData = data?.domainExclusions?.[domain];
  return domainData?.exclusions || [];
}

export function addDomainExclusion(domain: AlternativesDomain, item: string): void {
  if (domain === "meals") {
    addBannedIngredient(item);
    return;
  }
  
  const data = getGuestData() || initGuestData();
  if (!data.domainExclusions) {
    data.domainExclusions = {};
  }
  
  const normalized = item.toLowerCase().trim();
  const existing = data.domainExclusions[domain] || { domain, exclusions: [], updatedAt: Date.now() };
  
  if (!existing.exclusions.includes(normalized)) {
    existing.exclusions = [...existing.exclusions, normalized];
    existing.updatedAt = Date.now();
    data.domainExclusions[domain] = existing;
    saveGuestData(data);
  }
}

export function removeDomainExclusion(domain: AlternativesDomain, item: string): void {
  if (domain === "meals") {
    removeBannedIngredient(item);
    return;
  }
  
  const data = getGuestData();
  if (!data?.domainExclusions?.[domain]) return;
  
  const normalized = item.toLowerCase().trim();
  data.domainExclusions[domain].exclusions = data.domainExclusions[domain].exclusions.filter(
    (i: string) => i !== normalized
  );
  data.domainExclusions[domain].updatedAt = Date.now();
  saveGuestData(data);
}

export function getAllDomainExclusions(): Record<AlternativesDomain, string[]> {
  return {
    meals: getAllExcludedIngredients(),
    workouts: getDomainExclusions("workouts"),
    recovery: getDomainExclusions("recovery"),
    spiritual: getDomainExclusions("spiritual"),
    community: getDomainExclusions("community")
  };
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

export function getImportedDocuments(): ImportedDocument[] {
  const data = getGuestData();
  return data?.importedDocuments || [];
}

export function getImportedDocumentsByType(type: ImportedDocumentType): ImportedDocument[] {
  return getImportedDocuments().filter(d => d.type === type);
}

export function saveImportedDocument(doc: Omit<ImportedDocument, "id" | "createdAt" | "updatedAt">): ImportedDocument {
  const data = getGuestData() || initGuestData();
  if (!data.importedDocuments) data.importedDocuments = [];
  
  const newDoc: ImportedDocument = {
    ...doc,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.importedDocuments.push(newDoc);
  saveGuestData(data);
  return newDoc;
}

export function updateImportedDocument(docId: string, updates: Partial<ImportedDocument>): ImportedDocument | null {
  const data = getGuestData();
  if (!data?.importedDocuments) return null;
  
  const index = data.importedDocuments.findIndex(d => d.id === docId);
  if (index < 0) return null;
  
  data.importedDocuments[index] = { 
    ...data.importedDocuments[index], 
    ...updates, 
    updatedAt: Date.now() 
  };
  saveGuestData(data);
  return data.importedDocuments[index];
}

export function deleteImportedDocument(docId: string): void {
  const data = getGuestData();
  if (!data?.importedDocuments) return;
  
  data.importedDocuments = data.importedDocuments.filter(d => d.id !== docId);
  saveGuestData(data);
}

export function getLifeSystemContext(): Record<string, unknown> {
  const data = getGuestData();
  if (!data) return {};
  
  return {
    preferences: getSystemPreferences(),
    scheduleEvents: getScheduleEvents(),
    mealPrepPreferences: data.mealPrepPreferences,
    workoutPreferences: data.workoutPreferences,
    bodyProfile: data.bodyProfile,
    financeProfile: data.financeProfile,
    spiritualProfile: data.spiritualProfile,
    gettingToKnowYou: data.gettingToKnowYou,
    importedDocuments: data.importedDocuments || [],
    dimensionAssessments: data.dimensionAssessments,
    savedRoutines: data.savedRoutines,
  };
}

export function saveChatFeedback(
  messageId: string, 
  type: "positive" | "negative", 
  context: "main" | "talk-it-out",
  comment?: string
): ChatFeedback {
  const data = getGuestData() || initGuestData();
  if (!data.chatFeedback) data.chatFeedback = [];
  
  const feedback: ChatFeedback = {
    id: generateId(),
    messageId,
    type,
    comment,
    context,
    createdAt: Date.now(),
  };
  
  data.chatFeedback.push(feedback);
  saveGuestData(data);
  return feedback;
}

export function getChatFeedback(): ChatFeedback[] {
  const data = getGuestData();
  return data?.chatFeedback || [];
}

export function getUserResources(): UserResource[] {
  const data = getGuestData();
  return data?.userResources || [];
}

export function getUserResourcesByType(resourceType: UserResourceType): UserResource[] {
  return getUserResources().filter(r => r.resourceType === resourceType);
}

export function saveUserResource(resource: Omit<UserResource, "id" | "createdAt" | "updatedAt">): UserResource {
  const data = getGuestData() || initGuestData();
  if (!data.userResources) data.userResources = [];
  
  const newResource: UserResource = {
    ...resource,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.userResources.unshift(newResource);
  saveGuestData(data);
  return newResource;
}

export function updateUserResource(resourceId: string, updates: Partial<UserResource>): UserResource | null {
  const data = getGuestData();
  if (!data?.userResources) return null;
  
  const index = data.userResources.findIndex(r => r.id === resourceId);
  if (index < 0) return null;
  
  data.userResources[index] = { 
    ...data.userResources[index], 
    ...updates, 
    updatedAt: Date.now() 
  };
  saveGuestData(data);
  return data.userResources[index];
}

export function deleteUserResource(resourceId: string): void {
  const data = getGuestData();
  if (!data?.userResources) return;
  
  data.userResources = data.userResources.filter(r => r.id !== resourceId);
  saveGuestData(data);
}

// Draft auto-save functions
export function saveChatDraft(draft: string): void {
  if (typeof window === "undefined") return;
  if (draft.trim()) {
    localStorage.setItem(CHAT_DRAFT_KEY, draft);
  } else {
    localStorage.removeItem(CHAT_DRAFT_KEY);
  }
}

export function getChatDraft(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CHAT_DRAFT_KEY) || "";
}

export function clearChatDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_DRAFT_KEY);
}

export function saveBodyScanDraft(profile: Partial<BodyProfile>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BODY_SCAN_DRAFT_KEY, JSON.stringify({ ...profile, savedAt: Date.now() }));
}

export function getBodyScanDraft(): (Partial<BodyProfile> & { savedAt?: number }) | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(BODY_SCAN_DRAFT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearBodyScanDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BODY_SCAN_DRAFT_KEY);
}

// Planning scope functions
export function getPlanningScope(domain: PlanningDomain): PlanningScope | null {
  const data = getGuestData();
  if (!data?.planningScopes) return null;
  return data.planningScopes.find(s => s.domain === domain) || null;
}

export function savePlanningScope(domain: PlanningDomain, horizon: PlanningHorizon): PlanningScope {
  const data = getGuestData() || initGuestData();
  if (!data.planningScopes) data.planningScopes = [];
  
  const existing = data.planningScopes.findIndex(s => s.domain === domain);
  const scope: PlanningScope = { domain, horizon, setAt: Date.now() };
  
  if (existing >= 0) {
    data.planningScopes[existing] = scope;
  } else {
    data.planningScopes.push(scope);
  }
  saveGuestData(data);
  return scope;
}

// Content rotation functions
export function getContentRotation(domain: PlanningDomain): ContentRotation | null {
  const data = getGuestData();
  if (!data?.contentRotations) return null;
  return data.contentRotations.find(r => r.domain === domain) || null;
}

export function rotateContent(domain: PlanningDomain, currentItemId: string, moodSeed?: string): ContentRotation {
  const data = getGuestData() || initGuestData();
  if (!data.contentRotations) data.contentRotations = [];
  
  const existing = data.contentRotations.findIndex(r => r.domain === domain);
  const now = Date.now();
  
  if (existing >= 0) {
    const rotation = data.contentRotations[existing];
    rotation.currentIndex = (rotation.currentIndex + 1);
    rotation.lastRotatedAt = now;
    if (currentItemId && !rotation.rotationHistory.includes(currentItemId)) {
      rotation.rotationHistory.push(currentItemId);
      if (rotation.rotationHistory.length > 20) {
        rotation.rotationHistory = rotation.rotationHistory.slice(-10);
      }
    }
    if (moodSeed) rotation.moodBasedSeed = moodSeed;
    data.contentRotations[existing] = rotation;
  } else {
    data.contentRotations.push({
      domain,
      lastRotatedAt: now,
      currentIndex: 0,
      rotationHistory: currentItemId ? [currentItemId] : [],
      moodBasedSeed: moodSeed || null,
    });
  }
  
  saveGuestData(data);
  return data.contentRotations.find(r => r.domain === domain)!;
}

export function getRotationIndex(domain: PlanningDomain): number {
  const rotation = getContentRotation(domain);
  return rotation?.currentIndex || 0;
}

// Recipe functions
export function getSavedRecipes(): SavedRecipe[] {
  const data = getGuestData();
  return data?.savedRecipes || [];
}

export function getSavedRecipeById(id: string): SavedRecipe | null {
  const recipes = getSavedRecipes();
  return recipes.find(r => r.id === id) || null;
}

export function saveRecipe(recipe: Omit<SavedRecipe, "id" | "createdAt" | "updatedAt">): SavedRecipe {
  const data = getGuestData() || initGuestData();
  if (!data.savedRecipes) data.savedRecipes = [];
  
  const newRecipe: SavedRecipe = {
    ...recipe,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.savedRecipes.unshift(newRecipe);
  saveGuestData(data);
  return newRecipe;
}

export function updateRecipe(id: string, updates: Partial<SavedRecipe>): SavedRecipe | null {
  const data = getGuestData();
  if (!data?.savedRecipes) return null;
  
  const index = data.savedRecipes.findIndex(r => r.id === id);
  if (index < 0) return null;
  
  data.savedRecipes[index] = { 
    ...data.savedRecipes[index], 
    ...updates, 
    updatedAt: Date.now() 
  };
  saveGuestData(data);
  return data.savedRecipes[index];
}

export function deleteRecipe(id: string): void {
  const data = getGuestData();
  if (!data?.savedRecipes) return;
  
  data.savedRecipes = data.savedRecipes.filter(r => r.id !== id);
  saveGuestData(data);
}

export function toggleRecipeFavorite(id: string): SavedRecipe | null {
  const data = getGuestData();
  if (!data?.savedRecipes) return null;
  
  const recipe = data.savedRecipes.find(r => r.id === id);
  if (!recipe) return null;
  
  return updateRecipe(id, { isFavorite: !recipe.isFavorite });
}

// Grocery list functions
export function getGroceryLists(): GroceryList[] {
  const data = getGuestData();
  return data?.groceryLists || [];
}

export function getActiveGroceryList(): GroceryList | null {
  const lists = getGroceryLists();
  return lists.find(l => l.isActive) || null;
}

export function createGroceryList(name: string): GroceryList {
  const data = getGuestData() || initGuestData();
  if (!data.groceryLists) data.groceryLists = [];
  
  data.groceryLists.forEach(l => l.isActive = false);
  
  const newList: GroceryList = {
    id: generateId(),
    name,
    items: [],
    isActive: true,
    shoppingDate: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.groceryLists.unshift(newList);
  saveGuestData(data);
  return newList;
}

export function addItemToGroceryList(
  listId: string, 
  item: Omit<GroceryItem, "id" | "addedAt">
): GroceryItem | null {
  const data = getGuestData();
  if (!data?.groceryLists) return null;
  
  const list = data.groceryLists.find(l => l.id === listId);
  if (!list) return null;
  
  const existingItem = list.items.find(
    i => i.name.toLowerCase() === item.name.toLowerCase() && i.unit === item.unit
  );
  
  if (existingItem) {
    const existingAmount = parseFloat(existingItem.amount) || 0;
    const newAmount = parseFloat(item.amount) || 0;
    existingItem.amount = String(existingAmount + newAmount);
    existingItem.sourceRecipeIds = [...new Set([...existingItem.sourceRecipeIds, ...item.sourceRecipeIds])];
    existingItem.sourceMealPlanIds = [...new Set([...existingItem.sourceMealPlanIds, ...item.sourceMealPlanIds])];
    saveGuestData(data);
    return existingItem;
  }
  
  const newItem: GroceryItem = {
    ...item,
    id: generateId(),
    addedAt: Date.now(),
  };
  
  list.items.push(newItem);
  list.updatedAt = Date.now();
  saveGuestData(data);
  return newItem;
}

export function toggleGroceryItemChecked(listId: string, itemId: string): void {
  const data = getGuestData();
  if (!data?.groceryLists) return;
  
  const list = data.groceryLists.find(l => l.id === listId);
  if (!list) return;
  
  const item = list.items.find(i => i.id === itemId);
  if (!item) return;
  
  item.isChecked = !item.isChecked;
  list.updatedAt = Date.now();
  saveGuestData(data);
}

export function toggleGroceryItemPantry(listId: string, itemId: string): void {
  const data = getGuestData();
  if (!data?.groceryLists) return;
  
  const list = data.groceryLists.find(l => l.id === listId);
  if (!list) return;
  
  const item = list.items.find(i => i.id === itemId);
  if (!item) return;
  
  item.isInPantry = !item.isInPantry;
  list.updatedAt = Date.now();
  saveGuestData(data);
}

export function removeGroceryItem(listId: string, itemId: string): void {
  const data = getGuestData();
  if (!data?.groceryLists) return;
  
  const list = data.groceryLists.find(l => l.id === listId);
  if (!list) return;
  
  list.items = list.items.filter(i => i.id !== itemId);
  list.updatedAt = Date.now();
  saveGuestData(data);
}

export function addRecipeIngredientsToGroceryList(recipeId: string, listId?: string): GroceryList | null {
  const recipe = getSavedRecipeById(recipeId);
  if (!recipe) return null;
  
  let list = listId ? getGroceryLists().find(l => l.id === listId) : getActiveGroceryList();
  if (!list) {
    list = createGroceryList("Shopping List");
  }
  
  for (const ing of recipe.ingredients) {
    addItemToGroceryList(list.id, {
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      category: ing.category,
      isChecked: false,
      isInPantry: false,
      sourceRecipeIds: [recipeId],
      sourceMealPlanIds: [],
      notes: "",
    });
  }
  
  return getGroceryLists().find(l => l.id === list!.id) || null;
}

export function saveOnboardingLog(log: Omit<OnboardingLog, "id" | "createdAt">): OnboardingLog {
  const data = getGuestData() || initGuestData();
  if (!data.onboardingLogs) {
    data.onboardingLogs = [];
  }
  
  const newLog: OnboardingLog = {
    ...log,
    id: generateId(),
    createdAt: Date.now(),
  };
  
  data.onboardingLogs.unshift(newLog);
  saveGuestData(data);
  return newLog;
}

export function getOnboardingLogs(): OnboardingLog[] {
  const data = getGuestData();
  return data?.onboardingLogs || [];
}

export function getOnboardingLogsByType(type: OnboardingLogType): OnboardingLog[] {
  return getOnboardingLogs().filter(log => log.type === type);
}

export function getTodayOnboardingLogs(): OnboardingLog[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  return getOnboardingLogs().filter(log => log.createdAt >= todayStart);
}

export function getProfileSetup(): ProfileSetup | null {
  const data = getGuestData();
  return data?.profileSetup || null;
}

export function saveProfileSetup(setup: Partial<ProfileSetup>): void {
  const data = getGuestData() || initGuestData();
  data.profileSetup = {
    weeklyRhythm: setup.weeklyRhythm ?? data.profileSetup?.weeklyRhythm ?? null,
    primaryFocus: setup.primaryFocus ?? data.profileSetup?.primaryFocus ?? null,
    metDW: setup.metDW ?? data.profileSetup?.metDW ?? false,
    completedAt: setup.completedAt ?? data.profileSetup?.completedAt ?? null,
  };
  saveGuestData(data);
}

export function isProfileSetupComplete(): boolean {
  const setup = getProfileSetup();
  return setup?.completedAt !== null && setup?.completedAt !== undefined;
}

export function getLatestOnboardingLog(): OnboardingLog | null {
  const logs = getOnboardingLogs();
  return logs.length > 0 ? logs[0] : null;
}
