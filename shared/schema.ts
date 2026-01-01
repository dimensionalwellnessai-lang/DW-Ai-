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
  userProfile: one(userProfiles),
  lifeSystem: one(lifeSystems),
  goals: many(goals),
  habits: many(habits),
  moodLogs: many(moodLogs),
  checkIns: many(checkIns),
}));

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  goals: text("goals").array(),
  scheduleAvailability: jsonb("schedule_availability"),
  dietRestrictions: text("diet_restrictions").array(),
  allergies: text("allergies").array(),
  workoutLocation: text("workout_location"),
  workoutEquipment: text("workout_equipment").array(),
  fitnessGoal: text("fitness_goal"),
  experienceLevel: text("experience_level"),
  injuriesLimitations: text("injuries_limitations").array(),
  coachingTone: text("coaching_tone"),
  meditationStyle: text("meditation_style"),
  meditationVoice: text("meditation_voice"),
  meditationDurationMin: integer("meditation_duration_min"),
  meditationDurationMax: integer("meditation_duration_max"),
  reminderPreference: text("reminder_preference"),
  profileCompleteness: integer("profile_completeness").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
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

export const wellnessBlueprints = pgTable("wellness_blueprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").default("My Wellness Blueprint"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wellnessBlueprintsRelations = relations(wellnessBlueprints, ({ one, many }) => ({
  user: one(users, {
    fields: [wellnessBlueprints.userId],
    references: [users.id],
  }),
  baseline: one(baselineProfiles),
  stressSignals: one(stressSignals),
  stabilizingActions: many(stabilizingActions),
  supportPreferences: one(supportPreferences),
  recoveryReflections: many(recoveryReflections),
}));

export const baselineProfiles = pgTable("baseline_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull().references(() => wellnessBlueprints.id),
  baselineSigns: text("baseline_signs").array(),
  dailySupports: text("daily_supports").array(),
  preferredPace: text("preferred_pace").default("steady"),
  notes: text("notes"),
});

export const baselineProfilesRelations = relations(baselineProfiles, ({ one }) => ({
  blueprint: one(wellnessBlueprints, {
    fields: [baselineProfiles.blueprintId],
    references: [wellnessBlueprints.id],
  }),
}));

export const stressSignals = pgTable("stress_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull().references(() => wellnessBlueprints.id),
  drainingPatterns: text("draining_patterns").array(),
  earlySignals: text("early_signals").array(),
  contextTags: text("context_tags").array(),
  notes: text("notes"),
});

export const stressSignalsRelations = relations(stressSignals, ({ one }) => ({
  blueprint: one(wellnessBlueprints, {
    fields: [stressSignals.blueprintId],
    references: [wellnessBlueprints.id],
  }),
}));

export const stabilizingActions = pgTable("stabilizing_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull().references(() => wellnessBlueprints.id),
  actionName: text("action_name").notNull(),
  actionType: text("action_type").default("suggestion"),
  routineId: varchar("routine_id"),
  durationMinutes: integer("duration_minutes"),
  instructions: text("instructions"),
  links: text("links").array(),
  dimensionTags: text("dimension_tags").array(),
  notes: text("notes"),
});

export const stabilizingActionsRelations = relations(stabilizingActions, ({ one }) => ({
  blueprint: one(wellnessBlueprints, {
    fields: [stabilizingActions.blueprintId],
    references: [wellnessBlueprints.id],
  }),
}));

export const supportPreferences = pgTable("support_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull().references(() => wellnessBlueprints.id),
  helpfulSupport: text("helpful_support").array(),
  unhelpfulSupport: text("unhelpful_support").array(),
  trustedPeople: jsonb("trusted_people"),
  boundaries: text("boundaries").array(),
  environmentNeeds: text("environment_needs").array(),
  notes: text("notes"),
});

export const supportPreferencesRelations = relations(supportPreferences, ({ one }) => ({
  blueprint: one(wellnessBlueprints, {
    fields: [supportPreferences.blueprintId],
    references: [wellnessBlueprints.id],
  }),
}));

export const recoveryReflections = pgTable("recovery_reflections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull().references(() => wellnessBlueprints.id),
  title: text("title"),
  content: text("content"),
  lessonsLearned: text("lessons_learned").array(),
  adjustmentsToMake: text("adjustments_to_make").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recoveryReflectionsRelations = relations(recoveryReflections, ({ one }) => ({
  blueprint: one(wellnessBlueprints, {
    fields: [recoveryReflections.blueprintId],
    references: [wellnessBlueprints.id],
  }),
}));

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  dimensionTags: text("dimension_tags").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
}));

export const projectChats = pgTable("project_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  messages: jsonb("messages"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectChatsRelations = relations(projectChats, ({ one }) => ({
  project: one(projects, {
    fields: [projectChats.projectId],
    references: [projects.id],
  }),
}));

export const routines = pgTable("routines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  dimensionTags: text("dimension_tags").array(),
  steps: jsonb("steps"),
  totalDurationMinutes: integer("total_duration_minutes"),
  scheduleOptions: jsonb("schedule_options"),
  mode: text("mode").default("guided"),
  projectId: varchar("project_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routinesRelations = relations(routines, ({ one }) => ({
  user: one(users, {
    fields: [routines.userId],
    references: [users.id],
  }),
}));

export const routineLogs = pgTable("routine_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routineId: varchar("routine_id").notNull().references(() => routines.id),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

export const routineLogsRelations = relations(routineLogs, ({ one }) => ({
  routine: one(routines, {
    fields: [routineLogs.routineId],
    references: [routines.id],
  }),
}));

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo"),
  isCompleted: boolean("is_completed").default(false),
  dueDate: text("due_date"),
  scheduledStart: text("scheduled_start"),
  scheduledEnd: text("scheduled_end"),
  projectId: varchar("project_id"),
  goalId: varchar("goal_id"),
  routineId: varchar("routine_id"),
  blueprintActionId: varchar("blueprint_action_id"),
  dimensionTags: text("dimension_tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  eventType: text("event_type").default("event"),
  dimensionTags: text("dimension_tags").array(),
  projectId: varchar("project_id"),
  routineId: varchar("routine_id"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const wellnessContent = pgTable("wellness_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(),
  category: text("category").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  difficulty: text("difficulty"),
  equipment: text("equipment").array(),
  goalTags: text("goal_tags").array(),
  moodTags: text("mood_tags").array(),
  dietTags: text("diet_tags").array(),
  instructions: jsonb("instructions"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  durationDays: integer("duration_days").notNull(),
  dailyTasks: jsonb("daily_tasks"),
  startDate: text("start_date"),
  currentDay: integer("current_day").default(0),
  status: text("status").default("not_started"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challengesRelations = relations(challenges, ({ one }) => ({
  user: one(users, {
    fields: [challenges.userId],
    references: [users.id],
  }),
}));

export const bodyScans = pgTable("body_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  height: text("height"),
  weight: text("weight"),
  waist: text("waist"),
  goals: text("goals").array(),
  notes: text("notes"),
  consentGiven: boolean("consent_given").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bodyScansRelations = relations(bodyScans, ({ one }) => ({
  user: one(users, {
    fields: [bodyScans.userId],
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

export const insertWellnessBlueprintSchema = createInsertSchema(wellnessBlueprints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBaselineProfileSchema = createInsertSchema(baselineProfiles).omit({
  id: true,
});

export const insertStressSignalsSchema = createInsertSchema(stressSignals).omit({
  id: true,
});

export const insertStabilizingActionSchema = createInsertSchema(stabilizingActions).omit({
  id: true,
});

export const insertSupportPreferencesSchema = createInsertSchema(supportPreferences).omit({
  id: true,
});

export const insertRecoveryReflectionSchema = createInsertSchema(recoveryReflections).omit({
  id: true,
  createdAt: true,
});

export const insertRoutineSchema = createInsertSchema(routines).omit({
  id: true,
  createdAt: true,
});

export const insertRoutineLogSchema = createInsertSchema(routineLogs).omit({
  id: true,
  completedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertProjectChatSchema = createInsertSchema(projectChats).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertWellnessContentSchema = createInsertSchema(wellnessContent).omit({
  id: true,
  createdAt: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
});

export const insertBodyScanSchema = createInsertSchema(bodyScans).omit({
  id: true,
  createdAt: true,
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id"),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"),
  messages: jsonb("messages").notNull().default([]),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
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
export type WellnessBlueprint = typeof wellnessBlueprints.$inferSelect;
export type InsertWellnessBlueprint = z.infer<typeof insertWellnessBlueprintSchema>;
export type BaselineProfile = typeof baselineProfiles.$inferSelect;
export type InsertBaselineProfile = z.infer<typeof insertBaselineProfileSchema>;
export type StressSignals = typeof stressSignals.$inferSelect;
export type InsertStressSignals = z.infer<typeof insertStressSignalsSchema>;
export type StabilizingAction = typeof stabilizingActions.$inferSelect;
export type InsertStabilizingAction = z.infer<typeof insertStabilizingActionSchema>;
export type SupportPreferences = typeof supportPreferences.$inferSelect;
export type InsertSupportPreferences = z.infer<typeof insertSupportPreferencesSchema>;
export type RecoveryReflection = typeof recoveryReflections.$inferSelect;
export type InsertRecoveryReflection = z.infer<typeof insertRecoveryReflectionSchema>;
export type Routine = typeof routines.$inferSelect;
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type RoutineLog = typeof routineLogs.$inferSelect;
export type InsertRoutineLog = z.infer<typeof insertRoutineLogSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectChat = typeof projectChats.$inferSelect;
export type InsertProjectChat = z.infer<typeof insertProjectChatSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type WellnessContent = typeof wellnessContent.$inferSelect;
export type InsertWellnessContent = z.infer<typeof insertWellnessContentSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type BodyScan = typeof bodyScans.$inferSelect;
export type InsertBodyScan = z.infer<typeof insertBodyScanSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
