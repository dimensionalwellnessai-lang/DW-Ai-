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
}

export const storage = new DatabaseStorage();
