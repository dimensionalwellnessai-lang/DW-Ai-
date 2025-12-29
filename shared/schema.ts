import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username"),
  password: text("password").notNull(),
  systemName: text("system_name"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  onboardingProfile: one(onboardingProfiles),
  lifeSystem: one(lifeSystems),
  goals: many(goals),
  habits: many(habits),
  moodLogs: many(moodLogs),
  checkIns: many(checkIns),
}));

export const onboardingProfiles = pgTable("onboarding_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  responsibilities: text("responsibilities").array(),
  priorities: text("priorities").array(),
  freeTimeHours: text("free_time_hours"),
  peakMotivationTime: text("peak_motivation_time"),
  wellnessFocus: text("wellness_focus").array(),
  lifeAreaDetails: jsonb("life_area_details"),
  shortTermGoals: text("short_term_goals"),
  longTermGoals: text("long_term_goals"),
  relationshipGoals: text("relationship_goals"),
  conversationData: jsonb("conversation_data"),
});

export const onboardingProfilesRelations = relations(onboardingProfiles, ({ one }) => ({
  user: one(users, {
    fields: [onboardingProfiles.userId],
    references: [users.id],
  }),
}));

export const lifeSystems = pgTable("life_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  weeklySchedule: jsonb("weekly_schedule"),
  suggestedHabits: jsonb("suggested_habits"),
  suggestedTools: text("suggested_tools").array(),
  scheduleBlocks: jsonb("schedule_blocks"),
  mealSuggestions: jsonb("meal_suggestions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lifeSystemsRelations = relations(lifeSystems, ({ one }) => ({
  user: one(users, {
    fields: [lifeSystems.userId],
    references: [users.id],
  }),
}));

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  wellnessDimension: text("wellness_dimension"),
  progress: integer("progress").default(0),
  targetValue: integer("target_value").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const habits = pgTable("habits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency").default("daily"),
  reminderTime: text("reminder_time"),
  isActive: boolean("is_active").default(true),
  streak: integer("streak").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.id],
  }),
  logs: many(habitLogs),
}));

export const habitLogs = pgTable("habit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  habitId: varchar("habit_id").notNull().references(() => habits.id),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, {
    fields: [habitLogs.habitId],
    references: [habits.id],
  }),
}));

export const moodLogs = pgTable("mood_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  energyLevel: integer("energy_level").notNull(),
  moodLevel: integer("mood_level").notNull(),
  clarityLevel: integer("clarity_level"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moodLogsRelations = relations(moodLogs, ({ one }) => ({
  user: one(users, {
    fields: [moodLogs.userId],
    references: [users.id],
  }),
}));

export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  messages: jsonb("messages"),
  aiResponse: text("ai_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  user: one(users, {
    fields: [checkIns.userId],
    references: [users.id],
  }),
}));

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  title: text("title").notNull(),
  category: text("category"),
  color: text("color"),
});

export const scheduleBlocksRelations = relations(scheduleBlocks, ({ one }) => ({
  user: one(users, {
    fields: [scheduleBlocks.userId],
    references: [users.id],
  }),
}));

export const categoryEntries = pgTable("category_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  metadata: jsonb("metadata"),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categoryEntriesRelations = relations(categoryEntries, ({ one }) => ({
  user: one(users, {
    fields: [categoryEntries.userId],
    references: [users.id],
  }),
}));

export const chatAttachments = pgTable("chat_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatAttachmentsRelations = relations(chatAttachments, ({ one }) => ({
  user: one(users, {
    fields: [chatAttachments.userId],
    references: [users.id],
  }),
}));

export const aiLearnings = pgTable("ai_learnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  topic: text("topic").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiLearningsRelations = relations(aiLearnings, ({ one }) => ({
  user: one(users, {
    fields: [aiLearnings.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertOnboardingProfileSchema = createInsertSchema(onboardingProfiles).omit({
  id: true,
});

export const insertLifeSystemSchema = createInsertSchema(lifeSystems).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
});

export const insertHabitLogSchema = createInsertSchema(habitLogs).omit({
  id: true,
  completedAt: true,
});

export const insertMoodLogSchema = createInsertSchema(moodLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleBlockSchema = createInsertSchema(scheduleBlocks).omit({
  id: true,
});

export const insertCategoryEntrySchema = createInsertSchema(categoryEntries).omit({
  id: true,
  createdAt: true,
});

export const insertChatAttachmentSchema = createInsertSchema(chatAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertAiLearningSchema = createInsertSchema(aiLearnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type OnboardingProfile = typeof onboardingProfiles.$inferSelect;
export type InsertOnboardingProfile = z.infer<typeof insertOnboardingProfileSchema>;
export type LifeSystem = typeof lifeSystems.$inferSelect;
export type InsertLifeSystem = z.infer<typeof insertLifeSystemSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type MoodLog = typeof moodLogs.$inferSelect;
export type InsertMoodLog = z.infer<typeof insertMoodLogSchema>;
export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type InsertScheduleBlock = z.infer<typeof insertScheduleBlockSchema>;
export type CategoryEntry = typeof categoryEntries.$inferSelect;
export type InsertCategoryEntry = z.infer<typeof insertCategoryEntrySchema>;
export type ChatAttachment = typeof chatAttachments.$inferSelect;
export type InsertChatAttachment = z.infer<typeof insertChatAttachmentSchema>;
export type AiLearning = typeof aiLearnings.$inferSelect;
export type InsertAiLearning = z.infer<typeof insertAiLearningSchema>;
