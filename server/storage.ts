import {
  users,
  onboardingProfiles,
  lifeSystems,
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
  calendarEvents,
  userProfiles,
  wellnessContent,
  challenges,
  bodyScans,
  systemModules,
  dailyScheduleEvents,
  userSystemPreferences,
  passwordResetTokens,
  importedDocuments,
  importedDocumentItems,
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
  type CalendarEvent,
  type InsertCalendarEvent,
  type UserProfile,
  type InsertUserProfile,
  type WellnessContent,
  type InsertWellnessContent,
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
  type WorkoutPlan,
  type InsertWorkoutPlan,
  type Exercise,
  type InsertExercise,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  getOnboardingProfile(userId: string): Promise<OnboardingProfile | undefined>;
  createOnboardingProfile(profile: InsertOnboardingProfile): Promise<OnboardingProfile>;
  updateOnboardingProfile(id: string, data: Partial<OnboardingProfile>): Promise<OnboardingProfile | undefined>;

  getLifeSystem(userId: string): Promise<LifeSystem | undefined>;
  createLifeSystem(system: InsertLifeSystem): Promise<LifeSystem>;
  updateLifeSystem(id: string, data: Partial<LifeSystem>): Promise<LifeSystem | undefined>;

  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, data: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;

  getHabits(userId: string): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | undefined>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: string, data: Partial<Habit>): Promise<Habit | undefined>;
  deleteHabit(id: string): Promise<void>;

  getHabitLogs(habitId: string): Promise<HabitLog[]>;
  createHabitLog(log: InsertHabitLog): Promise<HabitLog>;

  getMoodLogs(userId: string): Promise<MoodLog[]>;
  getTodaysMoodLog(userId: string): Promise<MoodLog | undefined>;
  createMoodLog(log: InsertMoodLog): Promise<MoodLog>;

  getCheckIns(userId: string): Promise<CheckIn[]>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;

  getScheduleBlocks(userId: string): Promise<ScheduleBlock[]>;
  createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock>;
  updateScheduleBlock(id: string, data: Partial<ScheduleBlock>): Promise<ScheduleBlock | undefined>;
  deleteScheduleBlock(id: string): Promise<void>;

  getCategoryEntries(userId: string, category?: string): Promise<CategoryEntry[]>;
  createCategoryEntry(entry: InsertCategoryEntry): Promise<CategoryEntry>;
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
  createStabilizingAction(action: InsertStabilizingAction): Promise<StabilizingAction>;
  updateStabilizingAction(id: string, data: Partial<StabilizingAction>): Promise<StabilizingAction | undefined>;
  deleteStabilizingAction(id: string): Promise<void>;

  getSupportPreferences(blueprintId: string): Promise<SupportPreferences | undefined>;
  createSupportPreferences(prefs: InsertSupportPreferences): Promise<SupportPreferences>;
  updateSupportPreferences(id: string, data: Partial<SupportPreferences>): Promise<SupportPreferences | undefined>;

  getRecoveryReflections(blueprintId: string): Promise<RecoveryReflection[]>;
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
  deleteTask(id: string): Promise<void>;

  getProjects(userId: string): Promise<Project[]>;
  getProjectForUser(id: string, userId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProjectForUser(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProjectForUser(id: string, userId: string): Promise<boolean>;

  getProjectChatsForUser(projectId: string, userId: string): Promise<ProjectChat[]>;
  createProjectChatForUser(chat: InsertProjectChat, userId: string): Promise<ProjectChat | undefined>;

  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  getCalendarEventForUser(id: string, userId: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEventForUser(id: string, userId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEventForUser(id: string, userId: string): Promise<boolean>;

  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined>;

  getWellnessContent(filters?: { category?: string; goalTags?: string[]; difficulty?: string }): Promise<WellnessContent[]>;
  getWellnessContentById(id: string): Promise<WellnessContent | undefined>;

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
  updateImportedDocumentItem(id: string, data: Partial<ImportedDocumentItem>): Promise<ImportedDocumentItem | undefined>;

  getMealPlans(userId: string): Promise<MealPlan[]>;
  getMealPlan(id: string): Promise<MealPlan | undefined>;
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: string, data: Partial<MealPlan>): Promise<MealPlan | undefined>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
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

  async createHabitLog(log: InsertHabitLog): Promise<HabitLog> {
    const [created] = await db.insert(habitLogs).values(log).returning();
    return created;
  }

  async getMoodLogs(userId: string): Promise<MoodLog[]> {
    return db.select().from(moodLogs).where(eq(moodLogs.userId, userId)).orderBy(desc(moodLogs.createdAt));
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
    return created;
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

  async updateCalendarEventForUser(id: string, userId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const [updated] = await db.update(calendarEvents).set(data)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
    return updated || undefined;
  }

  async deleteCalendarEventForUser(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
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

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
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
}

export const storage = new DatabaseStorage();
