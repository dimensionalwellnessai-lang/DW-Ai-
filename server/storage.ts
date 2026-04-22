import {
  users,
  pushSubscriptions,
  notificationPreferences,
  onboardingProfiles,
  lifeSystems,
  lifeSystemPillars,
  lifeSystemProjects,
  lifeSystemDocuments,
  goals,
  habits,
  habitLogs,
  moodLogs,
  checkIns,
  scheduleBlocks,
  categoryEntries,
  wellnessBlueprints,
  baselineProfiles,
  stressSignals,
  stabilizingActions,
  supportPreferences,
  recoveryReflections,
  routines,
  routineLogs,
  tasks,
  projects,
  projectChats,
  projectMilestones,
  projectArtifacts,
  calendarEvents,
  calendarEventTasks,
  userProfiles,
  wellnessContent,
  savedContent,
  feedInteractions,
  challenges,
  bodyScans,
  systemModules,
  dailyScheduleEvents,
  userSystemPreferences,
  passwordResetTokens,
  importedDocuments,
  importedDocumentItems,
  importedConversations,
  type ImportedConversation,
  type InsertImportedConversation,
  mealPlans,
  meals,
  mealPrepPreferences,
  shoppingLists,
  shoppingListItems,
  userFeedback,
  conversations,
  aiSyncSessions,
  aiSyncItems,
  interactionEvents,
  aiPatternSnapshots,
  birthCharts,
  chatAttachments,
  aiLearnings,
  dailyMoodCheckins,
  activityCompletions,
  trackerSettings,
  notifications,
  eveningCheckIns,
  type Conversation,
  type InsertConversation,
  type AiSyncSession,
  type InsertAiSyncSession,
  type AiSyncItem,
  type InsertAiSyncItem,
  type InteractionEvent,
  type InsertInteractionEvent,
  type AiPatternSnapshot,
  type InsertAiPatternSnapshot,
  type User,
  type InsertUser,
  type OnboardingProfile,
  type InsertOnboardingProfile,
  type LifeSystem,
  type InsertLifeSystem,
  type LifeSystemPillar,
  type InsertLifeSystemPillar,
  type LifeSystemProject,
  type InsertLifeSystemProject,
  type LifeSystemDocument,
  type InsertLifeSystemDocument,
  triggerEvents,
  type TriggerEvent,
  type InsertTriggerEvent,
  type Goal,
  type InsertGoal,
  type Habit,
  type InsertHabit,
  type HabitLog,
  type InsertHabitLog,
  type MoodLog,
  type InsertMoodLog,
  type CheckIn,
  type InsertCheckIn,
  type ScheduleBlock,
  type InsertScheduleBlock,
  type CategoryEntry,
  type InsertCategoryEntry,
  type WellnessBlueprint,
  type InsertWellnessBlueprint,
  type BaselineProfile,
  type InsertBaselineProfile,
  type StressSignals,
  type InsertStressSignals,
  type StabilizingAction,
  type InsertStabilizingAction,
  type SupportPreferences,
  type InsertSupportPreferences,
  type RecoveryReflection,
  type InsertRecoveryReflection,
  type Routine,
  type InsertRoutine,
  type RoutineLog,
  type InsertRoutineLog,
  type Task,
  type InsertTask,
  type Project,
  type InsertProject,
  type ProjectChat,
  type InsertProjectChat,
  type ProjectMilestone,
  type InsertProjectMilestone,
  type ProjectArtifact,
  type InsertProjectArtifact,
  type CalendarEvent,
  type InsertCalendarEvent,
  type CalendarEventTask,
  type InsertCalendarEventTask,
  type UserProfile,
  type InsertUserProfile,
  type WellnessContent,
  type InsertWellnessContent,
  type SavedContent,
  type InsertSavedContent,
  type FeedInteraction,
  type InsertFeedInteraction,
  type Challenge,
  type InsertChallenge,
  type BodyScan,
  type InsertBodyScan,
  type SystemModule,
  type InsertSystemModule,
  type DailyScheduleEvent,
  type InsertDailyScheduleEvent,
  type UserSystemPreferences,
  type InsertUserSystemPreferences,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type ImportedDocument,
  type InsertImportedDocument,
  type ImportedDocumentItem,
  type InsertImportedDocumentItem,
  type MealPlan,
  type InsertMealPlan,
  type Meal,
  type InsertMeal,
  type MealPrepPreferences,
  type InsertMealPrepPreferences,
  type ShoppingList,
  type InsertShoppingList,
  type ShoppingListItem,
  type InsertShoppingListItem,
  type UserFeedback,
  type InsertUserFeedback,
  weeklyFeedbackResponses,
  type WeeklyFeedbackResponse,
  type InsertWeeklyFeedbackResponse,
  workoutPlans,
  exercises,
  workoutSessions,
  workoutSessionSteps,
  type WorkoutPlan,
  type InsertWorkoutPlan,
  type Exercise,
  type InsertExercise,
  type WorkoutSession,
  type InsertWorkoutSession,
  type WorkoutSessionStep,
  type InsertWorkoutSessionStep,
  type BirthChart,
  type InsertBirthChart,
  wearableDevices,
  wearableData,
  astrologyPredictions,
  type WearableDevice,
  type InsertWearableDevice,
  type WearableData,
  type InsertWearableData,
  type AstrologyPrediction,
  type InsertAstrologyPrediction,
  dimensionBlueprints,
  resetProtocol,
  userPatterns,
  trackingLogs,
  mealLogs,
  waterLogs,
  universalPlans,
  completionStatus,
  achievements,
  streaks,
  type DimensionBlueprint,
  type InsertDimensionBlueprint,
  type ResetProtocol,
  type InsertResetProtocol,
  type UserPattern,
  type InsertUserPattern,
  type TrackingLog,
  type InsertTrackingLog,
  type MealLog,
  type InsertMealLog,
  type WaterLog,
  type InsertWaterLog,
  type UniversalPlan,
  type InsertUniversalPlan,
  type CompletionStatus,
  type InsertCompletionStatus,
  type Achievement,
  type InsertAchievement,
  type Streak,
  type InsertStreak,
  lifeDimensionAssessments,
  type LifeDimensionAssessment,
  type InsertLifeDimensionAssessment,
  dimensionSystems,
  type DimensionSystem,
  type InsertDimensionSystem,
  wellnessPreferences,
  type WellnessPreferences,
  type InsertWellnessPreferences,
  userValuesRules,
  type UserValuesRules,
  type InsertUserValuesRules,
  featureSettings,
  type FeatureSettings,
  type InsertFeatureSettings,
  householdCleaningTasks,
  type HouseholdCleaningTask,
  type InsertHouseholdCleaningTask,
  householdLaundrySchedule,
  type HouseholdLaundrySchedule,
  type InsertHouseholdLaundrySchedule,
  aiFeatureUsage,
  type AiFeatureUsage,
  type InsertAiFeatureUsage,
  aiSuggestions,
  type AiSuggestion,
  type InsertAiSuggestion,
  conversationInsights,
  type ConversationInsight,
  type InsertConversationInsight,
  dwInsights,
  type DwInsight,
  type InsertDwInsight,
  dwJournalEntries,
  type DwJournalEntry,
  type InsertDwJournalEntry,
  moodInsights,
  type MoodInsight,
  type InsertMoodInsight,
  dailyBriefs,
  type DailyBrief,
  type InsertDailyBrief,
  type DailyBriefVariant,
  dwFollowups,
  type DwFollowup,
  type InsertDwFollowup,
  elevationChecks,
  type ElevationCheck,
  type InsertElevationCheck,
  elevationPlans,
  type ElevationPlan,
  type InsertElevationPlan,
  elevationPlanDays,
  type ElevationPlanDay,
  type InsertElevationPlanDay,
  elevationPlanActions,
  type ElevationPlanAction,
  type InsertElevationPlanAction,
  reminders,
  type Reminder,
  type InsertReminder,
  userLearningProfile,
  type UserLearningProfile,
  type InsertUserLearningProfile,
  type UpdateUserLearningProfile,
  weeklyPlanReviews,
  type WeeklyPlanReview,
  type InsertWeeklyPlanReview,
  type UpdateWeeklyPlanReview,
  financialAccounts,
  transactions,
  budgets,
  investmentHoldings,
  netWorthSnapshots,
  savingsGoals,
  plaidItems,
  type FinancialAccount,
  type InsertFinancialAccount,
  type Transaction,
  type InsertTransaction,
  type Budget,
  type InsertBudget,
  type InvestmentHolding,
  type InsertInvestmentHolding,
  type NetWorthSnapshot,
  type InsertNetWorthSnapshot,
  type SavingsGoal,
  type InsertSavingsGoal,
  type PlaidItem,
  type InsertPlaidItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, or, inArray, ne, count } from "drizzle-orm";
import { createHash } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByOAuthId(provider: string, oauthId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  getOnboardingProfile(userId: string): Promise<OnboardingProfile | undefined>;
  createOnboardingProfile(profile: InsertOnboardingProfile): Promise<OnboardingProfile>;
  updateOnboardingProfile(id: string, data: Partial<OnboardingProfile>): Promise<OnboardingProfile | undefined>;

  getLifeSystem(userId: string): Promise<LifeSystem | undefined>;
  createLifeSystem(system: InsertLifeSystem): Promise<LifeSystem>;
  updateLifeSystem(id: string, data: Partial<LifeSystem>): Promise<LifeSystem | undefined>;

  // ── Life System Pillars (3-level taxonomy) ──────────────────────────────
  getLifeSystemPillars(userId: string): Promise<LifeSystemPillar[]>;
  upsertLifeSystemPillar(pillar: InsertLifeSystemPillar): Promise<LifeSystemPillar>;
  updateLifeSystemPillar(userId: string, pillarId: string, data: Partial<InsertLifeSystemPillar>): Promise<LifeSystemPillar | undefined>;
  deleteAllLifeSystemPillars(userId: string): Promise<void>;
  deleteAllLifeSystemDocuments(userId: string): Promise<void>;

  // Trigger Events (DW Trigger Protocol)
  createTriggerEvent(event: InsertTriggerEvent): Promise<TriggerEvent>;
  listTriggerEvents(userId: string, limit?: number): Promise<TriggerEvent[]>;
  countTriggerEventsSince(userId: string, since: Date): Promise<{ total: number; noProof: number }>;

  // Life System Projects (sub-items inside the Creation pillar)
  getLifeSystemProjects(userId: string): Promise<LifeSystemProject[]>;
  createLifeSystemProject(project: InsertLifeSystemProject): Promise<LifeSystemProject>;
  updateLifeSystemProject(id: string, userId: string, data: Partial<InsertLifeSystemProject>): Promise<LifeSystemProject | undefined>;
  deleteLifeSystemProject(id: string, userId: string): Promise<boolean>;

  // Life System Documents (snapshots of the generated artifact)
  getLatestLifeSystemDocument(userId: string): Promise<LifeSystemDocument | undefined>;
  createLifeSystemDocument(doc: InsertLifeSystemDocument): Promise<LifeSystemDocument>;

  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  createGoals(goalsList: InsertGoal[]): Promise<Goal[]>;
  updateGoal(id: string, data: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;

  getHabits(userId: string): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | undefined>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  createHabits(habitsList: InsertHabit[]): Promise<Habit[]>;
  updateHabit(id: string, data: Partial<Habit>): Promise<Habit | undefined>;
  deleteHabit(id: string): Promise<void>;

  getHabitLogs(habitId: string): Promise<HabitLog[]>;
  getTodaysHabitLog(habitId: string): Promise<HabitLog | undefined>;
  getTodayHabitLogsByUser(userId: string): Promise<HabitLog[]>;
  createHabitLog(log: InsertHabitLog): Promise<HabitLog>;
  deleteHabitLog(logId: string): Promise<void>;
  deleteAllTodaysHabitLogs(habitId: string): Promise<void>;

  getMoodLogs(userId: string): Promise<MoodLog[]>;
  getRecentMoodLogs(userId: string, sinceDate: Date): Promise<{ logs: MoodLog[]; hasPriorLogs: boolean }>;
  getTodaysMoodLog(userId: string): Promise<MoodLog | undefined>;
  createMoodLog(log: InsertMoodLog): Promise<MoodLog>;
  getMoodLog(id: string): Promise<MoodLog | undefined>;
  getMoodInsights(userId: string): Promise<MoodInsight[]>;
  replaceMoodInsights(userId: string, insights: InsertMoodInsight[]): Promise<MoodInsight[]>;
  getDailyBrief(userId: string, dateKey: string, variant: DailyBriefVariant): Promise<DailyBrief | undefined>;
  upsertDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief>;
  getJournalEntriesByMood(userId: string, moodLogId: string): Promise<DwJournalEntry[]>;

  getCheckIns(userId: string): Promise<CheckIn[]>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;

  getScheduleBlocks(userId: string): Promise<ScheduleBlock[]>;
  getScheduleBlock(id: string): Promise<ScheduleBlock | undefined>;
  createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock>;
  updateScheduleBlock(id: string, data: Partial<ScheduleBlock>): Promise<ScheduleBlock | undefined>;
  deleteScheduleBlock(id: string): Promise<void>;

  getCategoryEntries(userId: string, category?: string): Promise<CategoryEntry[]>;
  createCategoryEntry(entry: InsertCategoryEntry): Promise<CategoryEntry>;
  createCategoryEntries(entries: InsertCategoryEntry[]): Promise<CategoryEntry[]>;
  deleteCategoryEntry(id: string): Promise<void>;

  getWellnessBlueprint(userId: string): Promise<WellnessBlueprint | undefined>;
  createWellnessBlueprint(blueprint: InsertWellnessBlueprint): Promise<WellnessBlueprint>;
  updateWellnessBlueprint(id: string, data: Partial<WellnessBlueprint>): Promise<WellnessBlueprint | undefined>;

  getBaselineProfile(blueprintId: string): Promise<BaselineProfile | undefined>;
  createBaselineProfile(profile: InsertBaselineProfile): Promise<BaselineProfile>;
  updateBaselineProfile(id: string, data: Partial<BaselineProfile>): Promise<BaselineProfile | undefined>;

  getStressSignals(blueprintId: string): Promise<StressSignals | undefined>;
  createStressSignals(signals: InsertStressSignals): Promise<StressSignals>;
  updateStressSignals(id: string, data: Partial<StressSignals>): Promise<StressSignals | undefined>;

  getStabilizingActions(blueprintId: string): Promise<StabilizingAction[]>;
  getStabilizingAction(id: string): Promise<StabilizingAction | undefined>;
  createStabilizingAction(action: InsertStabilizingAction): Promise<StabilizingAction>;
  updateStabilizingAction(id: string, data: Partial<StabilizingAction>): Promise<StabilizingAction | undefined>;
  deleteStabilizingAction(id: string): Promise<void>;

  getSupportPreferences(blueprintId: string): Promise<SupportPreferences | undefined>;
  createSupportPreferences(prefs: InsertSupportPreferences): Promise<SupportPreferences>;
  updateSupportPreferences(id: string, data: Partial<SupportPreferences>): Promise<SupportPreferences | undefined>;

  getRecoveryReflections(blueprintId: string): Promise<RecoveryReflection[]>;
  getRecoveryReflection(id: string): Promise<RecoveryReflection | undefined>;
  createRecoveryReflection(reflection: InsertRecoveryReflection): Promise<RecoveryReflection>;
  updateRecoveryReflection(id: string, data: Partial<RecoveryReflection>): Promise<RecoveryReflection | undefined>;
  deleteRecoveryReflection(id: string): Promise<void>;

  getRoutines(userId: string): Promise<Routine[]>;
  getRoutine(id: string): Promise<Routine | undefined>;
  createRoutine(routine: InsertRoutine): Promise<Routine>;
  updateRoutine(id: string, data: Partial<Routine>): Promise<Routine | undefined>;
  deleteRoutine(id: string): Promise<void>;

  getRoutineLogs(routineId: string): Promise<RoutineLog[]>;
  createRoutineLog(log: InsertRoutineLog): Promise<RoutineLog>;

  getTasks(userId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  updateTaskForUser(id: string, userId: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getProjects(userId: string): Promise<Project[]>;
  getProjectForUser(id: string, userId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProjectForUser(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProjectForUser(id: string, userId: string): Promise<boolean>;

  getProjectChatsForUser(projectId: string, userId: string): Promise<ProjectChat[]>;
  createProjectChatForUser(chat: InsertProjectChat, userId: string): Promise<ProjectChat | undefined>;
  touchProjectActivity(projectId: string, userId: string): Promise<void>;

  getProjectMilestones(projectId: string, userId: string): Promise<ProjectMilestone[]>;
  createProjectMilestone(milestone: InsertProjectMilestone, userId: string): Promise<ProjectMilestone | undefined>;
  updateProjectMilestone(id: string, projectId: string, userId: string, data: Partial<InsertProjectMilestone> & { doneAt?: Date | null }): Promise<ProjectMilestone | undefined>;
  deleteProjectMilestone(id: string, projectId: string, userId: string): Promise<boolean>;

  getProjectArtifacts(projectId: string, userId: string): Promise<ProjectArtifact[]>;
  createProjectArtifact(artifact: InsertProjectArtifact, userId: string): Promise<ProjectArtifact | undefined>;
  deleteProjectArtifact(id: string, projectId: string, userId: string): Promise<boolean>;

  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  getCalendarEventForUser(id: string, userId: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  createCalendarEvents(events: InsertCalendarEvent[]): Promise<CalendarEvent[]>;
  updateCalendarEventForUser(id: string, userId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEventForUser(id: string, userId: string): Promise<boolean>;
  clearLifeSystemImportData(userId: string): Promise<{ calendarEvents: number; mealPlans: number; workoutPlans: number }>;

  getEventTasks(calendarEventId: string, userId: string): Promise<CalendarEventTask[]>;
  createEventTask(task: InsertCalendarEventTask): Promise<CalendarEventTask>;
  createEventTasks(tasks: InsertCalendarEventTask[]): Promise<CalendarEventTask[]>;
  updateEventTask(id: string, userId: string, data: Partial<CalendarEventTask>): Promise<CalendarEventTask | undefined>;
  deleteEventTask(id: string, userId: string): Promise<boolean>;

  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined>;

  getWellnessContent(filters?: { category?: string; goalTags?: string[]; difficulty?: string }): Promise<WellnessContent[]>;
  getWellnessContentById(id: string): Promise<WellnessContent | undefined>;

  getSavedContent(userId: string): Promise<SavedContent[]>;
  getSavedContentById(id: string, userId: string): Promise<SavedContent | undefined>;
  createSavedContent(content: InsertSavedContent): Promise<SavedContent>;
  updateSavedContent(id: string, userId: string, data: Partial<SavedContent>): Promise<SavedContent | undefined>;
  deleteSavedContent(id: string, userId: string): Promise<boolean>;

  createFeedInteraction(data: InsertFeedInteraction): Promise<FeedInteraction>;
  getFeedInteractionsByAction(userId: string, action: string): Promise<FeedInteraction[]>;

  getChallenges(userId: string): Promise<Challenge[]>;
  getChallenge(id: string, userId: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, userId: string, data: Partial<Challenge>): Promise<Challenge | undefined>;
  deleteChallenge(id: string, userId: string): Promise<boolean>;

  getBodyScans(userId: string): Promise<BodyScan[]>;
  createBodyScan(scan: InsertBodyScan): Promise<BodyScan>;
  deleteBodyScan(id: string, userId: string): Promise<boolean>;

  getSystemModules(userId: string): Promise<SystemModule[]>;
  getSystemModule(id: string): Promise<SystemModule | undefined>;
  createSystemModule(module: InsertSystemModule): Promise<SystemModule>;
  updateSystemModule(id: string, data: Partial<SystemModule>): Promise<SystemModule | undefined>;
  deleteSystemModule(id: string): Promise<void>;

  getScheduleEvents(userId: string): Promise<DailyScheduleEvent[]>;
  getScheduleEventsByDay(userId: string, dayOfWeek: number): Promise<DailyScheduleEvent[]>;
  getScheduleEvent(id: string): Promise<DailyScheduleEvent | undefined>;
  createScheduleEvent(event: InsertDailyScheduleEvent): Promise<DailyScheduleEvent>;
  updateScheduleEvent(id: string, data: Partial<DailyScheduleEvent>): Promise<DailyScheduleEvent | undefined>;
  deleteScheduleEvent(id: string): Promise<void>;

  getUserSystemPreferences(userId: string): Promise<UserSystemPreferences | undefined>;
  createUserSystemPreferences(prefs: InsertUserSystemPreferences): Promise<UserSystemPreferences>;
  updateUserSystemPreferences(userId: string, data: Partial<UserSystemPreferences>): Promise<UserSystemPreferences | undefined>;

  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  createUserFeedback(data: InsertUserFeedback): Promise<UserFeedback>;

  getImportedDocuments(userId: string): Promise<ImportedDocument[]>;
  getImportedDocument(id: string): Promise<ImportedDocument | undefined>;
  createImportedDocument(doc: InsertImportedDocument): Promise<ImportedDocument>;
  updateImportedDocument(id: string, data: Partial<ImportedDocument>): Promise<ImportedDocument | undefined>;

  getImportedDocumentItems(documentId: string): Promise<ImportedDocumentItem[]>;
  createImportedDocumentItem(item: InsertImportedDocumentItem): Promise<ImportedDocumentItem>;
  createImportedDocumentItems(items: InsertImportedDocumentItem[]): Promise<ImportedDocumentItem[]>;
  updateImportedDocumentItem(id: string, data: Partial<ImportedDocumentItem>): Promise<ImportedDocumentItem | undefined>;

  getMealPlans(userId: string): Promise<MealPlan[]>;
  getMealPlan(id: string): Promise<MealPlan | undefined>;
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: string, data: Partial<MealPlan>): Promise<MealPlan | undefined>;
  deactivateOtherMealPlans(userId: string, exceptId: string): Promise<void>;
  deleteMealPlan(id: string): Promise<void>;

  getMeals(userId: string, mealPlanId?: string): Promise<Meal[]>;
  getMeal(id: string): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  createMeals(meals: InsertMeal[]): Promise<Meal[]>;
  updateMeal(id: string, data: Partial<Meal>): Promise<Meal | undefined>;
  deleteMeal(id: string): Promise<void>;

  getMealPrepPreferences(userId: string): Promise<MealPrepPreferences | undefined>;
  createMealPrepPreferences(prefs: InsertMealPrepPreferences): Promise<MealPrepPreferences>;
  updateMealPrepPreferences(userId: string, data: Partial<MealPrepPreferences>): Promise<MealPrepPreferences | undefined>;

  getShoppingLists(userId: string): Promise<ShoppingList[]>;
  getShoppingList(id: string): Promise<ShoppingList | undefined>;
  createShoppingList(list: InsertShoppingList): Promise<ShoppingList>;
  updateShoppingList(id: string, data: Partial<ShoppingList>): Promise<ShoppingList | undefined>;
  deleteShoppingList(id: string): Promise<void>;

  getShoppingListItems(listId: string): Promise<ShoppingListItem[]>;
  createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  createShoppingListItems(items: InsertShoppingListItem[]): Promise<ShoppingListItem[]>;
  updateShoppingListItem(id: string, data: Partial<ShoppingListItem>): Promise<ShoppingListItem | undefined>;
  deleteShoppingListItem(id: string): Promise<void>;

  getWeeklyFeedbackResponses(userId: string): Promise<WeeklyFeedbackResponse[]>;
  getWeeklyFeedbackResponse(userId: string, weekNumber: number): Promise<WeeklyFeedbackResponse | undefined>;
  saveWeeklyFeedbackResponse(data: InsertWeeklyFeedbackResponse): Promise<WeeklyFeedbackResponse>;
  updateWeeklyFeedbackResponse(id: string, data: Partial<WeeklyFeedbackResponse>): Promise<WeeklyFeedbackResponse | undefined>;

  getWorkoutPlans(userId: string): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlan(id: string, data: Partial<WorkoutPlan>): Promise<WorkoutPlan | undefined>;
  deleteWorkoutPlan(id: string): Promise<void>;

  getExercises(userId: string, workoutPlanId?: string): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  createExercises(exercises: InsertExercise[]): Promise<Exercise[]>;
  updateExercise(id: string, data: Partial<Exercise>): Promise<Exercise | undefined>;
  deleteExercise(id: string): Promise<void>;

  getWorkoutSessions(userId: string): Promise<WorkoutSession[]>;
  getWorkoutSession(id: string): Promise<WorkoutSession | undefined>;
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  updateWorkoutSession(id: string, data: Partial<WorkoutSession>): Promise<WorkoutSession | undefined>;
  deleteWorkoutSession(id: string): Promise<void>;
  getWorkoutSessionSteps(sessionId: string): Promise<WorkoutSessionStep[]>;
  upsertWorkoutSessionStep(step: InsertWorkoutSessionStep): Promise<WorkoutSessionStep>;

  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<void>;

  getSyncSessions(userId: string): Promise<AiSyncSession[]>;
  getActiveSyncSession(userId: string): Promise<AiSyncSession | undefined>;
  getSyncSession(id: string): Promise<AiSyncSession | undefined>;
  createSyncSession(session: InsertAiSyncSession): Promise<AiSyncSession>;
  updateSyncSession(id: string, data: Partial<AiSyncSession>): Promise<AiSyncSession | undefined>;

  getSyncItems(sessionId: string): Promise<AiSyncItem[]>;
  getSyncItemsByGroup(sessionId: string, groupKey: string): Promise<AiSyncItem[]>;
  createSyncItem(item: InsertAiSyncItem): Promise<AiSyncItem>;
  createSyncItems(items: InsertAiSyncItem[]): Promise<AiSyncItem[]>;
  updateSyncItem(id: string, data: Partial<AiSyncItem>): Promise<AiSyncItem | undefined>;
  updateSyncItemsByGroup(sessionId: string, groupKey: string, data: Partial<AiSyncItem>): Promise<void>;

  createInteractionEvent(event: InsertInteractionEvent): Promise<InteractionEvent>;
  getRecentInteractionEvents(userId: string, limit?: number): Promise<InteractionEvent[]>;
  getAggregatedInteractionData(userId: string): Promise<{
    pageVisits: { page: string; count: number; avgDuration: number }[];
    featureUsage: { feature: string; count: number; recentCount: number }[];
    timePatterns: { hourOfDay: number; dayOfWeek: number; count: number }[];
    totalDays: number;
  }>;

  getPatternSnapshots(userId: string, dimension?: string): Promise<AiPatternSnapshot[]>;
  createPatternSnapshot(snapshot: InsertAiPatternSnapshot): Promise<AiPatternSnapshot>;
  updatePatternSnapshot(id: string, data: Partial<AiPatternSnapshot>): Promise<AiPatternSnapshot | undefined>;

  getBirthChart(userId: string): Promise<BirthChart | undefined>;
  createBirthChart(chart: InsertBirthChart): Promise<BirthChart>;
  updateBirthChart(userId: string, data: Partial<BirthChart>): Promise<BirthChart | undefined>;

  // Wearable devices
  getWearableDevices(userId: string): Promise<WearableDevice[]>;
  createWearableDevice(device: InsertWearableDevice): Promise<WearableDevice>;
  updateWearableDevice(id: string, data: Partial<WearableDevice>): Promise<WearableDevice | undefined>;
  
  // Wearable data
  getWearableData(userId: string, limit?: number): Promise<WearableData[]>;
  getLatestWearableData(userId: string): Promise<WearableData | undefined>;
  createWearableData(data: InsertWearableData): Promise<WearableData>;
  updateWearableData(id: string, data: Partial<WearableData>): Promise<WearableData | undefined>;
  
  // Astrology predictions
  getAstrologyPredictions(userId: string, startDate: Date, endDate: Date): Promise<AstrologyPrediction[]>;
  createAstrologyPrediction(prediction: InsertAstrologyPrediction): Promise<AstrologyPrediction>;

  getAdminAnalytics(): Promise<AdminAnalytics>;
  getUserProgress(userId: string): Promise<UserProgress>;
  
  // New comprehensive admin metrics
  getAdminMetricsSummary(range: string): Promise<AdminMetricsSummary>;
  getAdminMetricsFunnel(range: string): Promise<AdminMetricsFunnel>;
  getAdminMetricsSwitches(range: string): Promise<Record<string, AdminSwitchData>>;
  getAdminMetricsRecommendations(range: string): Promise<AdminRecommendationsData>;
  getAdminMetricsTimeband(range: string): Promise<AdminTimebandData>;
  getAdminMetricsFlags(range: string): Promise<AdminFlagsData>;
  getAdminMetricsErrors(range: string): Promise<AdminErrorsData>;
  
  // New user progress methods
  getUserProgressSummary(userId: string, range: string): Promise<UserProgressSummary>;
  getUserProgressSwitches(userId: string, range: string): Promise<UserSwitchProgress[]>;
  getUserProgressPatterns(userId: string, range: string): Promise<{ flagKey: string; count: number }[]>;
  getUserRecommendationToday(userId: string): Promise<UserRecommendation>;

  // DW.ai Phase 1 - New tables
  // Dimension Blueprints
  getDimensionBlueprints(userId: string, dimension?: string): Promise<DimensionBlueprint[]>;
  getDimensionBlueprint(id: string): Promise<DimensionBlueprint | undefined>;
  createDimensionBlueprint(blueprint: InsertDimensionBlueprint): Promise<DimensionBlueprint>;
  updateDimensionBlueprint(id: string, data: Partial<DimensionBlueprint>): Promise<DimensionBlueprint | undefined>;

  // Reset Protocol
  getResetProtocol(userId: string): Promise<ResetProtocol | undefined>;
  getResetProtocolById(id: string): Promise<ResetProtocol | undefined>;
  createResetProtocol(protocol: InsertResetProtocol): Promise<ResetProtocol>;
  updateResetProtocol(id: string, data: Partial<ResetProtocol>): Promise<ResetProtocol | undefined>;

  // User Patterns
  getUserPatterns(userId: string, isActive?: boolean): Promise<UserPattern[]>;
  getUserPattern(id: string): Promise<UserPattern | undefined>;
  createUserPattern(pattern: InsertUserPattern): Promise<UserPattern>;
  updateUserPattern(id: string, data: Partial<UserPattern>): Promise<UserPattern | undefined>;

  // Tracking Logs
  getTrackingLogs(userId: string, trackingType?: string, limit?: number): Promise<TrackingLog[]>;
  createTrackingLog(log: InsertTrackingLog): Promise<TrackingLog>;

  // Meal Logs
  getMealLogs(userId: string, limit?: number): Promise<MealLog[]>;
  createMealLog(log: InsertMealLog): Promise<MealLog>;

  // Water Logs
  getWaterLogs(userId: string, limit?: number): Promise<WaterLog[]>;
  createWaterLog(log: InsertWaterLog): Promise<WaterLog>;

  // Universal Plans
  getUniversalPlans(userId: string, planType?: string): Promise<UniversalPlan[]>;
  getUniversalPlan(id: string): Promise<UniversalPlan | undefined>;
  createUniversalPlan(plan: InsertUniversalPlan): Promise<UniversalPlan>;
  updateUniversalPlan(id: string, data: Partial<UniversalPlan>): Promise<UniversalPlan | undefined>;

  // Completion Status
  getCompletionStatus(userId: string): Promise<CompletionStatus | undefined>;
  createCompletionStatus(status: InsertCompletionStatus): Promise<CompletionStatus>;
  updateCompletionStatus(userId: string, data: Partial<CompletionStatus>): Promise<CompletionStatus | undefined>;

  // PR #3: Life Dimension Assessments
  getLifeDimensionAssessments(userId: string, dimension?: string): Promise<LifeDimensionAssessment[]>;
  getLatestDimensionAssessment(userId: string, dimension: string): Promise<LifeDimensionAssessment | undefined>;
  createLifeDimensionAssessment(assessment: InsertLifeDimensionAssessment): Promise<LifeDimensionAssessment>;

  // PR #3: Dimension Systems
  getDimensionSystems(userId: string, dimension?: string): Promise<DimensionSystem[]>;
  getDimensionSystem(id: string): Promise<DimensionSystem | undefined>;
  createDimensionSystem(system: InsertDimensionSystem): Promise<DimensionSystem>;
  updateDimensionSystem(id: string, userId: string, data: Partial<DimensionSystem>): Promise<DimensionSystem | undefined>;
  deleteDimensionSystem(id: string, userId: string): Promise<void>;

  // PR #3: Wellness Preferences
  getWellnessPreferences(userId: string): Promise<WellnessPreferences | undefined>;
  createWellnessPreferences(prefs: InsertWellnessPreferences): Promise<WellnessPreferences>;
  updateWellnessPreferences(id: string, userId: string, data: Partial<WellnessPreferences>): Promise<WellnessPreferences | undefined>;

  // User Values & Rules
  getUserValuesRules(userId: string): Promise<UserValuesRules | undefined>;
  createUserValuesRules(data: InsertUserValuesRules): Promise<UserValuesRules>;
  updateUserValuesRules(id: string, userId: string, data: Partial<UserValuesRules>): Promise<UserValuesRules | undefined>;

  // PR #3: Feature Settings
  getFeatureSettings(userId: string): Promise<FeatureSettings | undefined>;
  createFeatureSettings(settings: InsertFeatureSettings): Promise<FeatureSettings>;
  updateFeatureSettings(id: string, userId: string, data: Partial<FeatureSettings>): Promise<FeatureSettings | undefined>;

  // PR #3: Household Cleaning Tasks
  getHouseholdCleaningTasks(userId: string): Promise<HouseholdCleaningTask[]>;
  createHouseholdCleaningTask(task: InsertHouseholdCleaningTask): Promise<HouseholdCleaningTask>;
  updateHouseholdCleaningTask(id: string, userId: string, data: Partial<HouseholdCleaningTask>): Promise<HouseholdCleaningTask | undefined>;
  deleteHouseholdCleaningTask(id: string, userId: string): Promise<void>;

  // PR #3: Household Laundry Schedule
  getHouseholdLaundrySchedule(userId: string): Promise<HouseholdLaundrySchedule[]>;
  createHouseholdLaundrySchedule(schedule: InsertHouseholdLaundrySchedule): Promise<HouseholdLaundrySchedule>;
  updateHouseholdLaundrySchedule(id: string, userId: string, data: Partial<HouseholdLaundrySchedule>): Promise<HouseholdLaundrySchedule | undefined>;
  deleteHouseholdLaundrySchedule(id: string, userId: string): Promise<void>;

  // PR #3: AI Feature Usage
  getAiFeatureUsage(userId: string): Promise<AiFeatureUsage[]>;
  trackFeatureUsage(userId: string, featureName: string, timeSpentSeconds?: number): Promise<void>;
  getMostUsedFeatures(userId: string, limit?: number): Promise<AiFeatureUsage[]>;

  // PR #3: AI Suggestions
  getAiSuggestions(userId: string, status?: string): Promise<AiSuggestion[]>;
  createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion>;
  updateAiSuggestion(id: string, userId: string, data: Partial<AiSuggestion>): Promise<AiSuggestion | undefined>;

  getConversationInsights(userId: string, limit?: number, offset?: number): Promise<ConversationInsight[]>;
  createConversationInsight(insight: InsertConversationInsight): Promise<ConversationInsight>;
  updateConversationInsight(id: string, userId: string, data: Partial<ConversationInsight>): Promise<ConversationInsight | undefined>;
  deleteConversationInsight(id: string, userId: string): Promise<void>;
  bulkUpsertConversationInsights(insights: InsertConversationInsight[]): Promise<void>;

  // DW Insight + Journal Intelligence System
  getDwInsights(userId: string, limit?: number): Promise<DwInsight[]>;
  getLatestDwInsight(userId: string): Promise<DwInsight | undefined>;
  getDwInsightByConversation(userId: string, conversationId: string): Promise<DwInsight | undefined>;
  createDwInsight(insight: InsertDwInsight): Promise<DwInsight>;
  getDwJournalEntries(userId: string, limit?: number): Promise<DwJournalEntry[]>;
  getLatestDwJournalEntry(userId: string): Promise<DwJournalEntry | undefined>;
  createDwJournalEntry(entry: InsertDwJournalEntry): Promise<DwJournalEntry>;
  getDwFollowups(userId: string, status?: string): Promise<DwFollowup[]>;
  createDwFollowup(followup: InsertDwFollowup): Promise<DwFollowup>;
  updateDwFollowupStatus(id: string, userId: string, status: string): Promise<DwFollowup | undefined>;
  // Elevation Engine (PR #3)
  getElevationCheckByDate(userId: string, date: string): Promise<ElevationCheck | undefined>;
  upsertElevationCheck(data: InsertElevationCheck): Promise<ElevationCheck>;

  // Elevation Plan Builder (PR #5)
  getElevationPlans(userId: string): Promise<ElevationPlan[]>;
  getArchivedElevationPlans(userId: string): Promise<ElevationPlan[]>;
  getElevationPlansWithStats(userId: string): Promise<(ElevationPlan & { totalActions: number; completedActions: number })[]>;
  getElevationPlan(id: string, userId: string): Promise<ElevationPlan | undefined>;
  getActiveElevationPlan(userId: string): Promise<ElevationPlan | undefined>;
  getDraftElevationPlanForDay(userId: string, date: string, conversationId?: string): Promise<ElevationPlan | undefined>;
  createElevationPlan(plan: InsertElevationPlan): Promise<ElevationPlan>;
  updateElevationPlan(id: string, userId: string, data: Partial<ElevationPlan>): Promise<ElevationPlan | undefined>;
  getElevationPlanDays(planId: string): Promise<ElevationPlanDay[]>;
  createElevationPlanDay(day: InsertElevationPlanDay): Promise<ElevationPlanDay>;
  getElevationPlanActions(planDayId: string): Promise<ElevationPlanAction[]>;
  getElevationPlanActionForUser(id: string, userId: string): Promise<ElevationPlanAction | undefined>;
  createElevationPlanAction(action: InsertElevationPlanAction): Promise<ElevationPlanAction>;
  updateElevationPlanAction(id: string, userId: string, data: Partial<ElevationPlanAction>): Promise<ElevationPlanAction | undefined>;
  // Reminders (PR #7)
  getReminders(userId: string, status?: string): Promise<Reminder[]>;
  getDueReminders(userId: string, before: Date): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, userId: string, fields: Partial<Pick<Reminder, "status" | "scheduledAt" | "title" | "body">>): Promise<Reminder | undefined>;
  cancelRemindersBySource(userId: string, sourceEntityType: string, sourceEntityId: string): Promise<void>;

  // Learning profile (PR #8)
  getLearningProfile(userId: string): Promise<UserLearningProfile | undefined>;
  upsertLearningProfile(userId: string, data: UpdateUserLearningProfile): Promise<UserLearningProfile>;
  resetLearningProfile(userId: string): Promise<UserLearningProfile>;

  // Weekly Plan Reviews (PR #15)
  getWeeklyPlanReview(planId: string, userId: string): Promise<WeeklyPlanReview | undefined>;
  createWeeklyPlanReview(data: InsertWeeklyPlanReview): Promise<WeeklyPlanReview>;
  updateWeeklyPlanReview(planId: string, userId: string, data: UpdateWeeklyPlanReview): Promise<WeeklyPlanReview | undefined>;

  // Notifications
  createNotification(data: { userId: string; type: string; title: string; body: string; actionUrl?: string; metadata?: any }): Promise<any>;
  getUserNotifications(userId: string): Promise<any[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;

  // Evening Check-Ins
  getTodayCheckIn(userId: string): Promise<any | undefined>;
  getCheckInByDate(userId: string, date: string): Promise<any | undefined>;
  createEveningCheckIn(data: { userId: string; checkInDate: string; userNotes?: string; completedSummary?: string; dwAnalysis?: string; energyScore?: number }): Promise<any>;

  // Username
  getUserByUsername(username: string): Promise<any | undefined>;
  setUsername(userId: string, username: string, systemName?: string): Promise<void>;
}

export interface AdminAnalytics {
  dau: number;
  wau: number;
  mau: number;
  activationRate7d: number;
  d7MeaningfulRetention: number;
  helpedPositiveRate: number;
  funnel: {
    onboardingStarted: number;
    onboardingCompleted: number;
    planGenerated: number;
    planSaved: number;
    planItemCompleted: number;
    checkInSubmitted: number;
  };
  switchPerformance: {
    switchId: string;
    completions: number;
    helpedPositiveRate: number;
  }[];
  errors: {
    errorsPerSession: number;
    topErrorCodes: { code: string; count: number }[];
  };
}

export interface UserProgress {
  systemSnapshot: {
    energy: string;
    stress: string;
    consistencyDays: number;
  };
  switches: {
    switchId: string;
    status: string;
    lastTrained: string | null;
  }[];
  weeklyWins: {
    completedActions: number;
    bestDay: string | null;
    helped: number;
    somewhat: number;
    didntHelp: number;
  };
  patterns: { label: string; count: number }[];
}

export interface AdminMetricsSummary {
  dau: number;
  wau: number;
  mau: number;
  activationRate7d: number;
  d1Retention: number;
  d7Retention: number;
  d7MeaningfulRetention: number;
  helpedPositiveRate: number;
  avgCompletionsPerActiveUser: number;
  swapRate: number;
  errorsPerSession: number;
  sessions: number;
  planGenerated: number;
  planSaved: number;
  planItemCompleted: number;
  postActionCheckins: number;
  recommendationsViewed: number;
  recommendationsSwapped: number;
  errors: number;
}

export interface AdminMetricsFunnel {
  onboardingStarted: number;
  onboardingCompleted: number;
  planGenerated: number;
  planSaved: number;
  planItemCompleted: number;
  postActionCheckin: number;
}

export interface AdminSwitchData {
  detailViews: number;
  plansGenerated: number;
  plansSaved: number;
  itemsCompleted: number;
  helpedYes: number;
  helpedSome: number;
  helpedNo: number;
  helpedTotal: number;
}

export interface AdminRecommendationsData {
  viewed: number;
  swapped: number;
  accepted: number;
  completedWithin24h: number;
  byReason: { reason: string; count: number }[];
  bySwitch: { switchId: string; recommended: number; completedWithin24h: number; completion24hRate: number }[];
}

export interface AdminTimebandData {
  distribution: { tiny: number; small: number; medium: number; large: number };
  modeDistribution: { restoring: number; training: number; maintaining: number };
  helpedByTimeBand: { timeBand: string; helpedPositiveRate: number; sampleSize: number }[];
  helpedByMode: { mode: string; helpedPositiveRate: number; sampleSize: number }[];
  completionByTimeBand: { timeBand: string; itemsCompleted: number }[];
}

export interface AdminFlagsData {
  topFlags: { flagKey: string; count: number }[];
  flagToOutcome: { flagKey: string; recommendedSwitchId: string; recommendations: number; completedWithin24h: number; completion24hRate: number }[];
}

export interface AdminErrorsData {
  errorsPerSession: number;
  topErrorCodes: { errorCode: string; count: number }[];
  topScreens: { screenId: string; count: number }[];
}

export interface UserProgressSummary {
  energyLevel: string;
  stressLevel: string;
  timeBand: string;
  consistencyDays: number;
  actionsCompleted: number;
  bestDay: string | null;
  helpedYes: number;
  helpedSome: number;
  helpedNo: number;
}

export interface UserSwitchProgress {
  switchId: string;
  status: string;
  lastTrainedAt: string | null;
  completedCount: number;
}

export interface UserRecommendation {
  switchId: string;
  alternativeId: string;
  timeBand: string;
  mode: string;
  title: string;
  reason: string;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByOAuthId(provider: string, oauthId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId)));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    // Delete all user-related data in a single transaction so a partial
    // failure cannot leave orphan rows behind (e.g. push_subscriptions /
    // notification_preferences that the reminder scheduler would keep
    // pushing to until the push service returns 410).
    // Order: child tables first, parent last — preserves referential
    // integrity even without DB-level CASCADE.
    await db.transaction(async (tx) => {
      await tx.delete(chatAttachments).where(eq(chatAttachments.userId, id));
      await tx.delete(aiPatternSnapshots).where(eq(aiPatternSnapshots.userId, id));
      await tx.delete(wellnessBlueprints).where(eq(wellnessBlueprints.userId, id));
      await tx.delete(baselineProfiles).where(eq(baselineProfiles.userId, id));
      await tx.delete(stressSignals).where(eq(stressSignals.userId, id));
      await tx.delete(stabilizingActions).where(eq(stabilizingActions.userId, id));
      await tx.delete(supportPreferences).where(eq(supportPreferences.userId, id));
      await tx.delete(recoveryReflections).where(eq(recoveryReflections.userId, id));
      await tx.delete(projectChats).where(eq(projectChats.userId, id));
      await tx.delete(projects).where(eq(projects.userId, id));
      await tx.delete(routineLogs).where(eq(routineLogs.userId, id));
      await tx.delete(routines).where(eq(routines.userId, id));
      await tx.delete(calendarEvents).where(eq(calendarEvents.userId, id));
      await tx.delete(tasks).where(eq(tasks.userId, id));
      await tx.delete(challenges).where(eq(challenges.userId, id));
      await tx.delete(bodyScans).where(eq(bodyScans.userId, id));
      await tx.delete(systemModules).where(eq(systemModules.userId, id));
      await tx.delete(dailyScheduleEvents).where(eq(dailyScheduleEvents.userId, id));
      await tx.delete(userSystemPreferences).where(eq(userSystemPreferences.userId, id));
      await tx.delete(mealPlans).where(eq(mealPlans.userId, id));
      await tx.delete(mealPrepPreferences).where(eq(mealPrepPreferences.userId, id));
      await tx.delete(shoppingListItems).where(eq(shoppingListItems.userId, id));
      await tx.delete(shoppingLists).where(eq(shoppingLists.userId, id));
      await tx.delete(wearableData).where(eq(wearableData.userId, id));
      await tx.delete(wearableDevices).where(eq(wearableDevices.userId, id));
      await tx.delete(astrologyPredictions).where(eq(astrologyPredictions.userId, id));
      await tx.delete(importedDocumentItems).where(eq(importedDocumentItems.userId, id));
      await tx.delete(importedDocuments).where(eq(importedDocuments.userId, id));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
      await tx.delete(conversations).where(eq(conversations.userId, id));
      await tx.delete(userFeedback).where(eq(userFeedback.userId, id));
      await tx.delete(weeklyFeedbackResponses).where(eq(weeklyFeedbackResponses.userId, id));
      await tx.delete(habitLogs).where(eq(habitLogs.userId, id));
      await tx.delete(habits).where(eq(habits.userId, id));
      await tx.delete(goals).where(eq(goals.userId, id));
      await tx.delete(moodLogs).where(eq(moodLogs.userId, id));
      await tx.delete(checkIns).where(eq(checkIns.userId, id));
      await tx.delete(scheduleBlocks).where(eq(scheduleBlocks.userId, id));
      await tx.delete(categoryEntries).where(eq(categoryEntries.userId, id));
      await tx.delete(aiSyncItems).where(eq(aiSyncItems.userId, id));
      await tx.delete(aiSyncSessions).where(eq(aiSyncSessions.userId, id));
      await tx.delete(interactionEvents).where(eq(interactionEvents.userId, id));
      await tx.delete(aiLearnings).where(eq(aiLearnings.userId, id));
      await tx.delete(dailyMoodCheckins).where(eq(dailyMoodCheckins.userId, id));
      await tx.delete(activityCompletions).where(eq(activityCompletions.userId, id));
      await tx.delete(trackerSettings).where(eq(trackerSettings.userId, id));
      await tx.delete(workoutPlans).where(eq(workoutPlans.userId, id));
      await tx.delete(birthCharts).where(eq(birthCharts.userId, id));
      await tx.delete(userProfiles).where(eq(userProfiles.userId, id));
      await tx.delete(onboardingProfiles).where(eq(onboardingProfiles.userId, id));
      await tx.delete(lifeSystems).where(eq(lifeSystems.userId, id));
      // Reminder opt-in rows: removing these stops the scheduler from
      // continuing to push to a deleted user's browsers.
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));
      await tx.delete(notificationPreferences).where(eq(notificationPreferences.userId, id));

      // Finally, delete the user
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async getOnboardingProfile(userId: string): Promise<OnboardingProfile | undefined> {
    const [profile] = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId));
    return profile || undefined;
  }

  async createOnboardingProfile(profile: InsertOnboardingProfile): Promise<OnboardingProfile> {
    const [created] = await db.insert(onboardingProfiles).values(profile).returning();
    return created;
  }

  async updateOnboardingProfile(id: string, data: Partial<OnboardingProfile>): Promise<OnboardingProfile | undefined> {
    const [profile] = await db.update(onboardingProfiles).set(data).where(eq(onboardingProfiles.id, id)).returning();
    return profile || undefined;
  }

  async getLifeSystem(userId: string): Promise<LifeSystem | undefined> {
    const [system] = await db.select().from(lifeSystems).where(eq(lifeSystems.userId, userId));
    return system || undefined;
  }

  async createLifeSystem(system: InsertLifeSystem): Promise<LifeSystem> {
    const [created] = await db.insert(lifeSystems).values(system).returning();
    return created;
  }

  async updateLifeSystem(id: string, data: Partial<LifeSystem>): Promise<LifeSystem | undefined> {
    const [system] = await db.update(lifeSystems).set(data).where(eq(lifeSystems.id, id)).returning();
    return system || undefined;
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [created] = await db.insert(goals).values(goal).returning();
    return created;
  }

  async createGoals(goalsList: InsertGoal[]): Promise<Goal[]> {
    if (goalsList.length === 0) return [];
    return await db.insert(goals).values(goalsList).returning();
  }

  async updateGoal(id: string, data: Partial<Goal>): Promise<Goal | undefined> {
    const [goal] = await db.update(goals).set(data).where(eq(goals.id, id)).returning();
    return goal || undefined;
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async getHabits(userId: string): Promise<Habit[]> {
    return db.select().from(habits).where(eq(habits.userId, userId)).orderBy(desc(habits.createdAt));
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    return habit || undefined;
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const [created] = await db.insert(habits).values(habit).returning();
    return created;
  }

  async createHabits(habitsList: InsertHabit[]): Promise<Habit[]> {
    if (habitsList.length === 0) return [];
    return await db.insert(habits).values(habitsList).returning();
  }

  async updateHabit(id: string, data: Partial<Habit>): Promise<Habit | undefined> {
    const [habit] = await db.update(habits).set(data).where(eq(habits.id, id)).returning();
    return habit || undefined;
  }

  async deleteHabit(id: string): Promise<void> {
    await db.delete(habitLogs).where(eq(habitLogs.habitId, id));
    await db.delete(habits).where(eq(habits.id, id));
  }

  async getHabitLogs(habitId: string): Promise<HabitLog[]> {
    return db.select().from(habitLogs).where(eq(habitLogs.habitId, habitId)).orderBy(desc(habitLogs.completedAt));
  }

  async getTodaysHabitLog(habitId: string): Promise<HabitLog | undefined> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [log] = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.completedAt, startOfDay)))
      .orderBy(desc(habitLogs.completedAt))
      .limit(1);
    return log || undefined;
  }

  async getTodayHabitLogsByUser(userId: string): Promise<HabitLog[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    // Fetch all today's logs for habits owned by this user in a single query
    const userHabits = await db.select({ id: habits.id }).from(habits).where(eq(habits.userId, userId));
    if (userHabits.length === 0) return [];
    const habitIds = userHabits.map((h) => h.id);
    return db
      .select()
      .from(habitLogs)
      .where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.completedAt, startOfDay)));
  }

  async createHabitLog(log: InsertHabitLog): Promise<HabitLog> {
    const [created] = await db.insert(habitLogs).values(log).returning();
    return created;
  }

  async deleteHabitLog(logId: string): Promise<void> {
    await db.delete(habitLogs).where(eq(habitLogs.id, logId));
  }

  async deleteAllTodaysHabitLogs(habitId: string): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    await db
      .delete(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.completedAt, startOfDay)));
  }

  async getMoodLogs(userId: string): Promise<MoodLog[]> {
    return db.select().from(moodLogs).where(eq(moodLogs.userId, userId)).orderBy(desc(moodLogs.createdAt));
  }

  async getRecentMoodLogs(userId: string, sinceDate: Date): Promise<{ logs: MoodLog[]; hasPriorLogs: boolean }> {
    // Fetch only logs within the window
    const logs = await db
      .select()
      .from(moodLogs)
      .where(and(eq(moodLogs.userId, userId), gte(moodLogs.createdAt, sinceDate)))
      .orderBy(desc(moodLogs.createdAt));

    // Cheap existence check: does this user have any logs older than the window?
    const [priorRow] = await db
      .select({ id: moodLogs.id })
      .from(moodLogs)
      .where(and(eq(moodLogs.userId, userId), lte(moodLogs.createdAt, sinceDate)))
      .limit(1);

    return { logs, hasPriorLogs: Boolean(priorRow) };
  }

  async getTodaysMoodLog(userId: string): Promise<MoodLog | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [log] = await db
      .select()
      .from(moodLogs)
      .where(and(eq(moodLogs.userId, userId), gte(moodLogs.createdAt, today)))
      .orderBy(desc(moodLogs.createdAt))
      .limit(1);
    return log || undefined;
  }

  async createMoodLog(log: InsertMoodLog): Promise<MoodLog> {
    const [created] = await db.insert(moodLogs).values(log).returning();
    return created;
  }

  async getMoodLog(id: string): Promise<MoodLog | undefined> {
    const [row] = await db.select().from(moodLogs).where(eq(moodLogs.id, id)).limit(1);
    return row || undefined;
  }

  async getMoodInsights(userId: string): Promise<MoodInsight[]> {
    return db.select()
      .from(moodInsights)
      .where(eq(moodInsights.userId, userId))
      .orderBy(desc(sql`abs(${moodInsights.effect})`));
  }

  async replaceMoodInsights(userId: string, rows: InsertMoodInsight[]): Promise<MoodInsight[]> {
    // Atomic-ish replace: delete then insert. Done in a transaction so the user
    // never sees a partial state.
    return await db.transaction(async (tx) => {
      await tx.delete(moodInsights).where(eq(moodInsights.userId, userId));
      if (rows.length === 0) return [];
      return tx.insert(moodInsights)
        .values(rows.map(r => ({ ...r, userId })))
        .returning();
    });
  }

  async getDailyBrief(userId: string, dateKey: string, variant: DailyBriefVariant): Promise<DailyBrief | undefined> {
    const [row] = await db.select()
      .from(dailyBriefs)
      .where(and(
        eq(dailyBriefs.userId, userId),
        eq(dailyBriefs.dateKey, dateKey),
        eq(dailyBriefs.variant, variant),
      ))
      .limit(1);
    return row;
  }

  async upsertDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief> {
    const [row] = await db.insert(dailyBriefs)
      .values({ ...brief, generatedAt: new Date() })
      .onConflictDoUpdate({
        target: [dailyBriefs.userId, dailyBriefs.dateKey, dailyBriefs.variant],
        set: {
          summaryText: brief.summaryText,
          bullets: brief.bullets,
          generatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async getJournalEntriesByMood(userId: string, moodLogId: string): Promise<DwJournalEntry[]> {
    return db.select()
      .from(dwJournalEntries)
      .where(and(eq(dwJournalEntries.userId, userId), eq(dwJournalEntries.moodLogId, moodLogId)))
      .orderBy(desc(dwJournalEntries.createdAt));
  }

  async getCheckIns(userId: string): Promise<CheckIn[]> {
    return db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(10);
  }

  async createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn> {
    const [created] = await db.insert(checkIns).values(checkIn).returning();
    return created;
  }

  async getScheduleBlocks(userId: string): Promise<ScheduleBlock[]> {
    return db.select().from(scheduleBlocks).where(eq(scheduleBlocks.userId, userId));
  }

  async getScheduleBlock(id: string): Promise<ScheduleBlock | undefined> {
    const [block] = await db.select().from(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    return block || undefined;
  }

  async createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock> {
    const [created] = await db.insert(scheduleBlocks).values(block).returning();
    return created;
  }

  async updateScheduleBlock(id: string, data: Partial<ScheduleBlock>): Promise<ScheduleBlock | undefined> {
    const [block] = await db.update(scheduleBlocks).set(data).where(eq(scheduleBlocks.id, id)).returning();
    return block || undefined;
  }

  async deleteScheduleBlock(id: string): Promise<void> {
    await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
  }

  async getCategoryEntries(userId: string, category?: string): Promise<CategoryEntry[]> {
    if (category) {
      return db.select().from(categoryEntries)
        .where(and(eq(categoryEntries.userId, userId), eq(categoryEntries.category, category)))
        .orderBy(desc(categoryEntries.createdAt));
    }
    return db.select().from(categoryEntries)
      .where(eq(categoryEntries.userId, userId))
      .orderBy(desc(categoryEntries.createdAt));
  }

  async createCategoryEntry(entry: InsertCategoryEntry): Promise<CategoryEntry> {
    const [created] = await db.insert(categoryEntries).values(entry).returning();
    return created;
  }

  async createCategoryEntries(entries: InsertCategoryEntry[]): Promise<CategoryEntry[]> {
    if (entries.length === 0) return [];
    return await db.insert(categoryEntries).values(entries).returning();
  }

  async deleteCategoryEntry(id: string): Promise<void> {
    await db.delete(categoryEntries).where(eq(categoryEntries.id, id));
  }

  async getWellnessBlueprint(userId: string): Promise<WellnessBlueprint | undefined> {
    const [blueprint] = await db.select().from(wellnessBlueprints)
      .where(and(eq(wellnessBlueprints.userId, userId), eq(wellnessBlueprints.isActive, true)));
    return blueprint || undefined;
  }

  async createWellnessBlueprint(blueprint: InsertWellnessBlueprint): Promise<WellnessBlueprint> {
    const [created] = await db.insert(wellnessBlueprints).values(blueprint).returning();
    return created;
  }

  async updateWellnessBlueprint(id: string, data: Partial<WellnessBlueprint>): Promise<WellnessBlueprint | undefined> {
    const [updated] = await db.update(wellnessBlueprints).set({ ...data, updatedAt: new Date() })
      .where(eq(wellnessBlueprints.id, id)).returning();
    return updated || undefined;
  }

  async getBaselineProfile(blueprintId: string): Promise<BaselineProfile | undefined> {
    const [profile] = await db.select().from(baselineProfiles)
      .where(eq(baselineProfiles.blueprintId, blueprintId));
    return profile || undefined;
  }

  async createBaselineProfile(profile: InsertBaselineProfile): Promise<BaselineProfile> {
    const [created] = await db.insert(baselineProfiles).values(profile).returning();
    return created;
  }

  async updateBaselineProfile(id: string, data: Partial<BaselineProfile>): Promise<BaselineProfile | undefined> {
    const [updated] = await db.update(baselineProfiles).set(data)
      .where(eq(baselineProfiles.id, id)).returning();
    return updated || undefined;
  }

  async getStressSignals(blueprintId: string): Promise<StressSignals | undefined> {
    const [signals] = await db.select().from(stressSignals)
      .where(eq(stressSignals.blueprintId, blueprintId));
    return signals || undefined;
  }

  async createStressSignals(signals: InsertStressSignals): Promise<StressSignals> {
    const [created] = await db.insert(stressSignals).values(signals).returning();
    return created;
  }

  async updateStressSignals(id: string, data: Partial<StressSignals>): Promise<StressSignals | undefined> {
    const [updated] = await db.update(stressSignals).set(data)
      .where(eq(stressSignals.id, id)).returning();
    return updated || undefined;
  }

  async getStabilizingActions(blueprintId: string): Promise<StabilizingAction[]> {
    return db.select().from(stabilizingActions)
      .where(eq(stabilizingActions.blueprintId, blueprintId));
  }

  async getStabilizingAction(id: string): Promise<StabilizingAction | undefined> {
    const [action] = await db.select().from(stabilizingActions).where(eq(stabilizingActions.id, id));
    return action || undefined;
  }

  async createStabilizingAction(action: InsertStabilizingAction): Promise<StabilizingAction> {
    const [created] = await db.insert(stabilizingActions).values(action).returning();
    return created;
  }

  async updateStabilizingAction(id: string, data: Partial<StabilizingAction>): Promise<StabilizingAction | undefined> {
    const [updated] = await db.update(stabilizingActions).set(data)
      .where(eq(stabilizingActions.id, id)).returning();
    return updated || undefined;
  }

  async deleteStabilizingAction(id: string): Promise<void> {
    await db.delete(stabilizingActions).where(eq(stabilizingActions.id, id));
  }

  async getSupportPreferences(blueprintId: string): Promise<SupportPreferences | undefined> {
    const [prefs] = await db.select().from(supportPreferences)
      .where(eq(supportPreferences.blueprintId, blueprintId));
    return prefs || undefined;
  }

  async createSupportPreferences(prefs: InsertSupportPreferences): Promise<SupportPreferences> {
    const [created] = await db.insert(supportPreferences).values(prefs).returning();
    return created;
  }

  async updateSupportPreferences(id: string, data: Partial<SupportPreferences>): Promise<SupportPreferences | undefined> {
    const [updated] = await db.update(supportPreferences).set(data)
      .where(eq(supportPreferences.id, id)).returning();
    return updated || undefined;
  }

  async getRecoveryReflections(blueprintId: string): Promise<RecoveryReflection[]> {
    return db.select().from(recoveryReflections)
      .where(eq(recoveryReflections.blueprintId, blueprintId))
      .orderBy(desc(recoveryReflections.createdAt));
  }

  async getRecoveryReflection(id: string): Promise<RecoveryReflection | undefined> {
    const [reflection] = await db.select().from(recoveryReflections).where(eq(recoveryReflections.id, id));
    return reflection || undefined;
  }

  async createRecoveryReflection(reflection: InsertRecoveryReflection): Promise<RecoveryReflection> {
    const [created] = await db.insert(recoveryReflections).values(reflection).returning();
    return created;
  }

  async updateRecoveryReflection(id: string, data: Partial<RecoveryReflection>): Promise<RecoveryReflection | undefined> {
    const [updated] = await db.update(recoveryReflections).set(data)
      .where(eq(recoveryReflections.id, id)).returning();
    return updated || undefined;
  }

  async deleteRecoveryReflection(id: string): Promise<void> {
    await db.delete(recoveryReflections).where(eq(recoveryReflections.id, id));
  }

  async getRoutines(userId: string): Promise<Routine[]> {
    return db.select().from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(desc(routines.createdAt));
  }

  async getRoutine(id: string): Promise<Routine | undefined> {
    const [routine] = await db.select().from(routines).where(eq(routines.id, id));
    return routine || undefined;
  }

  async createRoutine(routine: InsertRoutine): Promise<Routine> {
    const [created] = await db.insert(routines).values(routine).returning();
    return created;
  }

  async updateRoutine(id: string, data: Partial<Routine>): Promise<Routine | undefined> {
    const [updated] = await db.update(routines).set(data)
      .where(eq(routines.id, id)).returning();
    return updated || undefined;
  }

  async deleteRoutine(id: string): Promise<void> {
    await db.delete(routineLogs).where(eq(routineLogs.routineId, id));
    await db.delete(routines).where(eq(routines.id, id));
  }

  async getRoutineLogs(routineId: string): Promise<RoutineLog[]> {
    return db.select().from(routineLogs)
      .where(eq(routineLogs.routineId, routineId))
      .orderBy(desc(routineLogs.completedAt));
  }

  async createRoutineLog(log: InsertRoutineLog): Promise<RoutineLog> {
    const [created] = await db.insert(routineLogs).values(log).returning();
    return created;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(data)
      .where(eq(tasks.id, id)).returning();
    return updated || undefined;
  }

  async updateTaskForUser(id: string, userId: string, data: Partial<Task>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(data)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
    return updated || undefined;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectForUser(id: string, userId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProjectForUser(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(data)
      .where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
    return updated || undefined;
  }

  async deleteProjectForUser(id: string, userId: string): Promise<boolean> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    if (!project) return false;
    await db.delete(projectChats).where(eq(projectChats.projectId, id));
    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return true;
  }

  async getProjectChatsForUser(projectId: string, userId: string): Promise<ProjectChat[]> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (!project) return [];
    return db.select().from(projectChats)
      .where(eq(projectChats.projectId, projectId))
      .orderBy(desc(projectChats.createdAt));
  }

  async createProjectChatForUser(chat: InsertProjectChat, userId: string): Promise<ProjectChat | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, chat.projectId), eq(projects.userId, userId)));
    if (!project) return undefined;
    const [created] = await db.insert(projectChats).values(chat).returning();
    await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, chat.projectId));
    return created;
  }

  async touchProjectActivity(projectId: string, userId: string): Promise<void> {
    await db.update(projects).set({ lastActivityAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  async getProjectMilestones(projectId: string, userId: string): Promise<ProjectMilestone[]> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (!project) return [];
    return db.select().from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(projectMilestones.order, projectMilestones.createdAt);
  }

  async createProjectMilestone(milestone: InsertProjectMilestone, userId: string): Promise<ProjectMilestone | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, milestone.projectId), eq(projects.userId, userId)));
    if (!project) return undefined;
    const [created] = await db.insert(projectMilestones).values(milestone).returning();
    await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, milestone.projectId));
    return created;
  }

  async updateProjectMilestone(
    id: string,
    projectId: string,
    userId: string,
    data: Partial<InsertProjectMilestone> & { doneAt?: Date | null },
  ): Promise<ProjectMilestone | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (!project) return undefined;
    const [updated] = await db.update(projectMilestones).set(data)
      .where(and(eq(projectMilestones.id, id), eq(projectMilestones.projectId, projectId)))
      .returning();
    if (updated) {
      await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, projectId));
    }
    return updated || undefined;
  }

  async deleteProjectMilestone(id: string, projectId: string, userId: string): Promise<boolean> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (!project) return false;
    const result = await db.delete(projectMilestones)
      .where(and(eq(projectMilestones.id, id), eq(projectMilestones.projectId, projectId)))
      .returning();
    if (result.length > 0) {
      await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, projectId));
    }
    return result.length > 0;
  }

  async getProjectArtifacts(projectId: string, userId: string): Promise<ProjectArtifact[]> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (!project) return [];
    return db.select().from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, projectId))
      .orderBy(desc(projectArtifacts.addedAt));
  }

  async createProjectArtifact(artifact: InsertProjectArtifact, userId: string): Promise<ProjectArtifact | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, artifact.projectId), eq(projects.userId, userId)));
    if (!project) return undefined;
    const [created] = await db.insert(projectArtifacts).values(artifact).returning();
    await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, artifact.projectId));
    return created;
  }

  async deleteProjectArtifact(id: string, projectId: string, userId: string): Promise<boolean> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (!project) return false;
    const result = await db.delete(projectArtifacts)
      .where(and(eq(projectArtifacts.id, id), eq(projectArtifacts.projectId, projectId)))
      .returning();
    if (result.length > 0) {
      await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, projectId));
    }
    return result.length > 0;
  }

  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(desc(calendarEvents.startTime));
  }

  async getCalendarEventForUser(id: string, userId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
    return event || undefined;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents).values(event).returning();
    return created;
  }

  async createCalendarEvents(events: InsertCalendarEvent[]): Promise<CalendarEvent[]> {
    if (events.length === 0) return [];
    return await db.insert(calendarEvents).values(events).returning();
  }

  async updateCalendarEventForUser(id: string, userId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const [updated] = await db.update(calendarEvents).set(data)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
    return updated || undefined;
  }

  async deleteCalendarEventForUser(id: string, userId: string): Promise<boolean> {
    await db.delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
    return true;
  }

  async clearLifeSystemImportData(userId: string): Promise<{ calendarEvents: number; mealPlans: number; workoutPlans: number }> {
    let calEvtCount = 0;
    let mealPlanCount = 0;
    let workoutPlanCount = 0;

    // Delete calendar events created by life system import:
    // (a) new events with source marker in linkedMeta
    // (b) old events (pre-marker) identifiable by eventType + linkedRoute combinations only set by imports
    const importedEvts = await db.select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        or(
          sql`${calendarEvents.linkedMeta} @> '{"source":"life_system_import"}'::jsonb`,
          and(eq(calendarEvents.eventType, "workout"), eq(calendarEvents.linkedRoute, "/workout")),
          and(eq(calendarEvents.eventType, "meal"), eq(calendarEvents.linkedRoute, "/meal-prep")),
          and(eq(calendarEvents.eventType, "work"), eq(calendarEvents.linkedRoute, "/plan")),
          // Old "other" events from imports: eventType=event with null linkedMeta (no source marker yet)
          and(eq(calendarEvents.eventType, "event"), sql`${calendarEvents.linkedMeta} IS NULL`)
        )
      ));
    if (importedEvts.length) {
      const ids = importedEvts.map((e) => e.id);
      await db.delete(calendarEventTasks).where(inArray(calendarEventTasks.calendarEventId, ids));
      await db.delete(calendarEvents).where(inArray(calendarEvents.id, ids));
      calEvtCount = ids.length;
    }

    // Delete meal plans created by life system import
    const importedMealPlans = await db.select({ id: mealPlans.id })
      .from(mealPlans)
      .where(and(eq(mealPlans.userId, userId), eq(mealPlans.source, "life_system_import")));
    for (const plan of importedMealPlans) {
      await db.delete(meals).where(eq(meals.mealPlanId, plan.id));
      await db.delete(mealPlans).where(eq(mealPlans.id, plan.id));
      mealPlanCount++;
    }

    // Delete workout plans created by life system import
    const importedWorkoutPlans = await db.select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.source, "life_system_import")));
    for (const plan of importedWorkoutPlans) {
      await db.delete(exercises).where(eq(exercises.workoutPlanId, plan.id));
      await db.delete(workoutPlans).where(eq(workoutPlans.id, plan.id));
      workoutPlanCount++;
    }

    return { calendarEvents: calEvtCount, mealPlans: mealPlanCount, workoutPlans: workoutPlanCount };
  }

  async getEventTasks(calendarEventId: string, userId: string): Promise<CalendarEventTask[]> {
    return db.select().from(calendarEventTasks)
      .where(and(
        eq(calendarEventTasks.calendarEventId, calendarEventId),
        eq(calendarEventTasks.userId, userId),
      ))
      .orderBy(calendarEventTasks.createdAt);
  }

  async createEventTask(task: InsertCalendarEventTask): Promise<CalendarEventTask> {
    const [created] = await db.insert(calendarEventTasks).values(task).returning();
    return created;
  }

  async createEventTasks(tasks: InsertCalendarEventTask[]): Promise<CalendarEventTask[]> {
    if (tasks.length === 0) return [];
    return await db.insert(calendarEventTasks).values(tasks).returning();
  }

  async updateEventTask(id: string, userId: string, data: Partial<CalendarEventTask>): Promise<CalendarEventTask | undefined> {
    const [updated] = await db.update(calendarEventTasks)
      .set(data)
      .where(and(eq(calendarEventTasks.id, id), eq(calendarEventTasks.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteEventTask(id: string, userId: string): Promise<boolean> {
    await db.delete(calendarEventTasks)
      .where(and(eq(calendarEventTasks.id, id), eq(calendarEventTasks.userId, userId)));
    return true;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles).set({ ...data, lastUpdated: new Date() })
      .where(eq(userProfiles.userId, userId)).returning();
    return updated || undefined;
  }

  async getWellnessContent(filters?: { category?: string; goalTags?: string[]; difficulty?: string }): Promise<WellnessContent[]> {
    let query = db.select().from(wellnessContent).where(eq(wellnessContent.isActive, true));
    return query;
  }

  async getWellnessContentById(id: string): Promise<WellnessContent | undefined> {
    const [content] = await db.select().from(wellnessContent).where(eq(wellnessContent.id, id));
    return content || undefined;
  }

  async getSavedContent(userId: string): Promise<SavedContent[]> {
    return db.select().from(savedContent)
      .where(eq(savedContent.userId, userId))
      .orderBy(desc(savedContent.savedAt));
  }

  async getSavedContentById(id: string, userId: string): Promise<SavedContent | undefined> {
    const [content] = await db.select().from(savedContent)
      .where(and(eq(savedContent.id, id), eq(savedContent.userId, userId)));
    return content || undefined;
  }

  async createSavedContent(content: InsertSavedContent): Promise<SavedContent> {
    const [created] = await db.insert(savedContent).values(content).returning();
    return created;
  }

  async updateSavedContent(id: string, userId: string, data: Partial<SavedContent>): Promise<SavedContent | undefined> {
    const [updated] = await db.update(savedContent)
      .set(data)
      .where(and(eq(savedContent.id, id), eq(savedContent.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteSavedContent(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(savedContent)
      .where(and(eq(savedContent.id, id), eq(savedContent.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async createFeedInteraction(data: InsertFeedInteraction): Promise<FeedInteraction> {
    const [created] = await db.insert(feedInteractions).values(data).returning();
    return created;
  }

  async getFeedInteractionsByAction(userId: string, action: string): Promise<FeedInteraction[]> {
    return db.select().from(feedInteractions)
      .where(and(eq(feedInteractions.userId, userId), eq(feedInteractions.action, action)))
      .orderBy(desc(feedInteractions.createdAt));
  }

  async getChallenges(userId: string): Promise<Challenge[]> {
    return db.select().from(challenges)
      .where(eq(challenges.userId, userId))
      .orderBy(desc(challenges.createdAt));
  }

  async getChallenge(id: string, userId: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges)
      .where(and(eq(challenges.id, id), eq(challenges.userId, userId)));
    return challenge || undefined;
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [created] = await db.insert(challenges).values(challenge).returning();
    return created;
  }

  async updateChallenge(id: string, userId: string, data: Partial<Challenge>): Promise<Challenge | undefined> {
    const [updated] = await db.update(challenges).set(data)
      .where(and(eq(challenges.id, id), eq(challenges.userId, userId))).returning();
    return updated || undefined;
  }

  async deleteChallenge(id: string, userId: string): Promise<boolean> {
    await db.delete(challenges).where(and(eq(challenges.id, id), eq(challenges.userId, userId)));
    return true;
  }

  async getBodyScans(userId: string): Promise<BodyScan[]> {
    return db.select().from(bodyScans)
      .where(eq(bodyScans.userId, userId))
      .orderBy(desc(bodyScans.createdAt));
  }

  async createBodyScan(scan: InsertBodyScan): Promise<BodyScan> {
    const [created] = await db.insert(bodyScans).values(scan).returning();
    return created;
  }

  async deleteBodyScan(id: string, userId: string): Promise<boolean> {
    await db.delete(bodyScans).where(and(eq(bodyScans.id, id), eq(bodyScans.userId, userId)));
    return true;
  }

  async getSystemModules(userId: string): Promise<SystemModule[]> {
    return db.select().from(systemModules).where(eq(systemModules.userId, userId));
  }

  async getSystemModule(id: string): Promise<SystemModule | undefined> {
    const [module] = await db.select().from(systemModules).where(eq(systemModules.id, id));
    return module || undefined;
  }

  async createSystemModule(module: InsertSystemModule): Promise<SystemModule> {
    const [created] = await db.insert(systemModules).values(module).returning();
    return created;
  }

  async updateSystemModule(id: string, data: Partial<SystemModule>): Promise<SystemModule | undefined> {
    const [updated] = await db.update(systemModules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(systemModules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSystemModule(id: string): Promise<void> {
    await db.delete(systemModules).where(eq(systemModules.id, id));
  }

  async getScheduleEvents(userId: string): Promise<DailyScheduleEvent[]> {
    return db.select().from(dailyScheduleEvents)
      .where(eq(dailyScheduleEvents.userId, userId))
      .orderBy(dailyScheduleEvents.scheduledTime);
  }

  async getScheduleEventsByDay(userId: string, dayOfWeek: number): Promise<DailyScheduleEvent[]> {
    return db.select().from(dailyScheduleEvents)
      .where(and(
        eq(dailyScheduleEvents.userId, userId),
        eq(dailyScheduleEvents.dayOfWeek, dayOfWeek)
      ))
      .orderBy(dailyScheduleEvents.scheduledTime);
  }

  async getScheduleEvent(id: string): Promise<DailyScheduleEvent | undefined> {
    const [event] = await db.select().from(dailyScheduleEvents).where(eq(dailyScheduleEvents.id, id));
    return event || undefined;
  }

  async createScheduleEvent(event: InsertDailyScheduleEvent): Promise<DailyScheduleEvent> {
    const [created] = await db.insert(dailyScheduleEvents).values(event).returning();
    return created;
  }

  async updateScheduleEvent(id: string, data: Partial<DailyScheduleEvent>): Promise<DailyScheduleEvent | undefined> {
    const [updated] = await db.update(dailyScheduleEvents)
      .set(data)
      .where(eq(dailyScheduleEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteScheduleEvent(id: string): Promise<void> {
    await db.delete(dailyScheduleEvents).where(eq(dailyScheduleEvents.id, id));
  }

  async getUserSystemPreferences(userId: string): Promise<UserSystemPreferences | undefined> {
    const [prefs] = await db.select().from(userSystemPreferences)
      .where(eq(userSystemPreferences.userId, userId));
    return prefs || undefined;
  }

  async createUserSystemPreferences(prefs: InsertUserSystemPreferences): Promise<UserSystemPreferences> {
    const [created] = await db.insert(userSystemPreferences).values(prefs).returning();
    return created;
  }

  async updateUserSystemPreferences(userId: string, data: Partial<UserSystemPreferences>): Promise<UserSystemPreferences | undefined> {
    const [updated] = await db.update(userSystemPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSystemPreferences.userId, userId))
      .returning();
    return updated || undefined;
  }

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(data).returning();
    return token;
  }

  async getPasswordResetToken(rawToken: string): Promise<PasswordResetToken | undefined> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const [result] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    return result || undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async createUserFeedback(data: InsertUserFeedback): Promise<UserFeedback> {
    const [feedback] = await db.insert(userFeedback).values(data).returning();
    return feedback;
  }

  async getImportedDocuments(userId: string): Promise<ImportedDocument[]> {
    return await db.select().from(importedDocuments)
      .where(eq(importedDocuments.userId, userId))
      .orderBy(desc(importedDocuments.createdAt));
  }

  async getImportedDocument(id: string): Promise<ImportedDocument | undefined> {
    const [doc] = await db.select().from(importedDocuments)
      .where(eq(importedDocuments.id, id));
    return doc || undefined;
  }

  async createImportedDocument(doc: InsertImportedDocument): Promise<ImportedDocument> {
    const [created] = await db.insert(importedDocuments).values(doc).returning();
    return created;
  }

  async updateImportedDocument(id: string, data: Partial<ImportedDocument>): Promise<ImportedDocument | undefined> {
    const [updated] = await db.update(importedDocuments)
      .set(data)
      .where(eq(importedDocuments.id, id))
      .returning();
    return updated || undefined;
  }

  async getImportedDocumentItems(documentId: string): Promise<ImportedDocumentItem[]> {
    return await db.select().from(importedDocumentItems)
      .where(eq(importedDocumentItems.documentId, documentId));
  }

  async createImportedDocumentItem(item: InsertImportedDocumentItem): Promise<ImportedDocumentItem> {
    const [created] = await db.insert(importedDocumentItems).values(item).returning();
    return created;
  }

  async createImportedDocumentItems(items: InsertImportedDocumentItem[]): Promise<ImportedDocumentItem[]> {
    if (items.length === 0) return [];
    return await db.insert(importedDocumentItems).values(items).returning();
  }

  async updateImportedDocumentItem(id: string, data: Partial<ImportedDocumentItem>): Promise<ImportedDocumentItem | undefined> {
    const [updated] = await db.update(importedDocumentItems)
      .set(data)
      .where(eq(importedDocumentItems.id, id))
      .returning();
    return updated || undefined;
  }

  async getMealPlans(userId: string): Promise<MealPlan[]> {
    return await db.select().from(mealPlans)
      .where(eq(mealPlans.userId, userId))
      .orderBy(desc(mealPlans.createdAt));
  }

  async getMealPlan(id: string): Promise<MealPlan | undefined> {
    const [plan] = await db.select().from(mealPlans)
      .where(eq(mealPlans.id, id));
    return plan || undefined;
  }

  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    const [created] = await db.insert(mealPlans).values(plan).returning();
    return created;
  }

  async updateMealPlan(id: string, data: Partial<MealPlan>): Promise<MealPlan | undefined> {
    const [updated] = await db.update(mealPlans)
      .set(data)
      .where(eq(mealPlans.id, id))
      .returning();
    return updated || undefined;
  }

  async deactivateOtherMealPlans(userId: string, exceptId: string): Promise<void> {
    await db.update(mealPlans)
      .set({ isActive: false })
      .where(and(
        eq(mealPlans.userId, userId),
        eq(mealPlans.isActive, true),
        ne(mealPlans.id, exceptId),
      ));
  }

  async deleteMealPlan(id: string): Promise<void> {
    await db.delete(meals).where(eq(meals.mealPlanId, id));
    await db.delete(mealPlans).where(eq(mealPlans.id, id));
  }

  async getMeals(userId: string, mealPlanId?: string): Promise<Meal[]> {
    if (mealPlanId) {
      return await db.select().from(meals)
        .where(and(eq(meals.userId, userId), eq(meals.mealPlanId, mealPlanId)));
    }
    return await db.select().from(meals)
      .where(eq(meals.userId, userId));
  }

  async getMeal(id: string): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals)
      .where(eq(meals.id, id));
    return meal || undefined;
  }

  async createMeal(meal: InsertMeal): Promise<Meal> {
    const [created] = await db.insert(meals).values(meal).returning();
    return created;
  }

  async createMeals(mealsData: InsertMeal[]): Promise<Meal[]> {
    if (mealsData.length === 0) return [];
    return await db.insert(meals).values(mealsData).returning();
  }

  async updateMeal(id: string, data: Partial<Meal>): Promise<Meal | undefined> {
    const [updated] = await db.update(meals)
      .set(data)
      .where(eq(meals.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMeal(id: string): Promise<void> {
    await db.delete(meals).where(eq(meals.id, id));
  }

  async getMealPrepPreferences(userId: string): Promise<MealPrepPreferences | undefined> {
    const [prefs] = await db.select().from(mealPrepPreferences).where(eq(mealPrepPreferences.userId, userId));
    return prefs || undefined;
  }

  async createMealPrepPreferences(prefs: InsertMealPrepPreferences): Promise<MealPrepPreferences> {
    const [created] = await db.insert(mealPrepPreferences).values(prefs).returning();
    return created;
  }

  async updateMealPrepPreferences(userId: string, data: Partial<MealPrepPreferences>): Promise<MealPrepPreferences | undefined> {
    const [updated] = await db.update(mealPrepPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mealPrepPreferences.userId, userId))
      .returning();
    return updated || undefined;
  }

  async getShoppingLists(userId: string): Promise<ShoppingList[]> {
    return await db.select().from(shoppingLists)
      .where(eq(shoppingLists.userId, userId))
      .orderBy(desc(shoppingLists.createdAt));
  }

  async getShoppingList(id: string): Promise<ShoppingList | undefined> {
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));
    return list || undefined;
  }

  async createShoppingList(list: InsertShoppingList): Promise<ShoppingList> {
    const [created] = await db.insert(shoppingLists).values(list).returning();
    return created;
  }

  async updateShoppingList(id: string, data: Partial<ShoppingList>): Promise<ShoppingList | undefined> {
    const [updated] = await db.update(shoppingLists).set(data).where(eq(shoppingLists.id, id)).returning();
    return updated || undefined;
  }

  async deleteShoppingList(id: string): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, id));
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  }

  async getShoppingListItems(listId: string): Promise<ShoppingListItem[]> {
    return await db.select().from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, listId))
      .orderBy(shoppingListItems.category);
  }

  async createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    const [created] = await db.insert(shoppingListItems).values(item).returning();
    return created;
  }

  async createShoppingListItems(items: InsertShoppingListItem[]): Promise<ShoppingListItem[]> {
    if (items.length === 0) return [];
    return await db.insert(shoppingListItems).values(items).returning();
  }

  async updateShoppingListItem(id: string, data: Partial<ShoppingListItem>): Promise<ShoppingListItem | undefined> {
    const [updated] = await db.update(shoppingListItems).set(data).where(eq(shoppingListItems.id, id)).returning();
    return updated || undefined;
  }

  async deleteShoppingListItem(id: string): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  }

  async getWeeklyFeedbackResponses(userId: string): Promise<WeeklyFeedbackResponse[]> {
    return await db.select().from(weeklyFeedbackResponses)
      .where(eq(weeklyFeedbackResponses.userId, userId))
      .orderBy(weeklyFeedbackResponses.weekNumber);
  }

  async getWeeklyFeedbackResponse(userId: string, weekNumber: number): Promise<WeeklyFeedbackResponse | undefined> {
    const [response] = await db.select().from(weeklyFeedbackResponses)
      .where(and(
        eq(weeklyFeedbackResponses.userId, userId),
        eq(weeklyFeedbackResponses.weekNumber, weekNumber)
      ));
    return response || undefined;
  }

  async saveWeeklyFeedbackResponse(data: InsertWeeklyFeedbackResponse): Promise<WeeklyFeedbackResponse> {
    const existing = data.userId 
      ? await this.getWeeklyFeedbackResponse(data.userId, data.weekNumber)
      : undefined;
    
    if (existing) {
      const [updated] = await db.update(weeklyFeedbackResponses)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(weeklyFeedbackResponses.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(weeklyFeedbackResponses).values(data).returning();
    return created;
  }

  async updateWeeklyFeedbackResponse(id: string, data: Partial<WeeklyFeedbackResponse>): Promise<WeeklyFeedbackResponse | undefined> {
    const [updated] = await db.update(weeklyFeedbackResponses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(weeklyFeedbackResponses.id, id))
      .returning();
    return updated || undefined;
  }

  async getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
    return await db.select().from(workoutPlans)
      .where(eq(workoutPlans.userId, userId))
      .orderBy(desc(workoutPlans.createdAt));
  }

  async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
    const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    return plan || undefined;
  }

  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const [created] = await db.insert(workoutPlans).values(plan).returning();
    return created;
  }

  async updateWorkoutPlan(id: string, data: Partial<WorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const [updated] = await db.update(workoutPlans).set(data).where(eq(workoutPlans.id, id)).returning();
    return updated || undefined;
  }

  async deleteWorkoutPlan(id: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.workoutPlanId, id));
    await db.delete(workoutPlans).where(eq(workoutPlans.id, id));
  }

  async getExercises(userId: string, workoutPlanId?: string): Promise<Exercise[]> {
    if (workoutPlanId) {
      return await db.select().from(exercises)
        .where(and(eq(exercises.userId, userId), eq(exercises.workoutPlanId, workoutPlanId)))
        .orderBy(exercises.dayLabel);
    }
    return await db.select().from(exercises)
      .where(eq(exercises.userId, userId))
      .orderBy(exercises.dayLabel);
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise || undefined;
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [created] = await db.insert(exercises).values(exercise).returning();
    return created;
  }

  async createExercises(exerciseList: InsertExercise[]): Promise<Exercise[]> {
    if (exerciseList.length === 0) return [];
    return await db.insert(exercises).values(exerciseList).returning();
  }

  async updateExercise(id: string, data: Partial<Exercise>): Promise<Exercise | undefined> {
    const [updated] = await db.update(exercises).set(data).where(eq(exercises.id, id)).returning();
    return updated || undefined;
  }

  async deleteExercise(id: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  async getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
    return await db.select().from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt));
  }

  async getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
    const [session] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id));
    return session || undefined;
  }

  async createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession> {
    const [created] = await db.insert(workoutSessions).values(session).returning();
    return created;
  }

  async updateWorkoutSession(id: string, data: Partial<WorkoutSession>): Promise<WorkoutSession | undefined> {
    const [updated] = await db.update(workoutSessions).set(data).where(eq(workoutSessions.id, id)).returning();
    return updated || undefined;
  }

  async deleteWorkoutSession(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(workoutSessionSteps).where(eq(workoutSessionSteps.sessionId, id));
      await tx.delete(workoutSessions).where(eq(workoutSessions.id, id));
    });
  }

  async getWorkoutSessionSteps(sessionId: string): Promise<WorkoutSessionStep[]> {
    return await db.select().from(workoutSessionSteps)
      .where(eq(workoutSessionSteps.sessionId, sessionId))
      .orderBy(workoutSessionSteps.stepIndex);
  }

  async upsertWorkoutSessionStep(step: InsertWorkoutSessionStep): Promise<WorkoutSessionStep> {
    const [result] = await db
      .insert(workoutSessionSteps)
      .values(step)
      .onConflictDoUpdate({
        target: [workoutSessionSteps.sessionId, workoutSessionSteps.stepIndex],
        set: { ...step, loggedAt: new Date() },
      })
      .returning();
    return result;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const [updated] = await db.update(conversations).set(data).where(eq(conversations.id, id)).returning();
    return updated || undefined;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getSyncSessions(userId: string): Promise<AiSyncSession[]> {
    return await db.select().from(aiSyncSessions)
      .where(eq(aiSyncSessions.userId, userId))
      .orderBy(desc(aiSyncSessions.startedAt));
  }

  async getActiveSyncSession(userId: string): Promise<AiSyncSession | undefined> {
    const [session] = await db.select().from(aiSyncSessions)
      .where(and(
        eq(aiSyncSessions.userId, userId),
        eq(aiSyncSessions.status, "processing")
      ))
      .orderBy(desc(aiSyncSessions.startedAt));
    return session || undefined;
  }

  async getSyncSession(id: string): Promise<AiSyncSession | undefined> {
    const [session] = await db.select().from(aiSyncSessions).where(eq(aiSyncSessions.id, id));
    return session || undefined;
  }

  async createSyncSession(session: InsertAiSyncSession): Promise<AiSyncSession> {
    const [created] = await db.insert(aiSyncSessions).values(session).returning();
    return created;
  }

  async updateSyncSession(id: string, data: Partial<AiSyncSession>): Promise<AiSyncSession | undefined> {
    const [updated] = await db.update(aiSyncSessions).set(data).where(eq(aiSyncSessions.id, id)).returning();
    return updated || undefined;
  }

  async getSyncItems(sessionId: string): Promise<AiSyncItem[]> {
    return await db.select().from(aiSyncItems)
      .where(eq(aiSyncItems.sessionId, sessionId))
      .orderBy(aiSyncItems.createdAt);
  }

  async getSyncItemsByGroup(sessionId: string, groupKey: string): Promise<AiSyncItem[]> {
    return await db.select().from(aiSyncItems)
      .where(and(
        eq(aiSyncItems.sessionId, sessionId),
        eq(aiSyncItems.recurrenceGroupKey, groupKey)
      ));
  }

  async createSyncItem(item: InsertAiSyncItem): Promise<AiSyncItem> {
    const [created] = await db.insert(aiSyncItems).values(item).returning();
    return created;
  }

  async createSyncItems(items: InsertAiSyncItem[]): Promise<AiSyncItem[]> {
    if (items.length === 0) return [];
    return await db.insert(aiSyncItems).values(items).returning();
  }

  async updateSyncItem(id: string, data: Partial<AiSyncItem>): Promise<AiSyncItem | undefined> {
    const [updated] = await db.update(aiSyncItems).set(data).where(eq(aiSyncItems.id, id)).returning();
    return updated || undefined;
  }

  async updateSyncItemsByGroup(sessionId: string, groupKey: string, data: Partial<AiSyncItem>): Promise<void> {
    await db.update(aiSyncItems)
      .set(data)
      .where(and(
        eq(aiSyncItems.sessionId, sessionId),
        eq(aiSyncItems.recurrenceGroupKey, groupKey)
      ));
  }

  async createInteractionEvent(event: InsertInteractionEvent): Promise<InteractionEvent> {
    const [created] = await db.insert(interactionEvents).values(event).returning();
    return created;
  }

  async getRecentInteractionEvents(userId: string, limit: number = 100): Promise<InteractionEvent[]> {
    return await db.select().from(interactionEvents)
      .where(eq(interactionEvents.userId, userId))
      .orderBy(desc(interactionEvents.createdAt))
      .limit(limit);
  }

  async getPatternSnapshots(userId: string, dimension?: string): Promise<AiPatternSnapshot[]> {
    if (dimension) {
      return await db.select().from(aiPatternSnapshots)
        .where(and(
          eq(aiPatternSnapshots.userId, userId),
          eq(aiPatternSnapshots.dimension, dimension)
        ))
        .orderBy(desc(aiPatternSnapshots.lastUpdated));
    }
    return await db.select().from(aiPatternSnapshots)
      .where(eq(aiPatternSnapshots.userId, userId))
      .orderBy(desc(aiPatternSnapshots.lastUpdated));
  }

  async createPatternSnapshot(snapshot: InsertAiPatternSnapshot): Promise<AiPatternSnapshot> {
    const [created] = await db.insert(aiPatternSnapshots).values(snapshot).returning();
    return created;
  }

  async updatePatternSnapshot(id: string, data: Partial<AiPatternSnapshot>): Promise<AiPatternSnapshot | undefined> {
    const [updated] = await db.update(aiPatternSnapshots)
      .set({ ...data, lastUpdated: new Date() })
      .where(eq(aiPatternSnapshots.id, id))
      .returning();
    return updated || undefined;
  }

  async getAggregatedInteractionData(userId: string): Promise<{
    pageVisits: { page: string; count: number; avgDuration: number }[];
    featureUsage: { feature: string; count: number; recentCount: number }[];
    timePatterns: { hourOfDay: number; dayOfWeek: number; count: number }[];
    totalDays: number;
  }> {
    const events = await this.getRecentInteractionEvents(userId, 500);
    
    if (events.length === 0) {
      return { pageVisits: [], featureUsage: [], timePatterns: [], totalDays: 0 };
    }
    
    const pageMap = new Map<string, { count: number; totalDuration: number }>();
    const featureMap = new Map<string, { count: number; recentCount: number }>();
    const timeMap = new Map<string, number>();
    const uniqueDays = new Set<string>();
    
    const now = Date.now();
    const recentThreshold = 7 * 24 * 60 * 60 * 1000;
    
    for (const event of events) {
      const eventDate = event.createdAt ? new Date(event.createdAt) : new Date();
      const dateKey = eventDate.toISOString().split('T')[0];
      uniqueDays.add(dateKey);
      
      const isRecent = (now - eventDate.getTime()) < recentThreshold;
      
      if (event.eventType === 'page_view' && event.pagePath) {
        const current = pageMap.get(event.pagePath) || { count: 0, totalDuration: 0 };
        current.count++;
        current.totalDuration += event.durationMs || 0;
        pageMap.set(event.pagePath, current);
      }
      
      const featureKey = event.actionTarget || event.actionValue;
      if ((event.eventType === 'feature_use' || event.eventType === 'click') && featureKey) {
        const current = featureMap.get(featureKey) || { count: 0, recentCount: 0 };
        current.count++;
        if (isRecent) current.recentCount++;
        featureMap.set(featureKey, current);
      }
      
      const hourOfDay = eventDate.getHours();
      const dayOfWeek = eventDate.getDay();
      const timeKey = `${dayOfWeek}-${hourOfDay}`;
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1);
    }
    
    const pageVisits = Array.from(pageMap.entries()).map(([page, data]) => ({
      page,
      count: data.count,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0
    }));
    
    const featureUsage = Array.from(featureMap.entries()).map(([feature, data]) => ({
      feature,
      count: data.count,
      recentCount: data.recentCount
    }));
    
    const timePatterns = Array.from(timeMap.entries()).map(([key, count]) => {
      const [dayOfWeek, hourOfDay] = key.split('-').map(Number);
      return { dayOfWeek, hourOfDay, count };
    });
    
    return {
      pageVisits,
      featureUsage,
      timePatterns,
      totalDays: uniqueDays.size
    };
  }

  async getBirthChart(userId: string): Promise<BirthChart | undefined> {
    const [chart] = await db.select().from(birthCharts).where(eq(birthCharts.userId, userId));
    return chart || undefined;
  }

  async createBirthChart(chart: InsertBirthChart): Promise<BirthChart> {
    const [created] = await db.insert(birthCharts).values(chart).returning();
    return created;
  }

  async updateBirthChart(userId: string, data: Partial<BirthChart>): Promise<BirthChart | undefined> {
    const [updated] = await db.update(birthCharts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(birthCharts.userId, userId))
      .returning();
    return updated || undefined;
  }

  // Wearable Devices
  async getWearableDevices(userId: string): Promise<WearableDevice[]> {
    return db.select().from(wearableDevices).where(eq(wearableDevices.userId, userId));
  }

  async createWearableDevice(device: InsertWearableDevice): Promise<WearableDevice> {
    const [created] = await db.insert(wearableDevices).values(device).returning();
    return created;
  }

  async updateWearableDevice(id: string, data: Partial<WearableDevice>): Promise<WearableDevice | undefined> {
    const [updated] = await db.update(wearableDevices)
      .set(data)
      .where(eq(wearableDevices.id, id))
      .returning();
    return updated || undefined;
  }

  // Wearable Data
  async getWearableData(userId: string, limit: number = 100): Promise<WearableData[]> {
    return db.select()
      .from(wearableData)
      .where(eq(wearableData.userId, userId))
      .orderBy(desc(wearableData.timestamp))
      .limit(limit);
  }

  async getLatestWearableData(userId: string): Promise<WearableData | undefined> {
    const [latest] = await db.select()
      .from(wearableData)
      .where(eq(wearableData.userId, userId))
      .orderBy(desc(wearableData.timestamp))
      .limit(1);
    return latest || undefined;
  }

  async createWearableData(data: InsertWearableData): Promise<WearableData> {
    const [created] = await db.insert(wearableData).values(data).returning();
    return created;
  }

  async updateWearableData(id: string, data: Partial<WearableData>): Promise<WearableData | undefined> {
    const [updated] = await db.update(wearableData)
      .set(data)
      .where(eq(wearableData.id, id))
      .returning();
    return updated || undefined;
  }

  // Astrology Predictions
  async getAstrologyPredictions(userId: string, startDate: Date, endDate: Date): Promise<AstrologyPrediction[]> {
    return db.select()
      .from(astrologyPredictions)
      .where(
        and(
          eq(astrologyPredictions.userId, userId),
          gte(astrologyPredictions.date, startDate),
          lte(astrologyPredictions.date, endDate)
        )
      )
      .orderBy(astrologyPredictions.date);
  }

  async createAstrologyPrediction(prediction: InsertAstrologyPrediction): Promise<AstrologyPrediction> {
    const [created] = await db.insert(astrologyPredictions).values(prediction).returning();
    return created;
  }

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allUsers = await db.select().from(users);
    const allMoodLogs = await db.select().from(moodLogs);
    const allCheckIns = await db.select().from(checkIns);

    const dauUsers = new Set(allMoodLogs.filter(m => m.createdAt && m.createdAt >= dayAgo).map(m => m.userId));
    const wauUsers = new Set(allMoodLogs.filter(m => m.createdAt && m.createdAt >= weekAgo).map(m => m.userId));
    const mauUsers = new Set(allMoodLogs.filter(m => m.createdAt && m.createdAt >= monthAgo).map(m => m.userId));

    const recentUsers = allUsers.filter(u => u.createdAt && u.createdAt >= weekAgo);
    const completedOnboarding = recentUsers.filter(u => u.onboardingCompleted);
    const activationRate = recentUsers.length > 0 ? (completedOnboarding.length / recentUsers.length) * 100 : 0;

    const helpedCheckIns = allCheckIns.filter(c => {
      const msgs = c.messages as any;
      return msgs?.helped === 'yes' || msgs?.helped === 'some';
    });
    const helpedRate = allCheckIns.length > 0 ? (helpedCheckIns.length / allCheckIns.length) * 100 : 0;

    return {
      dau: dauUsers.size,
      wau: wauUsers.size,
      mau: mauUsers.size,
      activationRate7d: Math.round(activationRate * 10) / 10,
      d7MeaningfulRetention: 0,
      helpedPositiveRate: Math.round(helpedRate * 10) / 10,
      funnel: {
        onboardingStarted: allUsers.length,
        onboardingCompleted: allUsers.filter(u => u.onboardingCompleted).length,
        planGenerated: 0,
        planSaved: 0,
        planItemCompleted: 0,
        checkInSubmitted: allCheckIns.length,
      },
      switchPerformance: [],
      errors: {
        errorsPerSession: 0,
        topErrorCodes: [],
      },
    };
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const recentMoodLogs = await db.select().from(moodLogs)
      .where(and(eq(moodLogs.userId, userId), gte(moodLogs.createdAt, twoWeeksAgo)));
    
    const recentCheckIns = await db.select().from(checkIns)
      .where(and(eq(checkIns.userId, userId), gte(checkIns.createdAt, twoWeeksAgo)));

    const uniqueDays = new Set(recentMoodLogs.map(m => m.createdAt?.toDateString()));

    const latestMood = recentMoodLogs.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )[0];

    let energy = 'medium';
    let stress = 'medium';
    if (latestMood) {
      const moodValue = latestMood.moodLevel || 3;
      energy = moodValue >= 4 ? 'high' : moodValue >= 2 ? 'medium' : 'low';
      stress = moodValue <= 2 ? 'high' : moodValue <= 3 ? 'medium' : 'low';
    }

    const helpedCounts = { yes: 0, some: 0, no: 0 };
    recentCheckIns.forEach(c => {
      const msgs = c.messages as any;
      if (msgs?.helped === 'yes') helpedCounts.yes++;
      else if (msgs?.helped === 'some') helpedCounts.some++;
      else if (msgs?.helped === 'no') helpedCounts.no++;
    });

    return {
      systemSnapshot: {
        energy,
        stress,
        consistencyDays: uniqueDays.size,
      },
      switches: [],
      weeklyWins: {
        completedActions: recentCheckIns.length,
        bestDay: null,
        helped: helpedCounts.yes,
        somewhat: helpedCounts.some,
        didntHelp: helpedCounts.no,
      },
      patterns: [],
    };
  }

  async getAdminMetricsSummary(range: string): Promise<AdminMetricsSummary> {
    const now = new Date();
    const days = range === '30d' ? 30 : range === '14d' ? 14 : 7;
    const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allUsers = await db.select().from(users);
    const allMoodLogs = await db.select().from(moodLogs);
    const allCheckIns = await db.select().from(checkIns);

    const dauUsers = new Set(allMoodLogs.filter(m => m.createdAt && m.createdAt >= dayAgo).map(m => m.userId));
    const wauUsers = new Set(allMoodLogs.filter(m => m.createdAt && m.createdAt >= weekAgo).map(m => m.userId));
    const mauUsers = new Set(allMoodLogs.filter(m => m.createdAt && m.createdAt >= monthAgo).map(m => m.userId));

    const recentUsers = allUsers.filter(u => u.createdAt && u.createdAt >= weekAgo);
    const completedOnboarding = recentUsers.filter(u => u.onboardingCompleted);
    const activationRate = recentUsers.length > 0 ? completedOnboarding.length / recentUsers.length : 0;

    const helpedCheckIns = allCheckIns.filter(c => {
      const msgs = c.messages as any;
      return msgs?.helped === 'yes' || msgs?.helped === 'some';
    });
    const helpedRate = allCheckIns.length > 0 ? helpedCheckIns.length / allCheckIns.length : 0;

    return {
      dau: dauUsers.size,
      wau: wauUsers.size,
      mau: mauUsers.size,
      activationRate7d: activationRate,
      d1Retention: 0,
      d7Retention: 0,
      d7MeaningfulRetention: 0,
      helpedPositiveRate: helpedRate,
      avgCompletionsPerActiveUser: 0,
      swapRate: 0,
      errorsPerSession: 0,
      sessions: 0,
      planGenerated: 0,
      planSaved: 0,
      planItemCompleted: 0,
      postActionCheckins: allCheckIns.length,
      recommendationsViewed: 0,
      recommendationsSwapped: 0,
      errors: 0,
    };
  }

  async getAdminMetricsFunnel(range: string): Promise<AdminMetricsFunnel> {
    const allUsers = await db.select().from(users);
    const allCheckIns = await db.select().from(checkIns);

    return {
      onboardingStarted: allUsers.length,
      onboardingCompleted: allUsers.filter(u => u.onboardingCompleted).length,
      planGenerated: 0,
      planSaved: 0,
      planItemCompleted: 0,
      postActionCheckin: allCheckIns.length,
    };
  }

  async getAdminMetricsSwitches(range: string): Promise<Record<string, AdminSwitchData>> {
    const switchIds = ["body", "mind", "time", "purpose", "money", "relationships", "environment", "identity"];
    const result: Record<string, AdminSwitchData> = {};
    
    for (const switchId of switchIds) {
      result[switchId] = {
        detailViews: 0,
        plansGenerated: 0,
        plansSaved: 0,
        itemsCompleted: 0,
        helpedYes: 0,
        helpedSome: 0,
        helpedNo: 0,
        helpedTotal: 0,
      };
    }
    
    return result;
  }

  async getAdminMetricsRecommendations(range: string): Promise<AdminRecommendationsData> {
    return {
      viewed: 0,
      swapped: 0,
      accepted: 0,
      completedWithin24h: 0,
      byReason: [],
      bySwitch: [],
    };
  }

  async getAdminMetricsTimeband(range: string): Promise<AdminTimebandData> {
    return {
      distribution: { tiny: 0, small: 0, medium: 0, large: 0 },
      modeDistribution: { restoring: 0, training: 0, maintaining: 0 },
      helpedByTimeBand: [],
      helpedByMode: [],
      completionByTimeBand: [],
    };
  }

  async getAdminMetricsFlags(range: string): Promise<AdminFlagsData> {
    return {
      topFlags: [],
      flagToOutcome: [],
    };
  }

  async getAdminMetricsErrors(range: string): Promise<AdminErrorsData> {
    return {
      errorsPerSession: 0,
      topErrorCodes: [],
      topScreens: [],
    };
  }

  async getUserProgressSummary(userId: string, range: string): Promise<UserProgressSummary> {
    const days = range === '14d' ? 14 : 7;
    const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const recentMoodLogs = await db.select().from(moodLogs)
      .where(and(eq(moodLogs.userId, userId), gte(moodLogs.createdAt, rangeStart)));
    
    const recentCheckIns = await db.select().from(checkIns)
      .where(and(eq(checkIns.userId, userId), gte(checkIns.createdAt, rangeStart)));

    const uniqueDays = new Set(recentMoodLogs.map(m => m.createdAt?.toDateString()));

    const latestMood = recentMoodLogs.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )[0];

    let energyLevel = 'medium';
    let stressLevel = 'medium';
    if (latestMood) {
      const moodValue = latestMood.moodLevel || 3;
      energyLevel = moodValue >= 4 ? 'high' : moodValue >= 2 ? 'medium' : 'low';
      stressLevel = moodValue <= 2 ? 'high' : moodValue <= 3 ? 'medium' : 'low';
    }

    const helpedCounts = { yes: 0, some: 0, no: 0 };
    recentCheckIns.forEach(c => {
      const msgs = c.messages as any;
      if (msgs?.helped === 'yes') helpedCounts.yes++;
      else if (msgs?.helped === 'some') helpedCounts.some++;
      else if (msgs?.helped === 'no') helpedCounts.no++;
    });

    return {
      energyLevel,
      stressLevel,
      timeBand: 'small',
      consistencyDays: uniqueDays.size,
      actionsCompleted: recentCheckIns.length,
      bestDay: null,
      helpedYes: helpedCounts.yes,
      helpedSome: helpedCounts.some,
      helpedNo: helpedCounts.no,
    };
  }

  async getUserProgressSwitches(userId: string, range: string): Promise<UserSwitchProgress[]> {
    const switchIds = ["body", "mind", "time", "purpose", "money", "relationships", "environment", "identity"];
    
    return switchIds.map(switchId => ({
      switchId,
      status: 'off',
      lastTrainedAt: null,
      completedCount: 0,
    }));
  }

  async getUserProgressPatterns(userId: string, range: string): Promise<{ flagKey: string; count: number }[]> {
    return [];
  }

  async getUserRecommendationToday(userId: string): Promise<UserRecommendation> {
    const switchOptions = ["body", "mind", "time", "purpose", "money", "relationships", "environment", "identity"];
    const randomIndex = Math.floor(Math.random() * switchOptions.length);
    const altIndex = (randomIndex + 1) % switchOptions.length;
    
    const switchTitles: Record<string, string> = {
      body: "Body Switch",
      mind: "Mind Switch",
      time: "Time Switch",
      purpose: "Purpose Switch",
      money: "Money Switch",
      relationships: "Relationships Switch",
      environment: "Environment Switch",
      identity: "Identity Switch",
    };
    
    const reasons: Record<string, string> = {
      body: "Movement shifts your state faster than thinking.",
      mind: "A few minutes of stillness can reset your whole day.",
      time: "Structure reduces overwhelm fast.",
      purpose: "Reconnecting with meaning brings clarity.",
      money: "Small financial wins build confidence.",
      relationships: "Connection is restorative when intentional.",
      environment: "Your space shapes your state.",
      identity: "Remembering who you are grounds everything.",
    };
    
    const selectedSwitch = switchOptions[randomIndex];
    
    return {
      switchId: selectedSwitch,
      alternativeId: switchOptions[altIndex],
      timeBand: 'tiny',
      mode: 'training',
      title: `${switchTitles[selectedSwitch]} (10 min)`,
      reason: reasons[selectedSwitch],
    };
  }

  // ========================================
  // DW.AI PHASE 1 - NEW TABLE IMPLEMENTATIONS
  // ========================================

  // Dimension Blueprints
  async getDimensionBlueprints(userId: string, dimension?: string): Promise<DimensionBlueprint[]> {
    let query = db.select().from(dimensionBlueprints).where(eq(dimensionBlueprints.userId, userId));
    
    if (dimension) {
      query = db.select().from(dimensionBlueprints)
        .where(and(
          eq(dimensionBlueprints.userId, userId),
          eq(dimensionBlueprints.dimension, dimension)
        ));
    }
    
    return await query;
  }

  async getDimensionBlueprint(id: string): Promise<DimensionBlueprint | undefined> {
    const [blueprint] = await db.select().from(dimensionBlueprints).where(eq(dimensionBlueprints.id, id));
    return blueprint || undefined;
  }

  async createDimensionBlueprint(blueprint: InsertDimensionBlueprint): Promise<DimensionBlueprint> {
    const [newBlueprint] = await db.insert(dimensionBlueprints).values(blueprint).returning();
    return newBlueprint;
  }

  async updateDimensionBlueprint(id: string, data: Partial<DimensionBlueprint>): Promise<DimensionBlueprint | undefined> {
    const [updated] = await db.update(dimensionBlueprints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dimensionBlueprints.id, id))
      .returning();
    return updated || undefined;
  }

  // Reset Protocol
  async getResetProtocol(userId: string): Promise<ResetProtocol | undefined> {
    const [protocol] = await db.select().from(resetProtocol).where(eq(resetProtocol.userId, userId));
    return protocol || undefined;
  }

  async getResetProtocolById(id: string): Promise<ResetProtocol | undefined> {
    const [protocol] = await db.select().from(resetProtocol).where(eq(resetProtocol.id, id));
    return protocol || undefined;
  }

  async createResetProtocol(protocol: InsertResetProtocol): Promise<ResetProtocol> {
    const [newProtocol] = await db.insert(resetProtocol).values(protocol).returning();
    return newProtocol;
  }

  async updateResetProtocol(id: string, data: Partial<ResetProtocol>): Promise<ResetProtocol | undefined> {
    const [updated] = await db.update(resetProtocol)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(resetProtocol.id, id))
      .returning();
    return updated || undefined;
  }

  // User Patterns
  async getUserPatterns(userId: string, isActive?: boolean): Promise<UserPattern[]> {
    let query = db.select().from(userPatterns).where(eq(userPatterns.userId, userId));
    
    if (isActive !== undefined) {
      query = db.select().from(userPatterns)
        .where(and(
          eq(userPatterns.userId, userId),
          eq(userPatterns.isActive, isActive)
        ));
    }
    
    return await query.orderBy(desc(userPatterns.lastOccurrence));
  }

  async getUserPattern(id: string): Promise<UserPattern | undefined> {
    const [pattern] = await db.select().from(userPatterns).where(eq(userPatterns.id, id));
    return pattern || undefined;
  }

  async createUserPattern(pattern: InsertUserPattern): Promise<UserPattern> {
    const [newPattern] = await db.insert(userPatterns).values(pattern).returning();
    return newPattern;
  }

  async updateUserPattern(id: string, data: Partial<UserPattern>): Promise<UserPattern | undefined> {
    const [updated] = await db.update(userPatterns)
      .set(data)
      .where(eq(userPatterns.id, id))
      .returning();
    return updated || undefined;
  }

  // Tracking Logs
  async getTrackingLogs(userId: string, trackingType?: string, limit: number = 100): Promise<TrackingLog[]> {
    let query = db.select().from(trackingLogs).where(eq(trackingLogs.userId, userId));
    
    if (trackingType) {
      query = db.select().from(trackingLogs)
        .where(and(
          eq(trackingLogs.userId, userId),
          eq(trackingLogs.trackingType, trackingType)
        ));
    }
    
    return await query.orderBy(desc(trackingLogs.loggedAt)).limit(limit);
  }

  async createTrackingLog(log: InsertTrackingLog): Promise<TrackingLog> {
    const [newLog] = await db.insert(trackingLogs).values(log).returning();
    return newLog;
  }

  // Meal Logs
  async getMealLogs(userId: string, limit: number = 100): Promise<MealLog[]> {
    return await db.select().from(mealLogs)
      .where(eq(mealLogs.userId, userId))
      .orderBy(desc(mealLogs.loggedAt))
      .limit(limit);
  }

  async createMealLog(log: InsertMealLog): Promise<MealLog> {
    const [newLog] = await db.insert(mealLogs).values(log).returning();
    return newLog;
  }

  // Water Logs
  async getWaterLogs(userId: string, limit: number = 100): Promise<WaterLog[]> {
    return await db.select().from(waterLogs)
      .where(eq(waterLogs.userId, userId))
      .orderBy(desc(waterLogs.loggedAt))
      .limit(limit);
  }

  async createWaterLog(log: InsertWaterLog): Promise<WaterLog> {
    const [newLog] = await db.insert(waterLogs).values(log).returning();
    return newLog;
  }

  // Universal Plans
  async getUniversalPlans(userId: string, planType?: string): Promise<UniversalPlan[]> {
    let query = db.select().from(universalPlans).where(eq(universalPlans.userId, userId));
    
    if (planType) {
      query = db.select().from(universalPlans)
        .where(and(
          eq(universalPlans.userId, userId),
          eq(universalPlans.planType, planType)
        ));
    }
    
    return await query.orderBy(desc(universalPlans.createdAt));
  }

  async getUniversalPlan(id: string): Promise<UniversalPlan | undefined> {
    const [plan] = await db.select().from(universalPlans).where(eq(universalPlans.id, id));
    return plan || undefined;
  }

  async createUniversalPlan(plan: InsertUniversalPlan): Promise<UniversalPlan> {
    const [newPlan] = await db.insert(universalPlans).values(plan).returning();
    return newPlan;
  }

  async updateUniversalPlan(id: string, data: Partial<UniversalPlan>): Promise<UniversalPlan | undefined> {
    const [updated] = await db.update(universalPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(universalPlans.id, id))
      .returning();
    return updated || undefined;
  }

  // Completion Status
  async getCompletionStatus(userId: string): Promise<CompletionStatus | undefined> {
    const [status] = await db.select().from(completionStatus).where(eq(completionStatus.userId, userId));
    return status || undefined;
  }

  async createCompletionStatus(status: InsertCompletionStatus): Promise<CompletionStatus> {
    const [newStatus] = await db.insert(completionStatus).values(status).returning();
    return newStatus;
  }

  async updateCompletionStatus(userId: string, data: Partial<CompletionStatus>): Promise<CompletionStatus | undefined> {
    const [status] = await db.select().from(completionStatus).where(eq(completionStatus.userId, userId));
    
    if (!status) {
      return undefined;
    }
    
    const [updated] = await db.update(completionStatus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(completionStatus.userId, userId))
      .returning();
    return updated || undefined;
  }

  // Achievements
  async getAchievements(userId: string): Promise<Achievement[]> {
    return db.select().from(achievements).where(eq(achievements.userId, userId));
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db.insert(achievements).values(achievement).returning();
    return newAchievement;
  }

  // Streaks
  async getStreaks(userId: string, streakType?: string): Promise<Streak[]> {
    const conditions = [eq(streaks.userId, userId)];
    
    if (streakType) {
      conditions.push(eq(streaks.streakType, streakType));
    }
    
    return db.select().from(streaks).where(and(...conditions));
  }

  async getStreak(id: string): Promise<Streak | undefined> {
    const [streak] = await db.select().from(streaks).where(eq(streaks.id, id));
    return streak || undefined;
  }

  async createStreak(streak: InsertStreak): Promise<Streak> {
    const [newStreak] = await db.insert(streaks).values(streak).returning();
    return newStreak;
  }

  async updateStreak(id: string, data: Partial<Streak>): Promise<Streak | undefined> {
    const [updated] = await db.update(streaks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(streaks.id, id))
      .returning();
    return updated || undefined;
  }

  // ========================================
  // PR #3: NEW STORAGE METHODS
  // ========================================

  // Life Dimension Assessments
  async getLifeDimensionAssessments(userId: string, dimension?: string): Promise<LifeDimensionAssessment[]> {
    const conditions = [eq(lifeDimensionAssessments.userId, userId)];
    if (dimension) {
      conditions.push(eq(lifeDimensionAssessments.dimension, dimension));
    }
    return db.select()
      .from(lifeDimensionAssessments)
      .where(and(...conditions))
      .orderBy(desc(lifeDimensionAssessments.assessedAt));
  }

  async getLatestDimensionAssessment(userId: string, dimension: string): Promise<LifeDimensionAssessment | undefined> {
    const [assessment] = await db.select()
      .from(lifeDimensionAssessments)
      .where(and(
        eq(lifeDimensionAssessments.userId, userId),
        eq(lifeDimensionAssessments.dimension, dimension)
      ))
      .orderBy(desc(lifeDimensionAssessments.assessedAt))
      .limit(1);
    return assessment || undefined;
  }

  async createLifeDimensionAssessment(assessment: InsertLifeDimensionAssessment): Promise<LifeDimensionAssessment> {
    const [newAssessment] = await db.insert(lifeDimensionAssessments).values(assessment).returning();
    return newAssessment;
  }

  // Dimension Systems
  async getDimensionSystems(userId: string, dimension?: string): Promise<DimensionSystem[]> {
    const conditions = [eq(dimensionSystems.userId, userId), eq(dimensionSystems.isActive, true)];
    if (dimension) {
      conditions.push(eq(dimensionSystems.dimension, dimension));
    }
    return db.select().from(dimensionSystems).where(and(...conditions));
  }

  async getDimensionSystem(id: string): Promise<DimensionSystem | undefined> {
    const [system] = await db.select().from(dimensionSystems).where(eq(dimensionSystems.id, id));
    return system || undefined;
  }

  async createDimensionSystem(system: InsertDimensionSystem): Promise<DimensionSystem> {
    const [newSystem] = await db.insert(dimensionSystems).values(system).returning();
    return newSystem;
  }

  async updateDimensionSystem(id: string, userId: string, data: Partial<DimensionSystem>): Promise<DimensionSystem | undefined> {
    const [updated] = await db.update(dimensionSystems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(dimensionSystems.id, id), eq(dimensionSystems.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteDimensionSystem(id: string, userId: string): Promise<void> {
    await db.update(dimensionSystems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(dimensionSystems.id, id), eq(dimensionSystems.userId, userId)));
  }

  // Wellness Preferences
  async getWellnessPreferences(userId: string): Promise<WellnessPreferences | undefined> {
    const [prefs] = await db.select().from(wellnessPreferences).where(eq(wellnessPreferences.userId, userId));
    return prefs || undefined;
  }

  async createWellnessPreferences(prefs: InsertWellnessPreferences): Promise<WellnessPreferences> {
    const [newPrefs] = await db.insert(wellnessPreferences).values(prefs).returning();
    return newPrefs;
  }

  async updateWellnessPreferences(id: string, userId: string, data: Partial<WellnessPreferences>): Promise<WellnessPreferences | undefined> {
    const [updated] = await db.update(wellnessPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(wellnessPreferences.id, id), eq(wellnessPreferences.userId, userId)))
      .returning();
    return updated || undefined;
  }

  // User Values & Rules
  async getUserValuesRules(userId: string): Promise<UserValuesRules | undefined> {
    const [record] = await db.select().from(userValuesRules).where(eq(userValuesRules.userId, userId));
    return record || undefined;
  }

  async createUserValuesRules(data: InsertUserValuesRules): Promise<UserValuesRules> {
    const [record] = await db.insert(userValuesRules).values(data).returning();
    return record;
  }

  async updateUserValuesRules(id: string, userId: string, data: Partial<UserValuesRules>): Promise<UserValuesRules | undefined> {
    const [updated] = await db.update(userValuesRules)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(userValuesRules.id, id), eq(userValuesRules.userId, userId)))
      .returning();
    return updated || undefined;
  }

  // Feature Settings
  async getFeatureSettings(userId: string): Promise<FeatureSettings | undefined> {
    const [settings] = await db.select().from(featureSettings).where(eq(featureSettings.userId, userId));
    return settings || undefined;
  }

  async createFeatureSettings(settings: InsertFeatureSettings): Promise<FeatureSettings> {
    const [newSettings] = await db.insert(featureSettings).values(settings).returning();
    return newSettings;
  }

  async updateFeatureSettings(id: string, userId: string, data: Partial<FeatureSettings>): Promise<FeatureSettings | undefined> {
    const [updated] = await db.update(featureSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(featureSettings.id, id), eq(featureSettings.userId, userId)))
      .returning();
    return updated || undefined;
  }

  // Household Cleaning Tasks
  async getHouseholdCleaningTasks(userId: string): Promise<HouseholdCleaningTask[]> {
    return db.select().from(householdCleaningTasks).where(eq(householdCleaningTasks.userId, userId));
  }

  async createHouseholdCleaningTask(task: InsertHouseholdCleaningTask): Promise<HouseholdCleaningTask> {
    const [newTask] = await db.insert(householdCleaningTasks).values(task).returning();
    return newTask;
  }

  async updateHouseholdCleaningTask(id: string, userId: string, data: Partial<HouseholdCleaningTask>): Promise<HouseholdCleaningTask | undefined> {
    const [updated] = await db.update(householdCleaningTasks)
      .set(data)
      .where(and(eq(householdCleaningTasks.id, id), eq(householdCleaningTasks.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteHouseholdCleaningTask(id: string, userId: string): Promise<void> {
    await db.delete(householdCleaningTasks)
      .where(and(eq(householdCleaningTasks.id, id), eq(householdCleaningTasks.userId, userId)));
  }

  // Household Laundry Schedule
  async getHouseholdLaundrySchedule(userId: string): Promise<HouseholdLaundrySchedule[]> {
    return db.select().from(householdLaundrySchedule).where(eq(householdLaundrySchedule.userId, userId));
  }

  async createHouseholdLaundrySchedule(schedule: InsertHouseholdLaundrySchedule): Promise<HouseholdLaundrySchedule> {
    const [newSchedule] = await db.insert(householdLaundrySchedule).values(schedule).returning();
    return newSchedule;
  }

  async updateHouseholdLaundrySchedule(id: string, userId: string, data: Partial<HouseholdLaundrySchedule>): Promise<HouseholdLaundrySchedule | undefined> {
    const [updated] = await db.update(householdLaundrySchedule)
      .set(data)
      .where(and(eq(householdLaundrySchedule.id, id), eq(householdLaundrySchedule.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteHouseholdLaundrySchedule(id: string, userId: string): Promise<void> {
    await db.delete(householdLaundrySchedule)
      .where(and(eq(householdLaundrySchedule.id, id), eq(householdLaundrySchedule.userId, userId)));
  }

  // AI Feature Usage
  async getAiFeatureUsage(userId: string): Promise<AiFeatureUsage[]> {
    return db.select()
      .from(aiFeatureUsage)
      .where(eq(aiFeatureUsage.userId, userId))
      .orderBy(desc(aiFeatureUsage.lastUsedAt));
  }

  async trackFeatureUsage(userId: string, featureName: string, timeSpentSeconds: number = 0): Promise<void> {
    // Use atomic INSERT ... ON CONFLICT to avoid race conditions
    await db.insert(aiFeatureUsage)
      .values({
        userId,
        featureName,
        usageCount: 1,
        totalTimeSpentSeconds: timeSpentSeconds,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [aiFeatureUsage.userId, aiFeatureUsage.featureName],
        set: {
          usageCount: sql`${aiFeatureUsage.usageCount} + 1`,
          totalTimeSpentSeconds: sql`${aiFeatureUsage.totalTimeSpentSeconds} + ${timeSpentSeconds}`,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  async getMostUsedFeatures(userId: string, limit: number = 4): Promise<AiFeatureUsage[]> {
    return db.select()
      .from(aiFeatureUsage)
      .where(eq(aiFeatureUsage.userId, userId))
      .orderBy(desc(aiFeatureUsage.usageCount))
      .limit(limit);
  }

  // AI Suggestions
  async getAiSuggestions(userId: string, status?: string): Promise<AiSuggestion[]> {
    const conditions = [eq(aiSuggestions.userId, userId)];
    if (status) {
      conditions.push(eq(aiSuggestions.status, status));
    }
    return db.select()
      .from(aiSuggestions)
      .where(and(...conditions))
      .orderBy(desc(aiSuggestions.createdAt));
  }

  async createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const [newSuggestion] = await db.insert(aiSuggestions).values(suggestion).returning();
    return newSuggestion;
  }

  async updateAiSuggestion(id: string, userId: string, data: Partial<AiSuggestion>): Promise<AiSuggestion | undefined> {
    const [updated] = await db.update(aiSuggestions)
      .set(data)
      .where(and(eq(aiSuggestions.id, id), eq(aiSuggestions.userId, userId)))
      .returning();
    return updated || undefined;
  }

  // Conversation Insights
  async getConversationInsights(userId: string, limit = 50, offset = 0): Promise<ConversationInsight[]> {
    return db.select()
      .from(conversationInsights)
      .where(and(eq(conversationInsights.userId, userId), eq(conversationInsights.hidden, false)))
      .orderBy(desc(conversationInsights.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createConversationInsight(insight: InsertConversationInsight): Promise<ConversationInsight> {
    const [created] = await db.insert(conversationInsights)
      .values({ ...insight, updatedAt: new Date() })
      .returning();
    return created;
  }

  async updateConversationInsight(id: string, userId: string, data: Partial<ConversationInsight>): Promise<ConversationInsight | undefined> {
    const [updated] = await db.update(conversationInsights)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(conversationInsights.id, id), eq(conversationInsights.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteConversationInsight(id: string, userId: string): Promise<void> {
    await db.delete(conversationInsights)
      .where(and(eq(conversationInsights.id, id), eq(conversationInsights.userId, userId)));
  }

  async bulkUpsertConversationInsights(insights: InsertConversationInsight[]): Promise<void> {
    if (insights.length === 0) return;
    await db.insert(conversationInsights)
      .values(insights.map(i => ({ ...i, updatedAt: new Date() })))
      .onConflictDoUpdate({
        target: conversationInsights.id,
        set: {
          // Only overwrite mutable fields; never overwrite userId or createdAt
          title: sql`excluded.title`,
          summary: sql`excluded.summary`,
          pinned: sql`excluded.pinned`,
          pinnedAt: sql`excluded.pinned_at`,
          hidden: sql`excluded.hidden`,
          updatedAt: new Date(),
        },
      });
  }

  // DW Insight + Journal Intelligence System
  async getDwInsights(userId: string, limit = 50): Promise<DwInsight[]> {
    return db.select()
      .from(dwInsights)
      .where(eq(dwInsights.userId, userId))
      .orderBy(desc(dwInsights.createdAt))
      .limit(limit);
  }

  async getLatestDwInsight(userId: string): Promise<DwInsight | undefined> {
    const [row] = await db.select()
      .from(dwInsights)
      .where(eq(dwInsights.userId, userId))
      .orderBy(desc(dwInsights.createdAt))
      .limit(1);
    return row;
  }

  async getDwInsightByConversation(userId: string, conversationId: string): Promise<DwInsight | undefined> {
    const [row] = await db.select()
      .from(dwInsights)
      .where(and(eq(dwInsights.userId, userId), eq(dwInsights.sourceConversationId, conversationId)))
      .limit(1);
    return row;
  }

  async createDwInsight(insight: InsertDwInsight): Promise<DwInsight> {
    const [created] = await db.insert(dwInsights)
      .values({ ...insight, updatedAt: new Date() })
      .returning();
    return created;
  }

  async getDwJournalEntries(userId: string, limit = 50): Promise<DwJournalEntry[]> {
    return db.select()
      .from(dwJournalEntries)
      .where(eq(dwJournalEntries.userId, userId))
      .orderBy(desc(dwJournalEntries.createdAt))
      .limit(limit);
  }

  async getLatestDwJournalEntry(userId: string): Promise<DwJournalEntry | undefined> {
    const [row] = await db.select()
      .from(dwJournalEntries)
      .where(eq(dwJournalEntries.userId, userId))
      .orderBy(desc(dwJournalEntries.createdAt))
      .limit(1);
    return row;
  }

  async createDwJournalEntry(entry: InsertDwJournalEntry): Promise<DwJournalEntry> {
    const [created] = await db.insert(dwJournalEntries)
      .values({ ...entry, updatedAt: new Date() })
      .returning();
    return created;
  }

  async getDwFollowups(userId: string, status?: string): Promise<DwFollowup[]> {
    const userCondition = eq(dwFollowups.userId, userId);
    let statusCondition: ReturnType<typeof eq> | ReturnType<typeof or> | undefined;
    if (status && status !== "all") {
      if (status === "pending") {
        // Return pending + snoozed-expired items as actionable
        const pendingCond = eq(dwFollowups.status, "pending");
        const snoozedExpiredCond = and(
          eq(dwFollowups.status, "snoozed"),
          lte(dwFollowups.snoozedUntil, new Date())
        );
        statusCondition = or(pendingCond, snoozedExpiredCond);
      } else {
        statusCondition = eq(dwFollowups.status, status);
      }
    }
    const whereClause = statusCondition
      ? and(userCondition, statusCondition)
      : userCondition;
    // No limit when fetching all statuses so the Completed bucket is complete
    const limit = status === "all" ? undefined : 50;
    const query = db.select()
      .from(dwFollowups)
      .where(whereClause)
      .orderBy(desc(dwFollowups.createdAt));
    return limit !== undefined ? query.limit(limit) : query;
  }

  async createDwFollowup(followup: InsertDwFollowup): Promise<DwFollowup> {
    const [created] = await db.insert(dwFollowups).values(followup).returning();
    return created;
  }

  async updateDwFollowup(id: string, userId: string, fields: Partial<Pick<DwFollowup, "status" | "snoozedUntil" | "acceptedAt" | "answeredAt" | "dismissedAt">>): Promise<DwFollowup | undefined> {
    const [updated] = await db.update(dwFollowups)
      .set(fields)
      .where(and(eq(dwFollowups.id, id), eq(dwFollowups.userId, userId)))
      .returning();
    return updated;
  }

  // ── Elevation Engine ────────────────────────────────────────────────────────

  async getElevationCheckByDate(userId: string, date: string): Promise<ElevationCheck | undefined> {
    const [row] = await db.select()
      .from(elevationChecks)
      .where(and(eq(elevationChecks.userId, userId), eq(elevationChecks.checkedDate, date)))
      .limit(1);
    return row;
  }

  async upsertElevationCheck(data: InsertElevationCheck): Promise<ElevationCheck> {
    const [row] = await db.insert(elevationChecks)
      .values(data)
      .onConflictDoUpdate({
        target: [elevationChecks.userId, elevationChecks.checkedDate],
        set: {
          momentumStatus: data.momentumStatus,
          reasons: data.reasons,
          suggestedFocus: data.suggestedFocus ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  // ─── Elevation Plan Builder (PR #5) ──────────────────────────────────────

  async getElevationPlans(userId: string): Promise<ElevationPlan[]> {
    return db.select().from(elevationPlans)
      .where(eq(elevationPlans.userId, userId))
      .orderBy(desc(elevationPlans.createdAt));
  }

  async getArchivedElevationPlans(userId: string): Promise<ElevationPlan[]> {
    return db.select().from(elevationPlans)
      .where(and(eq(elevationPlans.userId, userId), eq(elevationPlans.status, "archived")))
      .orderBy(desc(elevationPlans.createdAt));
  }

  // PR #17: returns all plans for a user with completion stats in a single aggregate query.
  // Uses Drizzle's typed select() so that column names are camelCased by the ORM (no raw snake_case leakage).
  async getElevationPlansWithStats(userId: string): Promise<(ElevationPlan & { totalActions: number; completedActions: number })[]> {
    const rows = await db
      .select({
        id: elevationPlans.id,
        userId: elevationPlans.userId,
        title: elevationPlans.title,
        goal: elevationPlans.goal,
        focusDimension: elevationPlans.focusDimension,
        status: elevationPlans.status,
        startDate: elevationPlans.startDate,
        endDate: elevationPlans.endDate,
        sourceConversationId: elevationPlans.sourceConversationId,
        createdAt: elevationPlans.createdAt,
        updatedAt: elevationPlans.updatedAt,
        totalActions: sql<number>`coalesce(count(${elevationPlanActions.id}), 0)::int`,
        completedActions: sql<number>`coalesce(count(${elevationPlanActions.id}) filter (where ${elevationPlanActions.isCompleted} = true), 0)::int`,
      })
      .from(elevationPlans)
      .leftJoin(elevationPlanDays, eq(elevationPlanDays.planId, elevationPlans.id))
      .leftJoin(elevationPlanActions, eq(elevationPlanActions.planDayId, elevationPlanDays.id))
      .where(eq(elevationPlans.userId, userId))
      .groupBy(elevationPlans.id)
      .orderBy(desc(elevationPlans.createdAt));
    return rows;
  }

  async getElevationPlan(id: string, userId: string): Promise<ElevationPlan | undefined> {
    const [row] = await db.select().from(elevationPlans)
      .where(and(eq(elevationPlans.id, id), eq(elevationPlans.userId, userId)));
    return row;
  }

  async getActiveElevationPlan(userId: string): Promise<ElevationPlan | undefined> {
    const [row] = await db.select().from(elevationPlans)
      .where(and(eq(elevationPlans.userId, userId), eq(elevationPlans.status, "active")))
      .orderBy(desc(elevationPlans.createdAt))
      .limit(1);
    return row;
  }

  async getDraftElevationPlanForDay(userId: string, date: string, conversationId?: string): Promise<ElevationPlan | undefined> {
    const conditions = [
      eq(elevationPlans.userId, userId),
      eq(elevationPlans.status, "draft"),
      eq(elevationPlans.startDate, date),
    ];
    if (conversationId) conditions.push(eq(elevationPlans.sourceConversationId, conversationId));
    const [row] = await db.select().from(elevationPlans)
      .where(and(...conditions))
      .orderBy(desc(elevationPlans.createdAt))
      .limit(1);
    return row;
  }

  async createElevationPlan(plan: InsertElevationPlan): Promise<ElevationPlan> {
    const [created] = await db.insert(elevationPlans)
      .values({ ...plan, updatedAt: new Date() })
      .returning();
    return created;
  }

  async updateElevationPlan(id: string, userId: string, data: Partial<ElevationPlan>): Promise<ElevationPlan | undefined> {
    const [updated] = await db.update(elevationPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(elevationPlans.id, id), eq(elevationPlans.userId, userId)))
      .returning();
    return updated;
  }

  async getElevationPlanDays(planId: string): Promise<ElevationPlanDay[]> {
    return db.select().from(elevationPlanDays)
      .where(eq(elevationPlanDays.planId, planId))
      .orderBy(elevationPlanDays.dayIndex);
  }

  async createElevationPlanDay(day: InsertElevationPlanDay): Promise<ElevationPlanDay> {
    const [created] = await db.insert(elevationPlanDays).values(day).returning();
    return created;
  }

  async getElevationPlanActions(planDayId: string): Promise<ElevationPlanAction[]> {
    return db.select().from(elevationPlanActions)
      .where(eq(elevationPlanActions.planDayId, planDayId))
      .orderBy(elevationPlanActions.createdAt);
  }

  async getElevationPlanActionForUser(id: string, userId: string): Promise<ElevationPlanAction | undefined> {
    const [row] = await db.select().from(elevationPlanActions)
      .where(
        and(
          eq(elevationPlanActions.id, id),
          sql`${elevationPlanActions.planDayId} in (
            select ${elevationPlanDays.id}
            from ${elevationPlanDays}
            where ${elevationPlanDays.planId} in (
              select ${elevationPlans.id}
              from ${elevationPlans}
              where ${elevationPlans.userId} = ${userId}
            )
          )`
        )
      );
    return row;
  }

  async createElevationPlanAction(action: InsertElevationPlanAction): Promise<ElevationPlanAction> {
    const [created] = await db.insert(elevationPlanActions)
      .values({ ...action, updatedAt: new Date() })
      .returning();
    return created;
  }

  async updateElevationPlanAction(id: string, userId: string, data: Partial<ElevationPlanAction>): Promise<ElevationPlanAction | undefined> {
    const [updated] = await db.update(elevationPlanActions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(elevationPlanActions.id, id),
          sql`${elevationPlanActions.planDayId} in (
            select ${elevationPlanDays.id}
            from ${elevationPlanDays}
            where ${elevationPlanDays.planId} in (
              select ${elevationPlans.id}
              from ${elevationPlans}
              where ${elevationPlans.userId} = ${userId}
            )
          )`
        )
      )
      .returning();
    return updated;
  }

  // ── Reminders (PR #7) ──────────────────────────────────────────────────────

  async getReminders(userId: string, status?: string): Promise<Reminder[]> {
    const userCond = eq(reminders.userId, userId);
    const whereClause = status && status !== "all"
      ? and(userCond, eq(reminders.status, status))
      : userCond;
    // Ascending: most imminent scheduled reminders appear first
    return db.select().from(reminders).where(whereClause).orderBy(reminders.scheduledAt);
  }

  async getDueReminders(userId: string, before: Date): Promise<Reminder[]> {
    return db.select().from(reminders).where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.status, "scheduled"),
        lte(reminders.scheduledAt, before),
      )
    ).orderBy(reminders.scheduledAt);
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(reminder).returning();
    return created;
  }

  async updateReminder(id: string, userId: string, fields: Partial<Pick<Reminder, "status" | "scheduledAt" | "title" | "body">>): Promise<Reminder | undefined> {
    const [updated] = await db.update(reminders)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return updated;
  }

  async cancelRemindersBySource(userId: string, sourceEntityType: string, sourceEntityId: string): Promise<void> {
    await db.update(reminders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.sourceEntityType, sourceEntityType),
          eq(reminders.sourceEntityId, sourceEntityId),
          eq(reminders.status, "scheduled"),
        )
      );
  }

  // ── Learning Profile (PR #8) ──────────────────────────────────────────────

  async getLearningProfile(userId: string): Promise<UserLearningProfile | undefined> {
    const [row] = await db
      .select()
      .from(userLearningProfile)
      .where(eq(userLearningProfile.userId, userId))
      .limit(1);
    return row;
  }

  async upsertLearningProfile(userId: string, data: UpdateUserLearningProfile): Promise<UserLearningProfile> {
    const [upserted] = await db
      .insert(userLearningProfile)
      .values({ userId, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userLearningProfile.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return upserted;
  }

  async resetLearningProfile(userId: string): Promise<UserLearningProfile> {
    const [upserted] = await db
      .insert(userLearningProfile)
      .values({
        userId,
        preferredTimes: {},
        preferredActionTypes: [],
        sensitivity: {},
        frictionPoints: [],
        wins: [],
        avoid: [],
        lastFeedbackAt: null,
        learningEnabled: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userLearningProfile.userId,
        set: {
          preferredTimes: {},
          preferredActionTypes: [],
          sensitivity: {},
          frictionPoints: [],
          wins: [],
          avoid: [],
          lastFeedbackAt: null,
          learningEnabled: true,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  // ─── Weekly Plan Reviews (PR #15) ─────────────────────────────────────────

  async getWeeklyPlanReview(planId: string, userId: string): Promise<WeeklyPlanReview | undefined> {
    const [row] = await db
      .select()
      .from(weeklyPlanReviews)
      .where(and(eq(weeklyPlanReviews.planId, planId), eq(weeklyPlanReviews.userId, userId)));
    return row;
  }

  async createWeeklyPlanReview(data: InsertWeeklyPlanReview): Promise<WeeklyPlanReview> {
    const [created] = await db
      .insert(weeklyPlanReviews)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    return created;
  }

  async updateWeeklyPlanReview(planId: string, userId: string, data: UpdateWeeklyPlanReview): Promise<WeeklyPlanReview | undefined> {
    const [updated] = await db
      .update(weeklyPlanReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(weeklyPlanReviews.planId, planId), eq(weeklyPlanReviews.userId, userId)))
      .returning();
    return updated;
  }

  async createNotification(data: { userId: string; type: string; title: string; body: string; actionUrl?: string; metadata?: any }): Promise<any> {
    const [notif] = await db.insert(notifications).values(data as any).returning();
    return notif;
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result[0]?.count ?? 0;
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async getTodayCheckIn(userId: string): Promise<any | undefined> {
    const today = new Date().toISOString().split("T")[0];
    const [row] = await db.select().from(eveningCheckIns).where(and(eq(eveningCheckIns.userId, userId), eq(eveningCheckIns.checkInDate, today)));
    return row;
  }

  async getCheckInByDate(userId: string, date: string): Promise<any | undefined> {
    const [row] = await db.select().from(eveningCheckIns).where(and(eq(eveningCheckIns.userId, userId), eq(eveningCheckIns.checkInDate, date)));
    return row;
  }

  async createEveningCheckIn(data: { userId: string; checkInDate: string; userNotes?: string; completedSummary?: string; dwAnalysis?: string; energyScore?: number }): Promise<any> {
    const [row] = await db.insert(eveningCheckIns).values(data).returning();
    return row;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async setUsername(userId: string, username: string, systemName?: string): Promise<void> {
    const updates: any = { username };
    if (systemName !== undefined) updates.systemName = systemName;
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  // ── Life System Pillars ───────────────────────────────────────────────────
  async getLifeSystemPillars(userId: string): Promise<LifeSystemPillar[]> {
    return await db
      .select()
      .from(lifeSystemPillars)
      .where(eq(lifeSystemPillars.userId, userId))
      .orderBy(lifeSystemPillars.sortOrder);
  }

  async upsertLifeSystemPillar(pillar: InsertLifeSystemPillar): Promise<LifeSystemPillar> {
    const existing = await db
      .select()
      .from(lifeSystemPillars)
      .where(and(eq(lifeSystemPillars.userId, pillar.userId), eq(lifeSystemPillars.pillarId, pillar.pillarId)))
      .limit(1);
    const values = pillar as typeof lifeSystemPillars.$inferInsert;
    if (existing[0]) {
      const [updated] = await db
        .update(lifeSystemPillars)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(lifeSystemPillars.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(lifeSystemPillars).values(values).returning();
    return created;
  }

  async updateLifeSystemPillar(
    userId: string,
    pillarId: string,
    data: Partial<InsertLifeSystemPillar>,
  ): Promise<LifeSystemPillar | undefined> {
    const setData = data as Partial<typeof lifeSystemPillars.$inferInsert>;
    const [updated] = await db
      .update(lifeSystemPillars)
      .set({ ...setData, updatedAt: new Date() })
      .where(and(eq(lifeSystemPillars.userId, userId), eq(lifeSystemPillars.pillarId, pillarId)))
      .returning();
    return updated;
  }

  async deleteAllLifeSystemPillars(userId: string): Promise<void> {
    await db.delete(lifeSystemPillars).where(eq(lifeSystemPillars.userId, userId));
  }

  async deleteAllLifeSystemDocuments(userId: string): Promise<void> {
    await db.delete(lifeSystemDocuments).where(eq(lifeSystemDocuments.userId, userId));
  }

  async createTriggerEvent(event: InsertTriggerEvent): Promise<TriggerEvent> {
    const [row] = await db.insert(triggerEvents).values(event).returning();
    return row;
  }

  async listTriggerEvents(userId: string, limit = 50): Promise<TriggerEvent[]> {
    return await db
      .select()
      .from(triggerEvents)
      .where(eq(triggerEvents.userId, userId))
      .orderBy(desc(triggerEvents.createdAt))
      .limit(limit);
  }

  async countTriggerEventsSince(userId: string, since: Date): Promise<{ total: number; noProof: number }> {
    const rows = await db
      .select({ hadProof: triggerEvents.hadProof })
      .from(triggerEvents)
      .where(and(eq(triggerEvents.userId, userId), gte(triggerEvents.createdAt, since)));
    return {
      total: rows.length,
      noProof: rows.filter(r => r.hadProof === false).length,
    };
  }

  async getLifeSystemProjects(userId: string): Promise<LifeSystemProject[]> {
    return await db
      .select()
      .from(lifeSystemProjects)
      .where(eq(lifeSystemProjects.userId, userId))
      .orderBy(lifeSystemProjects.sortOrder);
  }

  async createLifeSystemProject(project: InsertLifeSystemProject): Promise<LifeSystemProject> {
    const values = project as typeof lifeSystemProjects.$inferInsert;
    const [created] = await db.insert(lifeSystemProjects).values(values).returning();
    return created;
  }

  async updateLifeSystemProject(
    id: string,
    userId: string,
    data: Partial<InsertLifeSystemProject>,
  ): Promise<LifeSystemProject | undefined> {
    const setData = data as Partial<typeof lifeSystemProjects.$inferInsert>;
    const [updated] = await db
      .update(lifeSystemProjects)
      .set({ ...setData, updatedAt: new Date() })
      .where(and(eq(lifeSystemProjects.id, id), eq(lifeSystemProjects.userId, userId)))
      .returning();
    return updated;
  }

  async deleteLifeSystemProject(id: string, userId: string): Promise<boolean> {
    const deleted = await db
      .delete(lifeSystemProjects)
      .where(and(eq(lifeSystemProjects.id, id), eq(lifeSystemProjects.userId, userId)))
      .returning({ id: lifeSystemProjects.id });
    return deleted.length > 0;
  }

  async getLatestLifeSystemDocument(userId: string): Promise<LifeSystemDocument | undefined> {
    const [row] = await db
      .select()
      .from(lifeSystemDocuments)
      .where(eq(lifeSystemDocuments.userId, userId))
      .orderBy(desc(lifeSystemDocuments.generatedAt))
      .limit(1);
    return row;
  }

  async createLifeSystemDocument(doc: InsertLifeSystemDocument): Promise<LifeSystemDocument> {
    const [created] = await db.insert(lifeSystemDocuments).values(doc).returning();
    return created;
  }

  // ── Finances ──────────────────────────────────────────────────────────
  async getFinancialAccounts(userId: string): Promise<FinancialAccount[]> {
    return await db.select().from(financialAccounts)
      .where(eq(financialAccounts.userId, userId))
      .orderBy(desc(financialAccounts.createdAt));
  }
  async createFinancialAccount(data: InsertFinancialAccount): Promise<FinancialAccount> {
    const [row] = await db.insert(financialAccounts).values(data).returning();
    return row;
  }
  async updateFinancialAccount(id: string, userId: string, data: Partial<InsertFinancialAccount>): Promise<FinancialAccount | undefined> {
    const [row] = await db.update(financialAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
      .returning();
    return row || undefined;
  }
  async deleteFinancialAccount(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(financialAccounts)
      .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
      .returning({ id: financialAccounts.id });
    return result.length > 0;
  }

  async getTransactions(userId: string, opts?: { from?: string; to?: string; category?: string; limit?: number }): Promise<Transaction[]> {
    const conds: any[] = [eq(transactions.userId, userId)];
    if (opts?.from) conds.push(gte(transactions.date, opts.from));
    if (opts?.to) conds.push(lte(transactions.date, opts.to));
    if (opts?.category) conds.push(eq(transactions.category, opts.category));
    return await db.select().from(transactions)
      .where(and(...conds))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(opts?.limit ?? 500);
  }
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const [row] = await db.insert(transactions).values(data).returning();
    if (row.goalId && row.amount > 0) {
      await this.adjustSavingsGoalAmount(row.goalId, row.userId, row.amount);
    }
    return row;
  }
  // Adjust a goal's currentAmount by `delta` (can be negative). Clamps at 0.
  // Atomic: single UPDATE so concurrent contributions can't lose updates.
  // Used for auto-credit when income transactions are linked/unlinked.
  private async adjustSavingsGoalAmount(goalId: string, userId: string, delta: number): Promise<void> {
    await db.execute(sql`
      UPDATE savings_goals
      SET current_amount = GREATEST(0, current_amount + ${delta}),
          updated_at = NOW()
      WHERE id = ${goalId} AND user_id = ${userId}
    `);
  }
  async upsertTransactionByPlaidId(data: InsertTransaction): Promise<Transaction> {
    if (!data.plaidTransactionId) {
      return this.createTransaction(data);
    }
    const existing = await db.select().from(transactions)
      .where(eq(transactions.plaidTransactionId, data.plaidTransactionId))
      .limit(1);
    if (existing.length > 0) {
      const [row] = await db.update(transactions)
        .set({ amount: data.amount, category: data.category, merchant: data.merchant, date: data.date, pending: data.pending })
        .where(eq(transactions.plaidTransactionId, data.plaidTransactionId))
        .returning();
      return row;
    }
    return this.createTransaction(data);
  }
  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    const row = result[0];
    if (row?.goalId && row.amount > 0) {
      await this.adjustSavingsGoalAmount(row.goalId, userId, -row.amount);
    }
    return result.length > 0;
  }
  async deleteTransactionByPlaidId(plaidTransactionId: string, userId: string): Promise<void> {
    await db.delete(transactions)
      .where(and(eq(transactions.plaidTransactionId, plaidTransactionId), eq(transactions.userId, userId)));
  }

  async getBudgets(userId: string): Promise<Budget[]> {
    return await db.select().from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(budgets.category);
  }
  async upsertBudget(data: InsertBudget): Promise<Budget> {
    const existing = await db.select().from(budgets)
      .where(and(eq(budgets.userId, data.userId), eq(budgets.category, data.category)))
      .limit(1);
    if (existing.length > 0) {
      const [row] = await db.update(budgets)
        .set({ monthlyLimit: data.monthlyLimit, updatedAt: new Date() })
        .where(eq(budgets.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await db.insert(budgets).values(data).returning();
    return row;
  }
  async deleteBudget(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning({ id: budgets.id });
    return result.length > 0;
  }

  async getInvestmentHoldings(userId: string): Promise<InvestmentHolding[]> {
    return await db.select().from(investmentHoldings)
      .where(eq(investmentHoldings.userId, userId))
      .orderBy(desc(investmentHoldings.createdAt));
  }
  async createInvestmentHolding(data: InsertInvestmentHolding): Promise<InvestmentHolding> {
    const [row] = await db.insert(investmentHoldings).values(data).returning();
    return row;
  }
  async updateInvestmentHolding(id: string, userId: string, data: Partial<InsertInvestmentHolding>): Promise<InvestmentHolding | undefined> {
    const [row] = await db.update(investmentHoldings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(investmentHoldings.id, id), eq(investmentHoldings.userId, userId)))
      .returning();
    return row || undefined;
  }
  async deleteInvestmentHolding(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(investmentHoldings)
      .where(and(eq(investmentHoldings.id, id), eq(investmentHoldings.userId, userId)))
      .returning({ id: investmentHoldings.id });
    return result.length > 0;
  }

  async getNetWorthSnapshots(userId: string, limit = 90): Promise<NetWorthSnapshot[]> {
    return await db.select().from(netWorthSnapshots)
      .where(eq(netWorthSnapshots.userId, userId))
      .orderBy(desc(netWorthSnapshots.date))
      .limit(limit);
  }
  async upsertNetWorthSnapshot(data: InsertNetWorthSnapshot): Promise<NetWorthSnapshot> {
    const existing = await db.select().from(netWorthSnapshots)
      .where(and(eq(netWorthSnapshots.userId, data.userId), eq(netWorthSnapshots.date, data.date)))
      .limit(1);
    if (existing.length > 0) {
      const [row] = await db.update(netWorthSnapshots)
        .set({ assets: data.assets, liabilities: data.liabilities, netWorth: data.netWorth })
        .where(eq(netWorthSnapshots.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await db.insert(netWorthSnapshots).values(data).returning();
    return row;
  }

  async getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    return await db.select().from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
  }
  async createSavingsGoal(data: InsertSavingsGoal): Promise<SavingsGoal> {
    const [row] = await db.insert(savingsGoals).values(data).returning();
    return row;
  }
  async updateSavingsGoal(id: string, userId: string, data: Partial<InsertSavingsGoal>): Promise<SavingsGoal | undefined> {
    const [row] = await db.update(savingsGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning();
    return row || undefined;
  }
  async deleteSavingsGoal(id: string, userId: string): Promise<boolean> {
    // Unlink any transactions pointing at this goal first (no FK constraint).
    await db.update(transactions)
      .set({ goalId: null })
      .where(and(eq(transactions.userId, userId), eq(transactions.goalId, id)));
    const result = await db.delete(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning({ id: savingsGoals.id });
    return result.length > 0;
  }

  async getPlaidItems(userId: string): Promise<PlaidItem[]> {
    return await db.select().from(plaidItems).where(eq(plaidItems.userId, userId));
  }
  async getAllPlaidItems(): Promise<PlaidItem[]> {
    return await db.select().from(plaidItems);
  }
  async getPlaidItem(itemId: string): Promise<PlaidItem | undefined> {
    const [row] = await db.select().from(plaidItems).where(eq(plaidItems.itemId, itemId));
    return row || undefined;
  }
  async createPlaidItem(data: InsertPlaidItem): Promise<PlaidItem> {
    const [row] = await db.insert(plaidItems).values(data).returning();
    return row;
  }
  async updatePlaidItemCursor(itemId: string, cursor: string): Promise<void> {
    await db.update(plaidItems)
      .set({ cursor, lastSyncAt: new Date() })
      .where(eq(plaidItems.itemId, itemId));
  }
  async markPlaidItemSuccess(itemId: string): Promise<void> {
    const now = new Date();
    await db.update(plaidItems)
      .set({
        status: "ok",
        lastError: null,
        lastErrorCode: null,
        lastErrorAt: null,
        errorNotifiedAt: null,
        lastSuccessAt: now,
        lastSyncAt: now,
      })
      .where(eq(plaidItems.itemId, itemId));
  }
  async markPlaidItemError(
    itemId: string,
    code: string | null,
    message: string,
  ): Promise<void> {
    await db.update(plaidItems)
      .set({
        status: "error",
        lastError: message.slice(0, 1000),
        lastErrorCode: code,
        lastErrorAt: new Date(),
      })
      .where(eq(plaidItems.itemId, itemId));
  }
  async markPlaidItemErrorNotified(itemId: string): Promise<void> {
    await db.update(plaidItems)
      .set({ errorNotifiedAt: new Date() })
      .where(eq(plaidItems.itemId, itemId));
  }
  async deletePlaidItem(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(plaidItems)
      .where(and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)))
      .returning({ id: plaidItems.id });
    return result.length > 0;
  }

  // ── Imported Conversations ─────────────────────────────────────────────────
  async listImportedConversations(userId: string): Promise<ImportedConversation[]> {
    return await db.select().from(importedConversations)
      .where(eq(importedConversations.userId, userId))
      .orderBy(desc(importedConversations.importedAt));
  }
  async getImportedConversation(id: string, userId: string): Promise<ImportedConversation | undefined> {
    const [row] = await db.select().from(importedConversations)
      .where(and(eq(importedConversations.id, id), eq(importedConversations.userId, userId)));
    return row;
  }
  async createImportedConversation(data: InsertImportedConversation): Promise<ImportedConversation> {
    const [row] = await db.insert(importedConversations).values(data).returning();
    return row;
  }
  async updateImportedConversation(id: string, userId: string, data: Partial<InsertImportedConversation>): Promise<ImportedConversation | undefined> {
    const [row] = await db.update(importedConversations)
      .set(data)
      .where(and(eq(importedConversations.id, id), eq(importedConversations.userId, userId)))
      .returning();
    return row;
  }
  async deleteImportedConversation(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(importedConversations)
      .where(and(eq(importedConversations.id, id), eq(importedConversations.userId, userId)))
      .returning({ id: importedConversations.id });
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
