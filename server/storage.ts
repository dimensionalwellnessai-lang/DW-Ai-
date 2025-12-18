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
}

export const storage = new DatabaseStorage();
