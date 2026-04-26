import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = ["user", "admin"] as const;
export type UserRole = typeof userRoleEnum[number];

export const coachingModeEnum = ["gentle", "direct", "structured"] as const;
export type CoachingMode = typeof coachingModeEnum[number];

export const subscriptionTierEnum = ["free", "plus"] as const;
export type SubscriptionTier = typeof subscriptionTierEnum[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  password: text("password"),
  systemName: text("system_name"),
  role: text("role").default("user").$type<UserRole>(),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  trialStartAt: timestamp("trial_start_at"),
  createdAt: timestamp("created_at").defaultNow(),
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  coachingMode: text("coaching_mode").default("gentle").$type<CoachingMode>(),
  subscriptionTier: text("subscription_tier").default("free").$type<SubscriptionTier>(),
  subscriptionUpdatedAt: timestamp("subscription_updated_at"),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
}, (t) => [
  // Ensure each OAuth identity maps to exactly one user, and make lookups fast
  uniqueIndex("users_oauth_provider_id_idx").on(t.oauthProvider, t.oauthId),
  uniqueIndex("users_stripe_customer_id_idx").on(t.stripeCustomerId),
]);

export const usageMeterKindEnum = ["chat", "voice", "import", "coach_chat", "insights", "today"] as const;
export type UsageMeterKind = typeof usageMeterKindEnum[number];

export const usageMeters = pgTable("usage_meters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateKey: text("date_key").notNull(),
  kind: text("kind").notNull().$type<UsageMeterKind>(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("usage_meters_user_date_kind_idx").on(t.userId, t.dateKey, t.kind),
]);

export const insertUsageMeterSchema = createInsertSchema(usageMeters).omit({ id: true, updatedAt: true });
export type InsertUsageMeter = z.infer<typeof insertUsageMeterSchema>;
export type UsageMeter = typeof usageMeters.$inferSelect;

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
  lifestylePreferences: jsonb("lifestyle_preferences"),
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
  dataSource: text("data_source").default("user"),
  explainWhy: text("explain_why"),
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
  dataSource: text("data_source").default("user"),
  explainWhy: text("explain_why"),
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

export const aiSyncSessions = pgTable("ai_sync_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  status: text("status").notNull().default("processing"),
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  acceptedItems: integer("accepted_items").default(0),
  rejectedItems: integer("rejected_items").default(0),
  sourceType: text("source_type").default("chat"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const aiSyncSessionsRelations = relations(aiSyncSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [aiSyncSessions.userId],
    references: [users.id],
  }),
  items: many(aiSyncItems),
}));

export const aiSyncItems = pgTable("ai_sync_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiSyncSessions.id),
  itemType: text("item_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  recurrenceGroupKey: text("recurrence_group_key"),
  recurrencePattern: text("recurrence_pattern"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  dimensionTags: text("dimension_tags").array(),
  metadata: jsonb("metadata"),
  status: text("status").notNull().default("pending"),
  aiConfidence: integer("ai_confidence").default(80),
  userDecision: text("user_decision"),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiSyncItemsRelations = relations(aiSyncItems, ({ one }) => ({
  session: one(aiSyncSessions, {
    fields: [aiSyncItems.sessionId],
    references: [aiSyncSessions.id],
  }),
}));

export const interactionEvents = pgTable("interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(),
  pagePath: text("page_path"),
  actionTarget: text("action_target"),
  actionValue: text("action_value"),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const interactionEventsRelations = relations(interactionEvents, ({ one }) => ({
  user: one(users, {
    fields: [interactionEvents.userId],
    references: [users.id],
  }),
}));

export const aiPatternSnapshots = pgTable("ai_pattern_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dimension: text("dimension"),
  patternType: text("pattern_type").notNull(),
  patternData: jsonb("pattern_data").notNull(),
  confidence: integer("confidence").default(70),
  evidenceCount: integer("evidence_count").default(1),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiPatternSnapshotsRelations = relations(aiPatternSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [aiPatternSnapshots.userId],
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

export const projectStatusEnum = ["active", "parked", "done"] as const;
export type ProjectStatus = typeof projectStatusEnum[number];

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  dimensionTags: text("dimension_tags").array(),
  isActive: boolean("is_active").default(true),
  status: text("status").$type<ProjectStatus>().default("active"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  /** Short DW-generated one-liner ("where you are") shown on plan cards. */
  summary: text("summary"),
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

// ── Plans Workspace: milestones + artifacts ──────────────────────────────────
export const projectMilestones = pgTable("project_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  doneAt: timestamp("done_at"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectArtifactKindEnum = ["import", "upload", "link"] as const;
export type ProjectArtifactKind = typeof projectArtifactKindEnum[number];

export const projectArtifacts = pgTable("project_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().$type<ProjectArtifactKind>(),
  refId: varchar("ref_id"),
  url: text("url"),
  title: text("title").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  excerpt: text("excerpt"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
});
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;

export const insertProjectArtifactSchema = createInsertSchema(projectArtifacts).omit({
  id: true,
  addedAt: true,
});
export type ProjectArtifact = typeof projectArtifacts.$inferSelect;
export type InsertProjectArtifact = z.infer<typeof insertProjectArtifactSchema>;

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
  dataSource: text("data_source").default("user"),
  explainWhy: text("explain_why"),
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
  recurrenceEndDate: text("recurrence_end_date"),
  linkedType: text("linked_type").default("none"),
  linkedId: varchar("linked_id"),
  linkedRoute: text("linked_route"),
  linkedMeta: jsonb("linked_meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEventsRelations = relations(calendarEvents, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  eventTasks: many(calendarEventTasks),
}));

// ── Calendar Event Tasks ───────────────────────────────────────────────────
export const calendarEventTasks = pgTable("calendar_event_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  calendarEventId: varchar("calendar_event_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  dwSuggested: boolean("dw_suggested").default(false),
  linkedRoute: text("linked_route"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEventTasksRelations = relations(calendarEventTasks, ({ one }) => ({
  event: one(calendarEvents, {
    fields: [calendarEventTasks.calendarEventId],
    references: [calendarEvents.id],
  }),
  user: one(users, {
    fields: [calendarEventTasks.userId],
    references: [users.id],
  }),
}));

export const insertCalendarEventTaskSchema = createInsertSchema(calendarEventTasks).omit({
  id: true,
  createdAt: true,
});

export type CalendarEventTask = typeof calendarEventTasks.$inferSelect;
export type InsertCalendarEventTask = z.infer<typeof insertCalendarEventTaskSchema>;

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

export const savedContent = pgTable("saved_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(), // video, article, exercise, blog
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  source: text("source"), // YouTube, Healthline, etc.
  duration: text("duration"), // "5 min read" or "10:32"
  metadata: jsonb("metadata"), // views, channel, publishedAt, etc.
  savedAt: timestamp("saved_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

export const savedContentRelations = relations(savedContent, ({ one }) => ({
  user: one(users, {
    fields: [savedContent.userId],
    references: [users.id],
  }),
}));

export const feedInteractions = pgTable("feed_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentType: text("content_type"), // video, article, exercise, blog
  contentTitle: text("content_title"),
  contentUrl: text("content_url"),
  action: text("action").notNull(), // "not_interested" | "saved" | "scheduled"
  topic: text("topic"), // topic/category for personalization learning
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedInteractionsRelations = relations(feedInteractions, ({ one }) => ({
  user: one(users, {
    fields: [feedInteractions.userId],
    references: [users.id],
  }),
}));

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
  linkedGoalId: varchar("linked_goal_id"),
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

export const systemModules = pgTable("system_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  systemType: text("system_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  settings: jsonb("settings"),
  routineSteps: jsonb("routine_steps"),
  linkedSubsystems: text("linked_subsystems").array(),
  conditionalLogic: jsonb("conditional_logic"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemModulesRelations = relations(systemModules, ({ one }) => ({
  user: one(users, {
    fields: [systemModules.userId],
    references: [users.id],
  }),
}));

export const dailyScheduleEvents = pgTable("daily_schedule_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  endTime: text("end_time"),
  dayOfWeek: integer("day_of_week"),
  systemReference: varchar("system_reference"),
  systemType: text("system_type"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyScheduleEventsRelations = relations(dailyScheduleEvents, ({ one }) => ({
  user: one(users, {
    fields: [dailyScheduleEvents.userId],
    references: [users.id],
  }),
}));

export const userSystemPreferences = pgTable("user_system_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  enabledSystems: text("enabled_systems").array(),
  meditationEnabled: boolean("meditation_enabled").default(false),
  spiritualEnabled: boolean("spiritual_enabled").default(false),
  astrologyEnabled: boolean("astrology_enabled").default(false),
  journalingEnabled: boolean("journaling_enabled").default(true),
  mealContainersEnabled: boolean("meal_containers_enabled").default(true),
  aiRoutingEnabled: boolean("ai_routing_enabled").default(true),
  preferredWakeTime: text("preferred_wake_time"),
  preferredSleepTime: text("preferred_sleep_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSystemPreferencesRelations = relations(userSystemPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userSystemPreferences.userId],
    references: [users.id],
  }),
}));

// Meal Plans - Wave 4 Meal Plan Import
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  summary: text("summary"),
  source: text("source").default("import"),
  importedDocumentId: varchar("imported_document_id"),
  isActive: boolean("is_active").default(true),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [mealPlans.userId],
    references: [users.id],
  }),
  meals: many(meals),
}));

export const meals = pgTable("meals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mealPlanId: varchar("meal_plan_id").references(() => mealPlans.id),
  title: text("title").notNull(),
  mealType: text("meal_type").default("other"),
  weekLabel: text("week_label"),
  tags: text("tags").array(),
  notes: text("notes"),
  ingredients: text("ingredients").array(),
  instructions: text("instructions").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealsRelations = relations(meals, ({ one }) => ({
  user: one(users, {
    fields: [meals.userId],
    references: [users.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [meals.mealPlanId],
    references: [mealPlans.id],
  }),
}));

// Workout Plans - Similar structure to Meal Plans
export const workoutPlans = pgTable("workout_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  summary: text("summary"),
  source: text("source").default("import"),
  importedDocumentId: varchar("imported_document_id"),
  isActive: boolean("is_active").default(true),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutPlans.userId],
    references: [users.id],
  }),
  exercises: many(exercises),
}));

// Exercises - Individual exercises within a workout plan
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  workoutPlanId: varchar("workout_plan_id").references(() => workoutPlans.id),
  title: text("title").notNull(),
  exerciseType: text("exercise_type").default("other"),
  dayLabel: text("day_label"),
  tags: text("tags").array(),
  notes: text("notes"),
  sets: text("sets"),
  reps: text("reps"),
  duration: text("duration"),
  equipment: text("equipment").array(),
  instructions: text("instructions").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exercisesRelations = relations(exercises, ({ one }) => ({
  user: one(users, {
    fields: [exercises.userId],
    references: [users.id],
  }),
  workoutPlan: one(workoutPlans, {
    fields: [exercises.workoutPlanId],
    references: [workoutPlans.id],
  }),
}));

// Workout Sessions - First-class session engine (logging, voice coach, flexible types)
export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  workoutPlanId: varchar("workout_plan_id").references(() => workoutPlans.id),
  title: text("title").notNull(),
  sessionType: text("session_type").default("strength"), // strength | timed | distance | breathwork | mobility | custom
  status: text("status").default("in_progress"), // in_progress | completed | cancelled
  voiceCoachEnabled: boolean("voice_coach_enabled").default(true),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  durationSeconds: integer("duration_seconds"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // flexible extra data (e.g. total volume, distance, heart_rate)
  createdAt: timestamp("created_at").defaultNow(),
});

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutSessions.userId],
    references: [users.id],
  }),
  workoutPlan: one(workoutPlans, {
    fields: [workoutSessions.workoutPlanId],
    references: [workoutPlans.id],
  }),
  steps: many(workoutSessionSteps),
}));

// Workout Session Steps - Logged entry per exercise/step
export const workoutSessionSteps = pgTable("workout_session_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  stepIndex: integer("step_index").notNull(),
  title: text("title").notNull(),
  stepType: text("step_type").notNull(), // strength | timed | distance | breathwork | mobility | custom
  completed: boolean("completed").default(false),
  // Strength fields
  setsCompleted: integer("sets_completed"),
  repsPerSet: text("reps_per_set"), // JSON array e.g. "[10,10,8]"
  weightPerSet: text("weight_per_set"), // JSON array e.g. "[20,20,22.5]"
  // Timed / breathwork fields
  durationSeconds: integer("duration_seconds"),
  // Distance fields
  distanceMeters: real("distance_meters"),
  // Notes / custom
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow(),
}, (t) => ({
  sessionStepUnique: uniqueIndex("workout_session_steps_session_id_step_index_idx").on(t.sessionId, t.stepIndex),
}));

export const workoutSessionStepsRelations = relations(workoutSessionSteps, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [workoutSessionSteps.sessionId],
    references: [workoutSessions.id],
  }),
  user: one(users, {
    fields: [workoutSessionSteps.userId],
    references: [users.id],
  }),
}));

// Birth Charts - Astrology Engine
export const birthCharts = pgTable("birth_charts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  birthDate: text("birth_date").notNull(),
  birthTime: text("birth_time").notNull(),
  birthCity: text("birth_city").notNull(),
  birthState: text("birth_state"),
  birthCountry: text("birth_country").notNull(),
  timezone: text("timezone").notNull(),
  daylightSavings: boolean("daylight_savings").default(false),
  zodiacSystem: text("zodiac_system").default("tropical"),
  houseSystem: text("house_system").default("placidus"),
  placements: jsonb("placements"),
  aspects: jsonb("aspects"),
  interpretations: jsonb("interpretations"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const birthChartsRelations = relations(birthCharts, ({ one }) => ({
  user: one(users, {
    fields: [birthCharts.userId],
    references: [users.id],
  }),
}));

// Meal Prep Preferences - User settings for meal prep patterns
export const mealPrepPreferences = pgTable("meal_prep_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  weekdayPrepEnabled: boolean("weekday_prep_enabled").default(true),
  prepDays: text("prep_days").array().default(sql`ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']`),
  freshDays: text("fresh_days").array().default(sql`ARRAY['saturday', 'sunday']`),
  autoGenerateShoppingList: boolean("auto_generate_shopping_list").default(true),
  defaultServings: integer("default_servings").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mealPrepPreferencesRelations = relations(mealPrepPreferences, ({ one }) => ({
  user: one(users, {
    fields: [mealPrepPreferences.userId],
    references: [users.id],
  }),
}));

// Shopping Lists
export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  mealPlanId: varchar("meal_plan_id").references(() => mealPlans.id),
  weekLabel: text("week_label"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  user: one(users, {
    fields: [shoppingLists.userId],
    references: [users.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [shoppingLists.mealPlanId],
    references: [mealPlans.id],
  }),
  items: many(shoppingListItems),
}));

// Shopping List Items
export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shoppingListId: varchar("shopping_list_id").notNull().references(() => shoppingLists.id),
  ingredient: text("ingredient").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  category: text("category").default("other"),
  sourceMealId: varchar("source_meal_id"),
  isChecked: boolean("is_checked").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, {
    fields: [shoppingListItems.shoppingListId],
    references: [shoppingLists.id],
  }),
}));

// Imported Documents - Wave 3 Document Intelligence
export const importedDocuments = pgTable("imported_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  rawText: text("raw_text"),
  analysisJson: jsonb("analysis_json"),
  documentTitle: text("document_title"),
  summary: text("summary"),
  confidence: integer("confidence"),
  status: text("status").default("pending"),
  extractionMethod: text("extraction_method"),
  ocrConfidence: integer("ocr_confidence"),
  errorMessage: text("error_message"),
  primaryCategory: text("primary_category"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  savedAt: timestamp("saved_at"),
});

export const importedDocumentsRelations = relations(importedDocuments, ({ one, many }) => ({
  user: one(users, {
    fields: [importedDocuments.userId],
    references: [users.id],
  }),
  items: many(importedDocumentItems),
}));

export const importedDocumentItems = pgTable("imported_document_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => importedDocuments.id),
  itemType: text("item_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  details: jsonb("details"),
  destinationSystem: text("destination_system"),
  confidence: integer("confidence"),
  isSelected: boolean("is_selected").default(true),
  linkedEntityId: varchar("linked_entity_id"),
  linkedEntityType: text("linked_entity_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const importedDocumentItemsRelations = relations(importedDocumentItems, ({ one }) => ({
  document: one(importedDocuments, {
    fields: [importedDocumentItems.documentId],
    references: [importedDocuments.id],
  }),
}));

// ── Relationships: people, interactions, aliveness moments ─────────────────
// The "Social Environment" pillar: track the actual people in your life,
// categorize them (aligned / neutral / draining / growth), log how each
// interaction left you, and capture aliveness moments so the AI can use
// real social context — not just abstract dimension scores.
export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  // family | partner | close-friend | friend | coworker | mentor | acquaintance | other
  relationship: text("relationship").default("friend"),
  // aligned | neutral | draining | growth
  category: text("category").default("neutral"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  // Free-form so users can record "March 14" without a year if they want
  birthday: text("birthday"),
  // Target days between contact (e.g. 7 = weekly). null → no target.
  contactFrequencyDays: integer("contact_frequency_days"),
  lastInteractionAt: timestamp("last_interaction_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const peopleInteractions = pgTable("people_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  personId: varchar("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  // in-person | call | text | video | group | other
  kind: text("kind").default("in-person"),
  // Energy after the interaction: -2..+2 (heavier ↔ lighter)
  energyAfter: integer("energy_after"),
  // Clarity after: -2..+2 (confused ↔ clear)
  clarityAfter: integer("clarity_after"),
  // Self alignment after: -2..+2 (less like myself ↔ more like myself)
  selfAfter: integer("self_after"),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const peopleRelations = relations(people, ({ one, many }) => ({
  user: one(users, {
    fields: [people.userId],
    references: [users.id],
  }),
  interactions: many(peopleInteractions),
}));

export const peopleInteractionsRelations = relations(peopleInteractions, ({ one }) => ({
  user: one(users, {
    fields: [peopleInteractions.userId],
    references: [users.id],
  }),
  person: one(people, {
    fields: [peopleInteractions.personId],
    references: [people.id],
  }),
}));

export const alivenessMoments = pgTable("aliveness_moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  // 1..5: small spark ↔ deeply alive
  alivenessLevel: integer("aliveness_level").default(3),
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alivenessMomentsRelations = relations(alivenessMoments, ({ one }) => ({
  user: one(users, {
    fields: [alivenessMoments.userId],
    references: [users.id],
  }),
}));

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
  createdAt: true,
});
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof people.$inferSelect;

export const insertPeopleInteractionSchema = createInsertSchema(peopleInteractions).omit({
  id: true,
  createdAt: true,
});
export type InsertPeopleInteraction = z.infer<typeof insertPeopleInteractionSchema>;
export type PeopleInteraction = typeof peopleInteractions.$inferSelect;

export const insertAlivenessMomentSchema = createInsertSchema(alivenessMoments).omit({
  id: true,
  createdAt: true,
});
export type InsertAlivenessMoment = z.infer<typeof insertAlivenessMomentSchema>;
export type AlivenessMoment = typeof alivenessMoments.$inferSelect;

// ── Boundaries / repairs / appreciations ─────────────────────────────────────
// "I don't discuss X with mom" — a soft per-person rule the user wants to keep
export const relationshipBoundaries = pgTable("relationship_boundaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  personId: varchar("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  rule: text("rule").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// An open issue with a planned action ("write apology by Friday")
export const relationshipRepairs = pgTable("relationship_repairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  personId: varchar("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  issue: text("issue").notNull(),
  plannedAction: text("planned_action"),
  dueDate: timestamp("due_date"),
  // open | done | dropped
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// "Mom called for no reason" — small positive moments
export const relationshipAppreciations = pgTable("relationship_appreciations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  personId: varchar("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Family / shared hub ──────────────────────────────────────────────────────
export const peopleGroups = pgTable("people_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  // household | core-family | couple | friends | other
  kind: text("kind").default("other"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const peopleGroupMembers = pgTable("people_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => peopleGroups.id, { onDelete: "cascade" }),
  personId: varchar("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  // If the group spans linked app users, the partnerUserId points to the other DW user
  partnerUserId: varchar("partner_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shared rule, event, or appreciation visible to everyone in the group
export const groupSharedItems = pgTable("group_shared_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => peopleGroups.id, { onDelete: "cascade" }),
  authorUserId: varchar("author_user_id").notNull().references(() => users.id),
  // rule | event | appreciation | note
  kind: text("kind").notNull().default("note"),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── DW-generated insights cache ──────────────────────────────────────────────
export const relationshipInsights = pgTable("relationship_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  // distance | birthday | unresolved | streak | suggestion
  kind: text("kind").notNull(),
  personId: varchar("person_id").references(() => people.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").references(() => peopleGroups.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  // optional CTA hint for UI ({ tab: "crm", personId: "..." })
  cta: jsonb("cta"),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRelationshipBoundarySchema = createInsertSchema(relationshipBoundaries).omit({ id: true, createdAt: true });
export type InsertRelationshipBoundary = z.infer<typeof insertRelationshipBoundarySchema>;
export type RelationshipBoundary = typeof relationshipBoundaries.$inferSelect;

export const insertRelationshipRepairSchema = createInsertSchema(relationshipRepairs).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertRelationshipRepair = z.infer<typeof insertRelationshipRepairSchema>;
export type RelationshipRepair = typeof relationshipRepairs.$inferSelect;

export const insertRelationshipAppreciationSchema = createInsertSchema(relationshipAppreciations).omit({ id: true, createdAt: true });
export type InsertRelationshipAppreciation = z.infer<typeof insertRelationshipAppreciationSchema>;
export type RelationshipAppreciation = typeof relationshipAppreciations.$inferSelect;

export const insertPeopleGroupSchema = createInsertSchema(peopleGroups).omit({ id: true, createdAt: true });
export type InsertPeopleGroup = z.infer<typeof insertPeopleGroupSchema>;
export type PeopleGroup = typeof peopleGroups.$inferSelect;

export const insertPeopleGroupMemberSchema = createInsertSchema(peopleGroupMembers).omit({ id: true, createdAt: true });
export type InsertPeopleGroupMember = z.infer<typeof insertPeopleGroupMemberSchema>;
export type PeopleGroupMember = typeof peopleGroupMembers.$inferSelect;

export const insertGroupSharedItemSchema = createInsertSchema(groupSharedItems).omit({ id: true, createdAt: true });
export type InsertGroupSharedItem = z.infer<typeof insertGroupSharedItemSchema>;
export type GroupSharedItem = typeof groupSharedItems.$inferSelect;

export const insertRelationshipInsightSchema = createInsertSchema(relationshipInsights).omit({ id: true, createdAt: true });
export type InsertRelationshipInsight = z.infer<typeof insertRelationshipInsightSchema>;
export type RelationshipInsight = typeof relationshipInsights.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  oauthProvider: true,
  oauthId: true,
}).partial({ password: true, oauthProvider: true, oauthId: true });

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

export const insertAiSyncSessionSchema = createInsertSchema(aiSyncSessions).omit({
  id: true,
  startedAt: true,
});

export const insertAiSyncItemSchema = createInsertSchema(aiSyncItems).omit({
  id: true,
  createdAt: true,
});

export const insertInteractionEventSchema = createInsertSchema(interactionEvents).omit({
  id: true,
  createdAt: true,
});

export const insertAiPatternSnapshotSchema = createInsertSchema(aiPatternSnapshots).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertWellnessBlueprintSchema = createInsertSchema(wellnessBlueprints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strict, partial update schema for PATCH /api/blueprint. Omits userId (always
// sourced from the session, never the body) and rejects unknown fields so a
// caller cannot overwrite columns we don't intend to expose.
export const wellnessBlueprintUpdateSchema = insertWellnessBlueprintSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const insertBaselineProfileSchema = createInsertSchema(baselineProfiles).omit({
  id: true,
});

// Strict, partial update schema for upsert on POST /api/blueprint/baseline.
// Omits blueprintId (always derived server-side from the session's blueprint).
export const baselineProfileUpdateSchema = insertBaselineProfileSchema
  .omit({ blueprintId: true })
  .partial()
  .strict();

export const insertStressSignalsSchema = createInsertSchema(stressSignals).omit({
  id: true,
});

// Strict, partial update schema for upsert on POST /api/blueprint/signals.
export const stressSignalsUpdateSchema = insertStressSignalsSchema
  .omit({ blueprintId: true })
  .partial()
  .strict();

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

// Strict, partial update schema for PATCH /api/profile. Drops userId (always
// taken from session) and rejects unknown fields so the body cannot smuggle in
// columns we don't intend to expose now or in the future.
export const userProfileUpdateSchema = insertUserProfileSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const insertWellnessContentSchema = createInsertSchema(wellnessContent).omit({
  id: true,
  createdAt: true,
});

export const insertSavedContentSchema = createInsertSchema(savedContent).omit({
  id: true,
  savedAt: true,
});

export const insertFeedInteractionSchema = createInsertSchema(feedInteractions).omit({
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

export const insertSystemModuleSchema = createInsertSchema(systemModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyScheduleEventSchema = createInsertSchema(dailyScheduleEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUserSystemPreferencesSchema = createInsertSchema(userSystemPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strict, partial update schema for PATCH /api/system-preferences.
export const userSystemPreferencesUpdateSchema = insertUserSystemPreferencesSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  activatedAt: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  createdAt: true,
});

export const insertMealPrepPreferencesSchema = createInsertSchema(mealPrepPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({
  id: true,
  createdAt: true,
  activatedAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertWorkoutSessionStepSchema = createInsertSchema(workoutSessionSteps).omit({
  id: true,
  loggedAt: true,
});

export const insertBirthChartSchema = createInsertSchema(birthCharts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  createdAt: true,
});

export const insertImportedDocumentSchema = createInsertSchema(importedDocuments).omit({
  id: true,
  createdAt: true,
  savedAt: true,
});

// Wave 4 Import Parser Schemas
export const ImportMealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
]);

export const CalendarRecurrenceSchema = z.object({
  frequency: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  until: z.string().optional(),
}).optional();

export const ImportMealSchema = z.object({
  id: z.string().min(1),
  type: z.literal("meal"),
  title: z.string().min(1),
  mealType: ImportMealTypeSchema.default("other"),
  weekLabel: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  isSelected: z.boolean().default(true),
});

export const ImportRoutineStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("routine_step"),
  text: z.string().min(1),
  notes: z.string().optional(),
});

export const ImportRoutineSchema = z.object({
  title: z.string().min(1).default("Meal Prep Routine"),
  steps: z.array(ImportRoutineStepSchema).default([]),
});

export const ImportCalendarSuggestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("calendar_suggestion"),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive().default(60),
  suggestedStart: z.string().optional(),
  recurrence: CalendarRecurrenceSchema,
  notes: z.string().optional(),
  linkedSystem: z.enum(["nutrition", "workouts", "routines", "none"]).default("none"),
  linkedId: z.string().optional(),
  isSelected: z.boolean().default(true),
});

export const Wave4ImportSchema = z.object({
  planTitle: z.string().min(1).default("Imported Plan"),
  summary: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.75),
  meals: z.array(ImportMealSchema).default([]),
  routine: ImportRoutineSchema.default({ title: "Meal Prep Routine", steps: [] }),
  calendarSuggestions: z.array(ImportCalendarSuggestionSchema).default([]),
  questions: z.array(z.string()).max(3).optional(),
});

export type Wave4Import = z.infer<typeof Wave4ImportSchema>;
export type ImportMeal = z.infer<typeof ImportMealSchema>;
export type ImportRoutineStep = z.infer<typeof ImportRoutineStepSchema>;
export type ImportCalendarSuggestion = z.infer<typeof ImportCalendarSuggestionSchema>;

export const insertImportedDocumentItemSchema = createInsertSchema(importedDocumentItems).omit({
  id: true,
  createdAt: true,
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokenHash: varchar("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
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

export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id"),
  category: text("category").notNull(),
  message: text("message").notNull(),
  pageContext: text("page_context"),
  energyLevel: text("energy_level"),
  status: text("status").default("new"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  user: one(users, {
    fields: [userFeedback.userId],
    references: [users.id],
  }),
}));

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const weeklyFeedbackResponses = pgTable("weekly_feedback_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id"),
  weekNumber: integer("week_number").notNull(),
  status: text("status").default("draft"),
  answers: jsonb("answers"),
  trialStartAt: timestamp("trial_start_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const weeklyFeedbackResponsesRelations = relations(weeklyFeedbackResponses, ({ one }) => ({
  user: one(users, {
    fields: [weeklyFeedbackResponses.userId],
    references: [users.id],
  }),
}));

export const insertWeeklyFeedbackResponseSchema = createInsertSchema(weeklyFeedbackResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Mood Check-ins - Daily mood tracking with word-based moods
export const dailyMoodCheckins = pgTable("daily_mood_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id"),
  date: text("date").notNull(), // YYYY-MM-DD format
  timeOfDay: text("time_of_day").notNull(), // morning, afternoon, evening
  mood: text("mood").notNull(), // calm, anxious, energized, tired, hopeful, overwhelmed, etc.
  customNote: text("custom_note"), // Optional custom expression
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyMoodCheckinsRelations = relations(dailyMoodCheckins, ({ one }) => ({
  user: one(users, {
    fields: [dailyMoodCheckins.userId],
    references: [users.id],
  }),
}));

export const insertDailyMoodCheckinSchema = createInsertSchema(dailyMoodCheckins).omit({
  id: true,
  createdAt: true,
});

// Activity Completions - Track whether user completed scheduled activities
export const activityCompletions = pgTable("activity_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id"),
  date: text("date").notNull(), // YYYY-MM-DD format
  activityTitle: text("activity_title").notNull(),
  activityId: varchar("activity_id"), // Reference to plan item if applicable
  switchId: text("switch_id"), // Which life dimension this relates to
  completed: boolean("completed").notNull().default(false),
  skippedReason: text("skipped_reason"), // Optional reason if skipped
  scheduledTime: text("scheduled_time"), // When it was scheduled
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityCompletionsRelations = relations(activityCompletions, ({ one }) => ({
  user: one(users, {
    fields: [activityCompletions.userId],
    references: [users.id],
  }),
}));

export const insertActivityCompletionSchema = createInsertSchema(activityCompletions).omit({
  id: true,
  createdAt: true,
});

// Tracker Settings - User preferences for mood/activity notifications
export const trackerSettings = pgTable("tracker_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id"),
  moodCheckinsEnabled: boolean("mood_checkins_enabled").default(true),
  moodCheckinTimes: text("mood_checkin_times").array(), // e.g., ["09:00", "14:00", "20:00"]
  activityRemindersEnabled: boolean("activity_reminders_enabled").default(true),
  reminderMinutesBefore: integer("reminder_minutes_before").default(15),
  dailySynopsisEnabled: boolean("daily_synopsis_enabled").default(true),
  dailySynopsisTime: text("daily_synopsis_time").default("21:00"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackerSettingsRelations = relations(trackerSettings, ({ one }) => ({
  user: one(users, {
    fields: [trackerSettings.userId],
    references: [users.id],
  }),
}));

export const insertTrackerSettingsSchema = createInsertSchema(trackerSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Wearable Device Integration
export const wearableDevices = pgTable("wearable_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceType: text("device_type").notNull(), // smartwatch, smart-ring, fitness-tracker
  deviceName: text("device_name"),
  manufacturer: text("manufacturer"),
  isActive: boolean("is_active").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  // Wearable Manager fields:
  source: text("source"), // apple_health | screen_time | whoop | oura | garmin
  // OAuth tokens are encrypted at rest via server/routes/_encryption.ts
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wearableDevicesRelations = relations(wearableDevices, ({ one, many }) => ({
  user: one(users, {
    fields: [wearableDevices.userId],
    references: [users.id],
  }),
  data: many(wearableData),
}));

export const wearableData = pgTable("wearable_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().references(() => wearableDevices.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  heartRate: integer("heart_rate"),
  stressLevel: integer("stress_level"), // 0-100
  sleepQuality: integer("sleep_quality"), // 0-100
  activityLevel: integer("activity_level"), // 0-100
  hrvScore: integer("hrv_score"), // Heart Rate Variability
  detectedMood: text("detected_mood"), // calm, energetic, stressed, focused, relaxed
  biometricData: jsonb("biometric_data"), // Additional data
  // Wearable Manager fields (Apple Health / Whoop / Oura / Garmin ingest):
  source: text("source"), // apple_health | screen_time | whoop | oura | garmin
  sourceRecordId: text("source_record_id"), // for dedup across re-imports
  metricKind: text("metric_kind"), // steps | sleep_minutes | hrv | resting_hr | active_energy
  metricValue: real("metric_value"), // numeric value for the metric
  recordedAt: timestamp("recorded_at"), // when the metric occurred (vs ingest time)
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("wearable_data_user_source_record_idx").on(
    t.userId,
    t.source,
    t.sourceRecordId,
  ),
]);

export const wearableDataRelations = relations(wearableData, ({ one }) => ({
  device: one(wearableDevices, {
    fields: [wearableData.deviceId],
    references: [wearableDevices.id],
  }),
  user: one(users, {
    fields: [wearableData.userId],
    references: [users.id],
  }),
}));

export const astrologyPredictions = pgTable("astrology_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  date: timestamp("date").notNull(),
  moonPhase: text("moon_phase"),
  celestialEvents: jsonb("celestial_events"),
  energyLevel: integer("energy_level"), // 1-10
  moodAlignment: text("mood_alignment"),
  personalizedInsights: text("personalized_insights"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const astrologyPredictionsRelations = relations(astrologyPredictions, ({ one }) => ({
  user: one(users, {
    fields: [astrologyPredictions.userId],
    references: [users.id],
  }),
}));

export const insertWearableDeviceSchema = createInsertSchema(wearableDevices).omit({
  id: true,
  createdAt: true,
});

export const insertWearableDataSchema = createInsertSchema(wearableData).omit({
  id: true,
  createdAt: true,
});

export const insertAstrologyPredictionSchema = createInsertSchema(astrologyPredictions).omit({
  id: true,
  createdAt: true,
});

// ========================================
// NEW TABLES FOR DW.AI RESTRUCTURE - PHASE 1
// ========================================

// Dimension Blueprints - per-dimension values
export const dimensionBlueprints = pgTable("dimension_blueprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dimension: text("dimension").notNull(), // "body" | "mind" | "time" | "purpose" | "money" | "relationships" | "environment" | "identity"
  whenAtMyBest: text("when_at_my_best"), // Vision - what thriving looks like
  whatIStandFor: text("what_i_stand_for").array(), // Values/principles for this dimension
  howThisSupportsMe: text("how_this_supports_me").array(), // Tools - how to use this dimension
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDimensionBlueprintSchema = createInsertSchema(dimensionBlueprints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Reset Protocol - global recovery section
export const resetProtocol = pgTable("reset_protocol", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  redFlags: text("red_flags").array(), // Early warning signs
  howIReset: text("how_i_reset").array(), // Tools & actions to get back on track
  whenThingsGetHard: text("when_things_get_hard").array(), // Plan for tough days
  mySupportSystem: jsonb("my_support_system"), // People & resources (name, relationship, contact)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResetProtocolSchema = createInsertSchema(resetProtocol).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Patterns - AI pattern tracking
export const userPatterns = pgTable("user_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  patternType: text("pattern_type"), // "emotional" | "behavioral" | "slip_up" | "win" | "recurring_topic"
  description: text("description"),
  frequency: integer("frequency").default(1),
  lastOccurrence: timestamp("last_occurrence"),
  sentiment: text("sentiment"), // "positive" | "negative" | "neutral"
  relatedDimension: text("related_dimension"), // which of 8 dimensions
  aiNotes: text("ai_notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserPatternSchema = createInsertSchema(userPatterns).omit({
  id: true,
  createdAt: true,
});

// Universal Tracking Logs
export const trackingLogs = pgTable("tracking_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  trackingType: text("tracking_type").notNull(), // "water" | "sleep" | "screen_time" | "weight" | "custom"
  value: text("value").notNull(),
  unit: text("unit"), // "oz" | "hours" | "minutes" | "lbs" | custom
  notes: text("notes"),
  relatedDimension: text("related_dimension"), // which of 8 dimensions
  loggedAt: timestamp("logged_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrackingLogSchema = createInsertSchema(trackingLogs).omit({
  id: true,
  createdAt: true,
});

// Meal Logs - photo + manual calorie tracking
export const mealLogs = pgTable("meal_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mealPlanId: varchar("meal_plan_id").references(() => mealPlans.id), // optional link to plan
  mealType: text("meal_type"), // "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout"
  title: text("title"),
  photoUrl: text("photo_url"), // if photo was taken
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fat: integer("fat"),
  items: jsonb("items"), // array of detected/entered food items
  aiAnalysis: text("ai_analysis"), // AI notes about the meal
  loggedAt: timestamp("logged_at").defaultNow(),
  scheduledTime: text("scheduled_time"), // when it was supposed to be eaten
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMealLogSchema = createInsertSchema(mealLogs).omit({
  id: true,
  createdAt: true,
});

// Water Logs
export const waterLogs = pgTable("water_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // in oz
  loggedAt: timestamp("logged_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWaterLogSchema = createInsertSchema(waterLogs).omit({
  id: true,
  createdAt: true,
});

// ========================================
// PR #3: FEATURES & INTELLIGENCE - NEW TABLES
// ========================================

// Life Dimension Assessments - track assessment scores for 8 life dimensions
export const lifeDimensionAssessments = pgTable("life_dimension_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dimension: text("dimension").notNull(), // "physical" | "mental" | "social" | "spiritual" | "financial" | "occupational" | "environmental" | "intellectual"
  score: real("score").notNull(), // 1-5 scale
  answers: jsonb("answers"), // Store all assessment responses
  assessedAt: timestamp("assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLifeDimensionAssessmentSchema = createInsertSchema(lifeDimensionAssessments).omit({
  id: true,
  createdAt: true,
});

// Dimension Systems - frameworks/systems within each life dimension
export const dimensionSystems = pgTable("dimension_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dimension: text("dimension").notNull(), // Which dimension this belongs to
  name: text("name").notNull(),
  description: text("description"),
  components: text("components").array(), // Key components of this system
  relatedGoals: text("related_goals").array(), // Goal IDs
  relatedRoutines: text("related_routines").array(), // Routine IDs
  relatedHabits: text("related_habits").array(), // Habit IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDimensionSystemSchema = createInsertSchema(dimensionSystems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strict, partial update schema for PATCH /api/dimension-systems/:id.
export const dimensionSystemUpdateSchema = insertDimensionSystemSchema
  .omit({ userId: true })
  .partial()
  .strict();

// Wellness Preferences - user's spiritual/wellness preferences
export const wellnessPreferences = pgTable("wellness_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  beliefSystem: text("belief_system"), // "religious" | "spiritual" | "secular" | "prefer_not_say"
  traditions: text("traditions").array(), // ["Christianity", "Buddhism", etc.]
  otherTradition: text("other_tradition"),
  meditationEnabled: boolean("meditation_enabled").default(true),
  journalEnabled: boolean("journal_enabled").default(true),
  astrologyEnabled: boolean("astrology_enabled").default(false),
  tarotEnabled: boolean("tarot_enabled").default(false),
  energyWorkEnabled: boolean("energy_work_enabled").default(false),
  // Cosmic consent: whether to include astrology/numerology data in DW AI guidance
  useAstrologyInGuidance: boolean("use_astrology_in_guidance").default(false),
  useNumerologyInGuidance: boolean("use_numerology_in_guidance").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWellnessPreferencesSchema = createInsertSchema(wellnessPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strict, partial update schema for PATCH /api/wellness-preferences/:id.
// userId is enforced by the authenticated session, never the body.
// (PATCH /api/cosmic/consent uses its own narrower inline schema since it
// only ever accepts the two consent booleans.)
export const wellnessPreferencesUpdateSchema = insertWellnessPreferencesSchema
  .omit({ userId: true })
  .partial()
  .strict();

// User Values & Rules - unified source of truth for dietary, movement, belief, and life constraints
export const userValuesRules = pgTable("user_values_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  // Food rules
  faithDietaryExclusions: text("faith_dietary_exclusions").array(), // halal, kosher, no pork, no beef, fasting, vegan-by-faith, etc.
  strongFoodDislikes: text("strong_food_dislikes").array(),
  mealBudgetLevel: text("meal_budget_level"), // "budget" | "moderate" | "flexible"
  maxMealPrepTimeMin: integer("max_meal_prep_time_min"),
  // Movement rules
  movementEnvironment: text("movement_environment").array(), // outdoor, indoor, gym, home, water
  accessibilityNeeds: text("accessibility_needs").array(), // seated, low-impact, adaptive, etc.
  // Life/state constraints
  sensoryNeeds: text("sensory_needs"),
  fixedScheduleNotes: text("fixed_schedule_notes"),
  reminderStyle: text("reminder_style"), // "gentle" | "regular" | "proactive"
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserValuesRulesSchema = createInsertSchema(userValuesRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strict, partial update schema for PATCH /api/user-values-rules/:id.
export const userValuesRulesUpdateSchema = insertUserValuesRulesSchema
  .omit({ userId: true })
  .partial()
  .strict();

// Feature Settings - user's enabled/disabled features
export const featureSettings = pgTable("feature_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  householdTasksEnabled: boolean("household_tasks_enabled").default(false),
  householdTasksSuggested: boolean("household_tasks_suggested").default(false),
  householdTasksDismissed: boolean("household_tasks_dismissed").default(false),
  financialToolsEnabled: boolean("financial_tools_enabled").default(false),
  advancedAnalyticsEnabled: boolean("advanced_analytics_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureSettingsSchema = createInsertSchema(featureSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strict, partial update schema for PATCH /api/feature-settings/:id.
export const featureSettingsUpdateSchema = insertFeatureSettingsSchema
  .omit({ userId: true })
  .partial()
  .strict();

// Household Cleaning Schedule
export const householdCleaningTasks = pgTable("household_cleaning_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  room: text("room").notNull(), // "kitchen" | "bathroom" | "bedroom" | "living_room" | "other"
  taskName: text("task_name").notNull(),
  frequency: text("frequency").notNull(), // "daily" | "weekly" | "monthly"
  lastCompleted: timestamp("last_completed"),
  nextDue: timestamp("next_due"),
  isCompleted: boolean("is_completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHouseholdCleaningTaskSchema = createInsertSchema(householdCleaningTasks).omit({
  id: true,
  createdAt: true,
});

// Strict, partial update schema for PATCH /api/household-cleaning-tasks/:id.
export const householdCleaningTaskUpdateSchema = insertHouseholdCleaningTaskSchema
  .omit({ userId: true })
  .partial()
  .strict();

// Household Laundry Schedule
export const householdLaundrySchedule = pgTable("household_laundry_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  laundryType: text("laundry_type").notNull(), // "clothes" | "towels" | "bedding" | "delicates"
  scheduledDay: text("scheduled_day"), // "monday" | "tuesday" etc.
  lastCompleted: timestamp("last_completed"),
  nextScheduled: timestamp("next_scheduled"),
  reminderEnabled: boolean("reminder_enabled").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHouseholdLaundryScheduleSchema = createInsertSchema(householdLaundrySchedule).omit({
  id: true,
  createdAt: true,
});

// Strict, partial update schema for PATCH /api/household-laundry-schedule/:id.
export const householdLaundryScheduleUpdateSchema = insertHouseholdLaundryScheduleSchema
  .omit({ userId: true })
  .partial()
  .strict();

// AI Feature Usage Tracking - enhanced interaction tracking for AI learning
export const aiFeatureUsage = pgTable("ai_feature_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  featureName: text("feature_name").notNull(), // "workouts" | "meals" | "journal" | "meditation" etc.
  usageCount: integer("usage_count").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  totalTimeSpentSeconds: integer("total_time_spent_seconds").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to support atomic upsert and prevent duplicates
  userFeatureUnique: sql`UNIQUE (user_id, feature_name)`,
}));

export const insertAiFeatureUsageSchema = createInsertSchema(aiFeatureUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// AI Suggestions - track AI-generated suggestions
export const aiSuggestions = pgTable("ai_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  suggestionType: text("suggestion_type").notNull(), // "feature_discovery" | "household_enable" | "contextual_action"
  featureName: text("feature_name"), // Which feature is being suggested
  triggerReason: text("trigger_reason"), // Why this was suggested
  suggestionText: text("suggestion_text").notNull(),
  status: text("status").default("pending"), // "pending" | "accepted" | "dismissed" | "not_now"
  respondedAt: timestamp("responded_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions).omit({
  id: true,
  createdAt: true,
});

// Universal Plans - connects all plan types
export const universalPlans = pgTable("universal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planType: text("plan_type").notNull(), // "workout" | "meal" | "vacation" | "project" | "event" | "learning" | "financial"
  title: text("title").notNull(),
  summary: text("summary"),
  status: text("status").default("active"), // "draft" | "active" | "paused" | "completed" | "archived"
  workoutPlanId: varchar("workout_plan_id").references(() => workoutPlans.id),
  mealPlanId: varchar("meal_plan_id").references(() => mealPlans.id),
  shoppingListId: varchar("shopping_list_id").references(() => shoppingLists.id),
  planData: jsonb("plan_data"), // flexible storage for any plan type
  connectedDimensions: text("connected_dimensions").array(),
  connectedGoalIds: text("connected_goal_ids").array(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUniversalPlanSchema = createInsertSchema(universalPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Completion Status - track what user has completed
export const completionStatus = pgTable("completion_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  bodyScanCompleted: boolean("body_scan_completed").default(false),
  mealPreferencesCompleted: boolean("meal_preferences_completed").default(false),
  blueprintCompletions: jsonb("blueprint_completions"), // { body: true, mind: false, ... }
  resetProtocolCompleted: boolean("reset_protocol_completed").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompletionStatusSchema = createInsertSchema(completionStatus).omit({
  id: true,
  updatedAt: true,
});

// Achievements - unlockable milestones
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementType: text("achievement_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  relatedDimension: text("related_dimension"),
  metadata: jsonb("metadata"),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

// Streaks - tracking consecutive completions
export const streaks = pgTable("streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  streakType: text("streak_type").notNull(), // "habit" | "workout" | "meal_logging" | "water" | "journal"
  relatedId: varchar("related_id"), // habitId, etc.
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastCompletedAt: timestamp("last_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStreakSchema = createInsertSchema(streaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Task Accountability Tracking
export const taskAccountability = pgTable("task_accountability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: varchar("task_id"),
  calendarEventId: varchar("calendar_event_id"),
  taskName: text("task_name").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time"),
  
  // Pre-task commitment
  committedAt: timestamp("committed_at"),
  commitmentResponse: text("commitment_response"), // 'yes', 'remind_later', 'skip'
  
  // Post-task confirmation
  confirmedAt: timestamp("confirmed_at"),
  completionStatus: text("completion_status"), // 'completed', 'partial', 'skipped', 'no_response'
  reflectionNote: text("reflection_note"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskAccountabilityRelations = relations(taskAccountability, ({ one }) => ({
  user: one(users, {
    fields: [taskAccountability.userId],
    references: [users.id],
  }),
}));

export const insertTaskAccountabilitySchema = createInsertSchema(taskAccountability).omit({
  id: true,
  createdAt: true,
});

// Accountability Stats
export const accountabilityStats = pgTable("accountability_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  // Current period stats
  tasksCommitted: integer("tasks_committed").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksPartial: integer("tasks_partial").default(0),
  tasksSkipped: integer("tasks_skipped").default(0),
  
  // Calculated metrics
  followThroughRate: real("follow_through_rate").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastCompletedDate: timestamp("last_completed_date"),
  
  // Stats reset tracking
  lastResetAt: timestamp("last_reset_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountabilityStatsRelations = relations(accountabilityStats, ({ one }) => ({
  user: one(users, {
    fields: [accountabilityStats.userId],
    references: [users.id],
  }),
}));

export const insertAccountabilityStatsSchema = createInsertSchema(accountabilityStats).omit({
  id: true,
});

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  // Notification settings
  accountabilityEnabled: boolean("accountability_enabled").default(true),
  preTaskEnabled: boolean("pre_task_enabled").default(true),
  postTaskEnabled: boolean("post_task_enabled").default(true),
  morningBriefingEnabled: boolean("morning_briefing_enabled").default(true),
  eveningSummaryEnabled: boolean("evening_summary_enabled").default(true),
  
  // Timing preferences
  preTaskMinutes: integer("pre_task_minutes").default(15), // Minutes before task
  morningBriefingTime: text("morning_briefing_time").default("08:00"),
  eveningSummaryTime: text("evening_summary_time").default("21:00"),
  
  // Quiet hours
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: text("quiet_hours_start").default("22:00"),
  quietHoursEnd: text("quiet_hours_end").default("08:00"),

  // Upcoming-reminders panel "look ahead" horizon, in days (0–7).
  // Persisted server-side so the user's preferred preview range follows
  // them across phone, tablet, and desktop. Local storage on the client
  // is used only as a startup hint until this value loads.
  previewDaysAhead: integer("preview_days_ahead").default(0),

  // Daily relationships nudge: when true, the relationship-nudges scheduler
  // sends a single push + inbox card per day for the most urgent overdue
  // contact or open repair across the user's tracked people. Users can mute
  // this from Accountability Settings without affecting other reminders.
  relationshipNudgesEnabled: boolean("relationship_nudges_enabled").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// PUT /api/accountability/preferences accepts a *partial* update from the
// client. We additionally drop `userId` (it always comes from the session, not
// the body) and call `.strict()` so unknown fields cause a 400 instead of
// being silently passed through to `db.update().set(...)` — which would let a
// caller overwrite arbitrary columns now or in the future.
export const notificationPreferencesUpdateSchema = insertNotificationPreferencesSchema
  .omit({ userId: true })
  .partial()
  .strict();

// Singleton VAPID keys row (id = "default") — generated once at server boot
// and reused for the lifetime of the deployment so existing subscriptions
// remain valid across restarts. (The `push_subscriptions` table itself is
// declared further down — see "Push Subscriptions".)
export const vapidKeys = pgTable("vapid_keys", {
  id: varchar("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  subject: text("subject").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Persisted reminder ledger — survives server restarts so we never re-send a
// reminder that was already delivered ("sent" rows) or fire a reminder for a
// task the user already completed/deleted ("cancelled" rows). Rows older than
// 25h are pruned by the scheduler. The unique index lets us upsert without
// races. For "sent" rows, `bucket` is the minute-since-epoch the reminder
// fired in; for "cancelled" rows, `bucket` is always 0.
export const reminderLedger = pgTable("reminder_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  kind: text("kind").notNull(), // "sent" | "cancelled"
  bucket: integer("bucket").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("reminder_ledger_unique_idx").on(t.userId, t.tag, t.kind, t.bucket),
]);

// Scheduler leases – plug-and-play horizontal sharding for the reminder
// scheduler. Each running instance claims one row (slot_index 0..N-1) on boot
// and heartbeats every ~30s. Stale leases (>90s without heartbeat) are
// reclaimed automatically and live instances compact down toward slot 0 so
// the slot space stays densely packed [0..N-1] as servers come and go.
// Exposed via /api/admin/scheduler-slots so operators can see ownership.
export const schedulerLeases = pgTable("scheduler_leases", {
  slotIndex: integer("slot_index").primaryKey(),
  instanceId: varchar("instance_id").notNull().unique(),
  lastHeartbeatAt: timestamp("last_heartbeat_at").defaultNow().notNull(),
});

export type SchedulerLease = typeof schedulerLeases.$inferSelect;

// Monitoring alert dedup — one row per alert type tracking when the cluster
// most recently sent that operator email. Used by the scheduler health monitor
// to coordinate alerts across multiple instances: every live instance runs
// the check, but a conditional UPSERT here ensures only one of them actually
// emails the operator within the cooldown window.
export const monitoringAlerts = pgTable("monitoring_alerts", {
  alertType: varchar("alert_type").primaryKey(),
  lastSentAt: timestamp("last_sent_at").defaultNow().notNull(),
});

export type MonitoringAlert = typeof monitoringAlerts.$inferSelect;

// Conversation Insight Cards – persisted for authenticated users
export const conversationInsights = pgTable("conversation_insights", {
  id: varchar("id").primaryKey(), // client-generated id; ON CONFLICT DO NOTHING prevents duplicate migration uploads
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  source: jsonb("source").notNull(), // InsightSource shape
  pinned: boolean("pinned").default(false),
  pinnedAt: timestamp("pinned_at"),
  hidden: boolean("hidden").default(false),
});

export const conversationInsightsRelations = relations(conversationInsights, ({ one }) => ({
  user: one(users, {
    fields: [conversationInsights.userId],
    references: [users.id],
  }),
}));

export const insertConversationInsightSchema = createInsertSchema(conversationInsights, {
  // Allow the client to supply its own createdAt (preserved for migration dedup);
  // coerce both ISO strings and ms-epoch numbers to a Date.
  createdAt: z.union([z.string(), z.number(), z.date()])
    .optional()
    .transform((v) => (v != null ? (v instanceof Date ? v : new Date(v)) : undefined)),
  // Coerce pinnedAt similarly – null means "clear the pin timestamp"
  pinnedAt: z.union([z.string(), z.number(), z.date(), z.null()])
    .optional()
    .transform((v) => (v != null ? (v instanceof Date ? v : new Date(v)) : null)),
}).omit({
  updatedAt: true,
});

// dwInsights, dwJournalEntries, dwFollowups – see "DW INSIGHT + JOURNAL INTELLIGENCE SYSTEM" section below for canonical definitions.

/**
 * Processing log for idempotency – records the last message index processed
 * per (userId, conversationId) so repeated calls don't generate duplicates.
 */
export const dwConversationProcessingLog = pgTable("dw_conversation_processing_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").notNull(),
  lastProcessedIndex: integer("last_processed_index").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
}, (t) => [
  uniqueIndex("dw_conv_processing_log_user_conv_idx").on(t.userId, t.conversationId),
]);

export const insertDwConversationProcessingLogSchema = createInsertSchema(dwConversationProcessingLog).omit({
  id: true,
  processedAt: true,
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
export type AiSyncSession = typeof aiSyncSessions.$inferSelect;
export type InsertAiSyncSession = z.infer<typeof insertAiSyncSessionSchema>;
export type AiSyncItem = typeof aiSyncItems.$inferSelect;
export type InsertAiSyncItem = z.infer<typeof insertAiSyncItemSchema>;
export type InteractionEvent = typeof interactionEvents.$inferSelect;
export type InsertInteractionEvent = z.infer<typeof insertInteractionEventSchema>;
export type AiPatternSnapshot = typeof aiPatternSnapshots.$inferSelect;
export type InsertAiPatternSnapshot = z.infer<typeof insertAiPatternSnapshotSchema>;
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
export type SavedContent = typeof savedContent.$inferSelect;
export type InsertSavedContent = z.infer<typeof insertSavedContentSchema>;
export type FeedInteraction = typeof feedInteractions.$inferSelect;
export type InsertFeedInteraction = z.infer<typeof insertFeedInteractionSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type BodyScan = typeof bodyScans.$inferSelect;
export type InsertBodyScan = z.infer<typeof insertBodyScanSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type SystemModule = typeof systemModules.$inferSelect;
export type InsertSystemModule = z.infer<typeof insertSystemModuleSchema>;
export type DailyScheduleEvent = typeof dailyScheduleEvents.$inferSelect;
export type InsertDailyScheduleEvent = z.infer<typeof insertDailyScheduleEventSchema>;
export type UserSystemPreferences = typeof userSystemPreferences.$inferSelect;
export type InsertUserSystemPreferences = z.infer<typeof insertUserSystemPreferencesSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type ImportedDocument = typeof importedDocuments.$inferSelect;
export type InsertImportedDocument = z.infer<typeof insertImportedDocumentSchema>;
export type ImportedDocumentItem = typeof importedDocumentItems.$inferSelect;
export type InsertImportedDocumentItem = z.infer<typeof insertImportedDocumentItemSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type MealPrepPreferences = typeof mealPrepPreferences.$inferSelect;
export type InsertMealPrepPreferences = z.infer<typeof insertMealPrepPreferencesSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type WeeklyFeedbackResponse = typeof weeklyFeedbackResponses.$inferSelect;
export type InsertWeeklyFeedbackResponse = z.infer<typeof insertWeeklyFeedbackResponseSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSessionStep = typeof workoutSessionSteps.$inferSelect;
export type InsertWorkoutSessionStep = z.infer<typeof insertWorkoutSessionStepSchema>;
export type BirthChart = typeof birthCharts.$inferSelect;
export type InsertBirthChart = z.infer<typeof insertBirthChartSchema>;
export type DailyMoodCheckin = typeof dailyMoodCheckins.$inferSelect;
export type InsertDailyMoodCheckin = z.infer<typeof insertDailyMoodCheckinSchema>;
export type ActivityCompletion = typeof activityCompletions.$inferSelect;
export type InsertActivityCompletion = z.infer<typeof insertActivityCompletionSchema>;
export type TrackerSettings = typeof trackerSettings.$inferSelect;
export type InsertTrackerSettings = z.infer<typeof insertTrackerSettingsSchema>;
export type WearableDevice = typeof wearableDevices.$inferSelect;
export type InsertWearableDevice = z.infer<typeof insertWearableDeviceSchema>;
export type WearableData = typeof wearableData.$inferSelect;
export type InsertWearableData = z.infer<typeof insertWearableDataSchema>;
export type AstrologyPrediction = typeof astrologyPredictions.$inferSelect;
export type InsertAstrologyPrediction = z.infer<typeof insertAstrologyPredictionSchema>;
export type DimensionBlueprint = typeof dimensionBlueprints.$inferSelect;
export type InsertDimensionBlueprint = z.infer<typeof insertDimensionBlueprintSchema>;
export type ResetProtocol = typeof resetProtocol.$inferSelect;
export type InsertResetProtocol = z.infer<typeof insertResetProtocolSchema>;
export type UserPattern = typeof userPatterns.$inferSelect;
export type InsertUserPattern = z.infer<typeof insertUserPatternSchema>;
export type TrackingLog = typeof trackingLogs.$inferSelect;
export type InsertTrackingLog = z.infer<typeof insertTrackingLogSchema>;
export type MealLog = typeof mealLogs.$inferSelect;
export type InsertMealLog = z.infer<typeof insertMealLogSchema>;
export type WaterLog = typeof waterLogs.$inferSelect;
export type InsertWaterLog = z.infer<typeof insertWaterLogSchema>;
export type UniversalPlan = typeof universalPlans.$inferSelect;
export type InsertUniversalPlan = z.infer<typeof insertUniversalPlanSchema>;
export type CompletionStatus = typeof completionStatus.$inferSelect;
export type InsertCompletionStatus = z.infer<typeof insertCompletionStatusSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type TaskAccountability = typeof taskAccountability.$inferSelect;
export type InsertTaskAccountability = z.infer<typeof insertTaskAccountabilitySchema>;
export type AccountabilityStats = typeof accountabilityStats.$inferSelect;
export type InsertAccountabilityStats = z.infer<typeof insertAccountabilityStatsSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type VapidKeys = typeof vapidKeys.$inferSelect;
export type LifeDimensionAssessment = typeof lifeDimensionAssessments.$inferSelect;
export type InsertLifeDimensionAssessment = z.infer<typeof insertLifeDimensionAssessmentSchema>;
export type DimensionSystem = typeof dimensionSystems.$inferSelect;
export type InsertDimensionSystem = z.infer<typeof insertDimensionSystemSchema>;
export type WellnessPreferences = typeof wellnessPreferences.$inferSelect;
export type InsertWellnessPreferences = z.infer<typeof insertWellnessPreferencesSchema>;
export type UserValuesRules = typeof userValuesRules.$inferSelect;
export type InsertUserValuesRules = z.infer<typeof insertUserValuesRulesSchema>;
export type FeatureSettings = typeof featureSettings.$inferSelect;
export type InsertFeatureSettings = z.infer<typeof insertFeatureSettingsSchema>;
export type HouseholdCleaningTask = typeof householdCleaningTasks.$inferSelect;
export type InsertHouseholdCleaningTask = z.infer<typeof insertHouseholdCleaningTaskSchema>;
export type HouseholdLaundrySchedule = typeof householdLaundrySchedule.$inferSelect;
export type InsertHouseholdLaundrySchedule = z.infer<typeof insertHouseholdLaundryScheduleSchema>;
export type AiFeatureUsage = typeof aiFeatureUsage.$inferSelect;
export type InsertAiFeatureUsage = z.infer<typeof insertAiFeatureUsageSchema>;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAiSuggestion = z.infer<typeof insertAiSuggestionSchema>;
export type ConversationInsight = typeof conversationInsights.$inferSelect;
export type InsertConversationInsight = z.infer<typeof insertConversationInsightSchema>;

// ========================================
// PR #2: DW INSIGHT + JOURNAL INTELLIGENCE SYSTEM
// ========================================

// DW Insights – AI-generated structured insight records from conversations
export const dwInsights = pgTable("dw_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  insightLine: text("insight_line"),           // punchy 1-line insight statement
  quotes: jsonb("quotes"),                      // string[] – 3–7 direct quotes from conversation
  theme: text("theme"),                         // primary theme string
  tags: jsonb("tags"),                          // string[] – theme tags
  switchTag: text("switch_tag"),               // optional wellness dimension tag
  sourceConversationId: varchar("source_conversation_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dwInsightsRelations = relations(dwInsights, ({ one }) => ({
  user: one(users, {
    fields: [dwInsights.userId],
    references: [users.id],
  }),
}));

export const insertDwInsightSchema = createInsertSchema(dwInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// DW Journal Entries – AI-generated narrative journal stories from conversations
// Also used by the Mood Tracker journal-on-mood prompt flow: when a user logs a
// low mood (≤4), the answers to the 3 reflection prompts are saved here with
// `moodLogId` set to link the journal entry back to the originating mood log.
export const dwJournalEntries = pgTable("dw_journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  story: text("story").notNull(),               // narrative journal entry
  quotes: jsonb("quotes"),                      // string[] – quotes included in story
  tags: jsonb("tags"),                          // string[] – theme tags
  sourceConversationId: varchar("source_conversation_id"),
  // Nullable FK back to the mood log that triggered this journal entry (for
  // journal-on-mood reflections). Existing AI-generated entries leave this null.
  moodLogId: varchar("mood_log_id").references(() => moodLogs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mood Insights – cached correlation results for the Mood Tracker → Correlations
// tab. Recomputed daily (or on-demand via /api/mood/insights/refresh) by the
// server-side correlation engine in `server/mood-insights.ts`. Each row is a
// single "X is correlated with your mood" fact with an effect size + sample
// size + computed timestamp.
export const moodInsights = pgTable("mood_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Stable factor key, e.g. "habit:abc123", "trigger_event", "meditation",
  // "sleep_hours", "habit_count". Used as the upsert dedupe key per user.
  factor: text("factor").notNull(),
  // Human-readable label shown to the user, e.g. "Days you meditate".
  label: text("label").notNull(),
  // Effect size on mood (1-10 scale). Positive = mood improves, negative = drops.
  effect: real("effect").notNull(),
  // Number of paired data points used in the computation.
  sampleSize: integer("sample_size").notNull(),
  // Pearson r (-1..1) for diagnostic / confidence display.
  correlation: real("correlation"),
  // "low" | "medium" | "high" – computed from |r| + sample size.
  confidence: text("confidence").notNull(),
  // Optional one-line plain-English explanation, e.g.
  // "your mood is +1.3 on days you meditate".
  description: text("description"),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mood_insights_user_factor_idx").on(t.userId, t.factor),
]);

export const moodInsightsRelations = relations(moodInsights, ({ one }) => ({
  user: one(users, {
    fields: [moodInsights.userId],
    references: [users.id],
  }),
}));

export const insertMoodInsightSchema = createInsertSchema(moodInsights).omit({
  id: true,
  computedAt: true,
});
export type MoodInsight = typeof moodInsights.$inferSelect;
export type InsertMoodInsight = z.infer<typeof insertMoodInsightSchema>;

export const dwJournalEntriesRelations = relations(dwJournalEntries, ({ one }) => ({
  user: one(users, {
    fields: [dwJournalEntries.userId],
    references: [users.id],
  }),
}));

export const insertDwJournalEntrySchema = createInsertSchema(dwJournalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ── Daily Briefs ─────────────────────────────────────────────────────────────
// One row per (user, dateKey, variant). Stores the rendered DW summary +
// typed bullets so the home Today card stays fast and consistent across loads.

export const dailyBriefVariantEnum = ["morning", "tonight"] as const;
export type DailyBriefVariant = typeof dailyBriefVariantEnum[number];

export const dailyBriefBulletKindEnum = [
  "mood",
  "sleep",
  "finance",
  "relationship",
  "spirit",
  "plan",
  "trigger",
] as const;
export type DailyBriefBulletKind = typeof dailyBriefBulletKindEnum[number];

export interface BriefBullet {
  kind: DailyBriefBulletKind;
  text: string;
  route: string;
  importance: 1 | 2 | 3;
}

export const dailyBriefs = pgTable("daily_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Local-day key in the user's timezone, "YYYY-MM-DD".
  dateKey: text("date_key").notNull(),
  variant: text("variant").notNull().$type<DailyBriefVariant>(),
  summaryText: text("summary_text").notNull(),
  bullets: jsonb("bullets").notNull().$type<BriefBullet[]>(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("daily_briefs_user_date_variant_idx").on(t.userId, t.dateKey, t.variant),
]);

export const dailyBriefsRelations = relations(dailyBriefs, ({ one }) => ({
  user: one(users, { fields: [dailyBriefs.userId], references: [users.id] }),
}));

export const insertDailyBriefSchema = createInsertSchema(dailyBriefs, {
  variant: z.enum(dailyBriefVariantEnum),
  bullets: z.array(z.object({
    kind: z.enum(dailyBriefBulletKindEnum),
    text: z.string(),
    route: z.string(),
    importance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })),
}).omit({
  id: true,
  generatedAt: true,
});
export type DailyBrief = typeof dailyBriefs.$inferSelect;
export type InsertDailyBrief = z.infer<typeof insertDailyBriefSchema>;

// Records each time a user actually taps a bullet on the Today brief.
// Lets us see which kinds (mood/sleep/finance/...) and which routes get
// the most engagement so DW can tune what it surfaces. Append-only;
// no PII beyond userId + the bullet metadata that DW itself produced.
export const dailyBriefTaps = pgTable("daily_brief_taps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateKey: text("date_key").notNull(),
  variant: text("variant").notNull().$type<DailyBriefVariant>(),
  bulletKind: text("bullet_kind").notNull().$type<DailyBriefBulletKind>(),
  route: text("route").notNull(),
  importance: integer("importance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("daily_brief_taps_user_date_idx").on(t.userId, t.dateKey),
  index("daily_brief_taps_kind_idx").on(t.bulletKind),
]);

export const insertDailyBriefTapSchema = createInsertSchema(dailyBriefTaps, {
  variant: z.enum(dailyBriefVariantEnum),
  bulletKind: z.enum(dailyBriefBulletKindEnum),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable(),
}).omit({ id: true, createdAt: true });
export type DailyBriefTap = typeof dailyBriefTaps.$inferSelect;
export type InsertDailyBriefTap = z.infer<typeof insertDailyBriefTapSchema>;

// User-tunable preferences for the daily brief. One row per user.
// Toggles control which bullet kinds the brief is allowed to surface; the
// optional `toneNote` is a free-text instruction (e.g. "lean spiritual",
// "always include a sleep number, never include money").
export const dailyBriefPreferences = pgTable("daily_brief_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  includeMood: boolean("include_mood").notNull().default(true),
  includeSleep: boolean("include_sleep").notNull().default(true),
  includeFinance: boolean("include_finance").notNull().default(true),
  includeRelationship: boolean("include_relationship").notNull().default(true),
  includeSpirit: boolean("include_spirit").notNull().default(true),
  includePlan: boolean("include_plan").notNull().default(true),
  includeTrigger: boolean("include_trigger").notNull().default(true),
  toneNote: text("tone_note"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dailyBriefPreferencesRelations = relations(dailyBriefPreferences, ({ one }) => ({
  user: one(users, { fields: [dailyBriefPreferences.userId], references: [users.id] }),
}));

export const insertDailyBriefPreferencesSchema = createInsertSchema(dailyBriefPreferences, {
  toneNote: z.string().trim().max(280).optional().nullable(),
}).omit({ id: true, updatedAt: true });
export type DailyBriefPreferences = typeof dailyBriefPreferences.$inferSelect;
export type InsertDailyBriefPreferences = z.infer<typeof insertDailyBriefPreferencesSchema>;

// DW Follow-ups – AI-generated follow-up questions/prompts from conversations
export const dwFollowups = pgTable("dw_followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  prompt: text("prompt").notNull(),
  relatedInsightId: varchar("related_insight_id").references(() => dwInsights.id),
  sourceConversationId: varchar("source_conversation_id"),
  status: text("status").default("pending"),    // "pending" | "accepted" | "snoozed" | "answered" | "dismissed"
  snoozedUntil: timestamp("snoozed_until"),
  acceptedAt: timestamp("accepted_at"),
  answeredAt: timestamp("answered_at"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dwFollowupsRelations = relations(dwFollowups, ({ one }) => ({
  user: one(users, {
    fields: [dwFollowups.userId],
    references: [users.id],
  }),
  relatedInsight: one(dwInsights, {
    fields: [dwFollowups.relatedInsightId],
    references: [dwInsights.id],
  }),
}));

export const insertDwFollowupSchema = createInsertSchema(dwFollowups).omit({
  id: true,
  createdAt: true,
});

export type DwInsight = typeof dwInsights.$inferSelect;
export type InsertDwInsight = z.infer<typeof insertDwInsightSchema>;
export type DwJournalEntry = typeof dwJournalEntries.$inferSelect;
export type InsertDwJournalEntry = z.infer<typeof insertDwJournalEntrySchema>;
export type DwFollowup = typeof dwFollowups.$inferSelect;
export type InsertDwFollowup = z.infer<typeof insertDwFollowupSchema>;

// ========================================
// PR #3: ELEVATION ENGINE
// ========================================

// Elevation Checks – daily momentum/stagnation check results per user
export const elevationChecks = pgTable("elevation_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  /** YYYY-MM-DD — one row per user per calendar day */
  checkedDate: varchar("checked_date", { length: 10 }).notNull(),
  /** green | yellow | red */
  momentumStatus: text("momentum_status").notNull(),
  /** Up to 2 human-readable reason strings explaining the status */
  reasons: jsonb("reasons").$type<string[]>().default([]),
  /** Optional one-line focus suggestion */
  suggestedFocus: text("suggested_focus"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("elevation_checks_user_date_idx").on(t.userId, t.checkedDate),
]);

export const elevationChecksRelations = relations(elevationChecks, ({ one }) => ({
  user: one(users, {
    fields: [elevationChecks.userId],
    references: [users.id],
  }),
}));

export const insertElevationCheckSchema = createInsertSchema(elevationChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ElevationCheck = typeof elevationChecks.$inferSelect;
export type InsertElevationCheck = z.infer<typeof insertElevationCheckSchema>;

// ========================================
// PR #5: ELEVATION PLAN BUILDER (7-day)
// ========================================

// Elevation Plans – 7-day plans generated with explicit user consent
export const elevationPlans = pgTable("elevation_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  goal: text("goal"),
  focusDimension: text("focus_dimension"),
  status: text("status").notNull().default("draft"),  // "draft" | "active" | "archived"
  startDate: text("start_date").notNull(),             // YYYY-MM-DD
  endDate: text("end_date").notNull(),                 // YYYY-MM-DD
  sourceConversationId: varchar("source_conversation_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("elevation_plans_user_status_start_source_idx").on(
    t.userId,
    t.status,
    t.startDate,
    t.sourceConversationId,
  ),
]);

export const elevationPlansRelations = relations(elevationPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [elevationPlans.userId],
    references: [users.id],
  }),
  days: many(elevationPlanDays),
}));

export const insertElevationPlanSchema = createInsertSchema(elevationPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Elevation Plan Days – one row per day (1–7) in the plan
export const elevationPlanDays = pgTable("elevation_plan_days", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => elevationPlans.id),
  dayIndex: integer("day_index").notNull(),  // 1..7
  theme: text("theme").notNull(),
  intention: text("intention").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const elevationPlanDaysRelations = relations(elevationPlanDays, ({ one, many }) => ({
  plan: one(elevationPlans, {
    fields: [elevationPlanDays.planId],
    references: [elevationPlans.id],
  }),
  actions: many(elevationPlanActions),
}));

export const insertElevationPlanDaySchema = createInsertSchema(elevationPlanDays).omit({
  id: true,
  createdAt: true,
});

// Elevation Plan Actions – 2–4 actions per day
export const elevationPlanActions = pgTable("elevation_plan_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planDayId: varchar("plan_day_id").notNull().references(() => elevationPlanDays.id),
  actionType: text("action_type").notNull(),  // "habit" | "workout" | "nutrition" | "reflection" | "schedule"
  title: text("title").notNull(),
  description: text("description").notNull(),
  timeOfDay: text("time_of_day"),
  durationMinutes: integer("duration_minutes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  linkedEntity: jsonb("linked_entity"),        // optional reference to calendar event, routine, task
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const elevationPlanActionsRelations = relations(elevationPlanActions, ({ one }) => ({
  day: one(elevationPlanDays, {
    fields: [elevationPlanActions.planDayId],
    references: [elevationPlanDays.id],
  }),
}));

export const insertElevationPlanActionSchema = createInsertSchema(elevationPlanActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ElevationPlan = typeof elevationPlans.$inferSelect;
export type InsertElevationPlan = z.infer<typeof insertElevationPlanSchema>;
export type ElevationPlanDay = typeof elevationPlanDays.$inferSelect;
export type InsertElevationPlanDay = z.infer<typeof insertElevationPlanDaySchema>;
export type ElevationPlanAction = typeof elevationPlanActions.$inferSelect;
export type InsertElevationPlanAction = z.infer<typeof insertElevationPlanActionSchema>;

// ========================================
// PR #7: REMINDERS
// ========================================

export const reminderTypeEnum = ["followup", "plan_action", "daily_checkin", "custom"] as const;
export type ReminderType = typeof reminderTypeEnum[number];

export const reminderStatusEnum = ["scheduled", "sent", "dismissed", "cancelled"] as const;
export type ReminderStatus = typeof reminderStatusEnum[number];

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull().$type<ReminderType>(),
  title: text("title").notNull(),
  body: text("body"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("scheduled").$type<ReminderStatus>(),
  /** Optional reference to a source entity (followup, plan, etc.) */
  sourceEntityType: text("source_entity_type"),
  sourceEntityId: varchar("source_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
}));

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

// ========================================
// PR #8: USER LEARNING PROFILE (DW Learns)
// ========================================

export const userLearningProfile = pgTable("user_learning_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  updatedAt: timestamp("updated_at").defaultNow(),
  /** e.g. { workout: "morning", reflection: "evening", reminder: "18:00" } */
  preferredTimes: jsonb("preferred_times").$type<Record<string, string>>().default({}),
  /** e.g. ["movement", "reflection"] */
  preferredActionTypes: jsonb("preferred_action_types").$type<string[]>().default([]),
  /** e.g. { reminders: "low" | "medium" | "high" } */
  sensitivity: jsonb("sensitivity").$type<Record<string, string>>().default({}),
  /** e.g. ["time", "motivation", "sleep"] */
  frictionPoints: jsonb("friction_points").$type<string[]>().default([]),
  /** what worked recently */
  wins: jsonb("wins").$type<string[]>().default([]),
  /** what user dislikes / wants to avoid */
  avoid: jsonb("avoid").$type<string[]>().default([]),
  lastFeedbackAt: timestamp("last_feedback_at"),
  /** whether auto-learning is enabled for this user */
  learningEnabled: boolean("learning_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLearningProfileRelations = relations(userLearningProfile, ({ one }) => ({
  user: one(users, {
    fields: [userLearningProfile.userId],
    references: [users.id],
  }),
}));

export const insertUserLearningProfileSchema = createInsertSchema(userLearningProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserLearningProfileSchema = insertUserLearningProfileSchema
  .omit({ userId: true })
  .partial()
  .strict();

export type UserLearningProfile = typeof userLearningProfile.$inferSelect;
export type InsertUserLearningProfile = z.infer<typeof insertUserLearningProfileSchema>;
export type UpdateUserLearningProfile = z.infer<typeof updateUserLearningProfileSchema>;

// ========================================
// PR #15: WEEKLY PLAN REVIEWS
// ========================================

export const weeklyPlanReviews = pgTable("weekly_plan_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull().references(() => elevationPlans.id),
  /** Titles of completed actions (auto-populated from plan) */
  wins: jsonb("wins").$type<string[]>().default([]),
  /** Titles of incomplete actions / user-reported friction */
  frictionPoints: jsonb("friction_points").$type<string[]>().default([]),
  /** 0–100 completion rate computed from plan actions */
  completionRate: integer("completion_rate"),
  /** Free-text: what worked well */
  feedbackWorked: text("feedback_worked"),
  /** Free-text: what to improve */
  feedbackImprove: text("feedback_improve"),
  /** "draft" while user is filling in; "submitted" once they confirm */
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("weekly_plan_reviews_user_plan_idx").on(t.userId, t.planId),
]);

export const weeklyPlanReviewsRelations = relations(weeklyPlanReviews, ({ one }) => ({
  user: one(users, {
    fields: [weeklyPlanReviews.userId],
    references: [users.id],
  }),
  plan: one(elevationPlans, {
    fields: [weeklyPlanReviews.planId],
    references: [elevationPlans.id],
  }),
}));

export const insertWeeklyPlanReviewSchema = createInsertSchema(weeklyPlanReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWeeklyPlanReviewSchema = insertWeeklyPlanReviewSchema.partial().omit({
  userId: true,
  planId: true,
});

export type WeeklyPlanReview = typeof weeklyPlanReviews.$inferSelect;
export type InsertWeeklyPlanReview = z.infer<typeof insertWeeklyPlanReviewSchema>;
export type UpdateWeeklyPlanReview = z.infer<typeof updateWeeklyPlanReviewSchema>;

// ========================================
// ACCOUNTABILITY PARTNER LINKING
// ========================================

export const accountabilityPartners = pgTable("accountability_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** The user who sent the invite */
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  /** The user who received the invite (null until they accept) */
  recipientId: varchar("recipient_id").references(() => users.id),
  /** Email address the invite was sent to */
  invitedEmail: text("invited_email").notNull(),
  /** Opaque one-time token sent in invite link */
  inviteToken: varchar("invite_token").notNull().unique(),
  /** "pending" → invite sent, "active" → both linked, "declined" → recipient declined, "unlinked" → either party unlinked */
  status: text("status").notNull().default("pending"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  unlinkedAt: timestamp("unlinked_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountabilityPartnersRelations = relations(accountabilityPartners, ({ one }) => ({
  requester: one(users, {
    fields: [accountabilityPartners.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  recipient: one(users, {
    fields: [accountabilityPartners.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
}));

export const insertAccountabilityPartnerSchema = createInsertSchema(accountabilityPartners).omit({
  id: true,
  invitedAt: true,
  updatedAt: true,
});

export type AccountabilityPartner = typeof accountabilityPartners.$inferSelect;
export type InsertAccountabilityPartner = z.infer<typeof insertAccountabilityPartnerSchema>;

// ── In-App Notifications ──────────────────────────────────────────────────────
export const notificationTypeEnum = [
  "dw_affirmation",
  "dw_insight",
  "accountability",
  "friend_request",
  "community_reply",
  "system",
] as const;
export type NotificationType = typeof notificationTypeEnum[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<NotificationType>(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// ── Evening Check-Ins ─────────────────────────────────────────────────────────
export const eveningCheckIns = pgTable("evening_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkInDate: text("check_in_date").notNull(),
  userNotes: text("user_notes"),
  completedSummary: text("completed_summary"),
  dwAnalysis: text("dw_analysis"),
  energyScore: integer("energy_score"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("check_in_date_user_idx").on(t.userId, t.checkInDate)]);

export const insertEveningCheckInSchema = createInsertSchema(eveningCheckIns).omit({
  id: true,
  createdAt: true,
});

export type EveningCheckIn = typeof eveningCheckIns.$inferSelect;
export type InsertEveningCheckIn = z.infer<typeof insertEveningCheckInSchema>;

// ── Push Subscriptions ────────────────────────────────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url("endpoint must be a valid URL").max(2000),
  keys: z.object({
    p256dh: z.string().min(1, "keys.p256dh is required").max(500),
    auth: z.string().min(1, "keys.auth is required").max(500),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("endpoint must be a valid URL").max(2000),
});

export const analyticsEventsSchema = z.object({
  events: z.array(z.unknown()).max(100, "events must have at most 100 entries"),
});

// ── Health Metrics ────────────────────────────────────────────────────────────
export const healthMetrics = pgTable("health_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  loggedDate: text("logged_date").notNull(), // YYYY-MM-DD
  steps: integer("steps"),
  sleepHours: real("sleep_hours"),
  heartRate: integer("heart_rate"),
  weightKg: real("weight_kg"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("health_metrics_user_date_idx").on(t.userId, t.loggedDate)]);

export const insertHealthMetricSchema = createInsertSchema(healthMetrics).omit({
  id: true,
  createdAt: true,
});
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;

// ── Life System Pillars (3-level taxonomy: core / expression / creation) ─────
export const lifeSystemLevelEnum = ["core", "expression", "creation"] as const;
export type LifeSystemLevel = typeof lifeSystemLevelEnum[number];

export const lifeSystemPillars = pgTable("life_system_pillars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pillarId: text("pillar_id").notNull(), // e.g. "foundation", "physical_health", "purpose"
  level: text("level").notNull().$type<LifeSystemLevel>(),
  enabled: boolean("enabled").default(true),
  // Free-form structured content, shape varies per pillar; common keys:
  // description, laws (string[]), nonNegotiables (string[]), weeklyRhythm,
  // userVoice (the user's own answer captured during onboarding),
  // identityStatement, finalStatement, custom fields by pillar
  content: jsonb("content"),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("life_system_pillars_user_pillar_idx").on(t.userId, t.pillarId)]);

export const insertLifeSystemPillarSchema = createInsertSchema(lifeSystemPillars).omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});
export type LifeSystemPillar = typeof lifeSystemPillars.$inferSelect;
export type InsertLifeSystemPillar = z.infer<typeof insertLifeSystemPillarSchema>;

// ── Life System Projects (sub-items inside the Creation pillar) ──────────────
export const lifeSystemProjectStatusEnum = ["vision", "active", "paused", "done"] as const;
export type LifeSystemProjectStatus = typeof lifeSystemProjectStatusEnum[number];

export const lifeSystemProjects = pgTable("life_system_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  currentFocus: text("current_focus"),
  weeklyCadence: text("weekly_cadence"),
  nextAction: text("next_action"),
  status: text("status").default("active").$type<LifeSystemProjectStatus>(),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLifeSystemProjectSchema = createInsertSchema(lifeSystemProjects).omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});
export type LifeSystemProject = typeof lifeSystemProjects.$inferSelect;
export type InsertLifeSystemProject = z.infer<typeof insertLifeSystemProjectSchema>;

// ── Life System Documents (snapshots of the generated artifact) ──────────────
export const lifeSystemDocuments = pgTable("life_system_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Structured document body — sections keyed by id, see shared/lifeSystemTaxonomy.ts
  content: jsonb("content").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const insertLifeSystemDocumentSchema = createInsertSchema(lifeSystemDocuments).omit({
  id: true,
  generatedAt: true,
});
export type LifeSystemDocument = typeof lifeSystemDocuments.$inferSelect;
export type InsertLifeSystemDocument = z.infer<typeof insertLifeSystemDocumentSchema>;

// ── Trigger Events (DW Trigger Protocol logs) ────────────────────────────────
export const triggerOutcomeEnum = ["reacted", "paused", "responded"] as const;
export type TriggerOutcome = typeof triggerOutcomeEnum[number];

export const triggerEvents = pgTable("trigger_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // What the user said they were feeling (e.g. "anxious", "jealous").
  feeling: text("feeling").notNull(),
  // The story their brain was running ("they're cheating", "I'm being lied to").
  assumption: text("assumption"),
  // Did they have evidence, or was it a feeling? null = skipped.
  hadProof: boolean("had_proof"),
  // Optional notes captured during root check.
  rootNote: text("root_note"),
  // Which reframe card they locked in.
  reframe: text("reframe"),
  // Which response template they picked / wrote.
  responseChoice: text("response_choice"),
  // Pause duration in minutes (5 / 20 / 30 / 0 = skipped).
  pauseMinutes: integer("pause_minutes"),
  // Final outcome ("reacted" / "paused" / "responded").
  outcome: text("outcome").$type<TriggerOutcome>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTriggerEventSchema = createInsertSchema(triggerEvents).omit({
  id: true,
  createdAt: true,
});
export type TriggerEvent = typeof triggerEvents.$inferSelect;
export type InsertTriggerEvent = z.infer<typeof insertTriggerEventSchema>;

// ─── DW Role Picker telemetry ────────────────────────────────────────────────
// Logs every adaptive-role pick so we can measure lane usage and override
// rate, then turn findings into rule updates in dw-role-picker.ts.
export const dwRolePickSurfaceEnum = ["chat", "smart", "realtime"] as const;
export type DWRolePickSurface = typeof dwRolePickSurfaceEnum[number];

export const dwRolePickSourceEnum = ["rules", "llm", "fallback", "locked", "sticky"] as const;
export type DWRolePickSource = typeof dwRolePickSourceEnum[number];

export const dwRolePicks = pgTable("dw_role_picks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Where the pick happened.
  surface: text("surface").notNull().$type<DWRolePickSurface>(),
  // Chosen DW mode id (companion / coach / planner / etc.)
  mode: text("mode").notNull(),
  // How the choice was made.
  source: text("source").notNull().$type<DWRolePickSource>(),
  // Picker confidence (0..1). 1 when locked.
  confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
  // Picker reason — short string for diagnostics.
  reason: text("reason"),
  // Was the user-supplied lock active for this turn?
  locked: boolean("locked").notNull().default(false),
  // Did we actually apply the picked mode to the prompt? (false = below threshold)
  applied: boolean("applied").notNull().default(false),
  // sha256 of the message, first 16 hex chars — privacy-preserving "same message?" key.
  messageHash: text("message_hash"),
  // Char length of the original message — helps separate one-liners from essays.
  messageLength: integer("message_length"),
  // If the user locked a different lane on the next turn, we point back at the pick that was overridden.
  overriddenByMode: text("overridden_by_mode"),
  overriddenAt: timestamp("overridden_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDwRolePickSchema = createInsertSchema(dwRolePicks).omit({
  id: true,
  createdAt: true,
  overriddenByMode: true,
  overriddenAt: true,
});
export type DwRolePick = typeof dwRolePicks.$inferSelect;
export type InsertDwRolePick = z.infer<typeof insertDwRolePickSchema>;

// ─── Finances ────────────────────────────────────────────────────────────────
// Core tables for the Finances workspace: accounts, transactions, budgets,
// investment holdings, net-worth snapshots, and Plaid items for bank sync.

export const financialAccountTypeEnum = [
  "checking", "savings", "credit", "loan", "cash", "investment", "other",
] as const;
export type FinancialAccountType = typeof financialAccountTypeEnum[number];

export const transactionSourceEnum = ["manual", "plaid"] as const;
export type TransactionSource = typeof transactionSourceEnum[number];

export const holdingTypeEnum = ["stock", "etf", "crypto", "cash", "other"] as const;
export type HoldingType = typeof holdingTypeEnum[number];

export const financialAccounts = pgTable("financial_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<FinancialAccountType>(),
  institution: text("institution"),
  currentBalance: real("current_balance").default(0),
  currency: text("currency").default("USD"),
  plaidAccountId: text("plaid_account_id"),
  plaidItemId: varchar("plaid_item_id"),
  isManual: boolean("is_manual").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFinancialAccountSchema = createInsertSchema(financialAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(financialAccountTypeEnum as unknown as [FinancialAccountType, ...FinancialAccountType[]]),
});
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").references(() => financialAccounts.id, { onDelete: "set null" }),
  // Amount is signed: negative = spend, positive = income. USD only for v1.
  amount: real("amount").notNull(),
  currency: text("currency").default("USD"),
  category: text("category").notNull(),
  merchant: text("merchant"),
  note: text("note"),
  // ISO date string (YYYY-MM-DD) for simple date-range / month filtering.
  date: text("date").notNull(),
  source: text("source").notNull().default("manual").$type<TransactionSource>(),
  plaidTransactionId: text("plaid_transaction_id"),
  pending: boolean("pending").default(false),
  // Optional link to a savings goal. When an income (positive-amount)
  // transaction is created with goalId set, the goal's currentAmount is
  // auto-incremented by the amount. Cleared if the goal is deleted.
  goalId: varchar("goal_id"),
  // If this transaction's goal link came from an auto-credit rule (vs. the
  // user tagging it manually), this points at the rule that matched. The UI
  // uses it to show an "auto" badge so users can tell rule-credited
  // contributions apart from ones they tagged by hand.
  appliedRuleId: varchar("applied_rule_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("transactions_plaid_txn_idx").on(t.plaidTransactionId),
  index("transactions_goal_idx").on(t.goalId),
]);

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  source: z.enum(transactionSourceEnum as unknown as [TransactionSource, ...TransactionSource[]]).optional(),
});
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  monthlyLimit: real("monthly_limit").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("budgets_user_category_idx").on(t.userId, t.category),
]);

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export const investmentHoldings = pgTable("investment_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // "AAPL", "VTI", "BTC", or null for "other".
  ticker: text("ticker"),
  name: text("name").notNull(),
  type: text("type").notNull().default("stock").$type<HoldingType>(),
  shares: real("shares").default(0),
  costBasis: real("cost_basis"),
  currentPrice: real("current_price"),
  // For "other" / manual: set manualValue directly; computed value uses shares*price.
  manualValue: real("manual_value"),
  lastQuoteAt: timestamp("last_quote_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestmentHoldingSchema = createInsertSchema(investmentHoldings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(holdingTypeEnum as unknown as [HoldingType, ...HoldingType[]]),
});
export type InvestmentHolding = typeof investmentHoldings.$inferSelect;
export type InsertInvestmentHolding = z.infer<typeof insertInvestmentHoldingSchema>;

export const netWorthSnapshots = pgTable("net_worth_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // ISO date (YYYY-MM-DD) — one snapshot per user per day.
  date: text("date").notNull(),
  assets: real("assets").notNull().default(0),
  liabilities: real("liabilities").notNull().default(0),
  netWorth: real("net_worth").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("net_worth_user_date_idx").on(t.userId, t.date),
]);

export const insertNetWorthSnapshotSchema = createInsertSchema(netWorthSnapshots).omit({
  id: true,
  createdAt: true,
});
export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type InsertNetWorthSnapshot = z.infer<typeof insertNetWorthSnapshotSchema>;

export const plaidItems = pgTable("plaid_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().unique(),
  // Plaid access token — stored AES-256-GCM encrypted at rest (see
  // server/routes/_encryption.ts). Never write the raw token here.
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  cursor: text("cursor"),
  lastSyncAt: timestamp("last_sync_at"),
  // Per-item health: "ok" once we've synced successfully, "error" once a
  // sync or ITEM webhook fails. Powers the "Reconnect bank" prompt and the
  // stale-sync nudge.
  status: text("status").default("ok"),
  lastError: text("last_error"),
  lastErrorCode: text("last_error_code"),
  lastErrorAt: timestamp("last_error_at"),
  lastSuccessAt: timestamp("last_success_at"),
  // Set when we've already nudged the user about this current error so we
  // don't keep re-notifying on every scheduler tick.
  errorNotifiedAt: timestamp("error_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlaidItemSchema = createInsertSchema(plaidItems).omit({
  id: true,
  createdAt: true,
});
export type PlaidItem = typeof plaidItems.$inferSelect;
export type InsertPlaidItem = z.infer<typeof insertPlaidItemSchema>;

// Personal savings goals: lightweight per-user targets ("Emergency fund",
// "Hawaii trip"), with a current saved amount and an optional target date.
// Progress is computed on the client as currentAmount / targetAmount.
export const savingsGoals = pgTable("savings_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  // Optional ISO date (YYYY-MM-DD) for the goal's target completion date.
  targetDate: text("target_date"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("savings_goals_user_idx").on(t.userId),
]);

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;

// Auto-credit rules: when a Plaid-synced (or manual) income transaction
// matches the rule's filters (category / merchant substring / account), it
// is automatically linked to `goalId` so the goal's currentAmount goes up.
//   - amountType=fixed   → credit `amountValue` (capped at the txn amount)
//   - amountType=percent → credit `amountValue` percent of the txn amount
//   - amountType=all     → credit the full txn amount; amountValue ignored
export const savingsGoalRuleAmountTypeEnum = ["fixed", "percent", "all"] as const;
export type SavingsGoalRuleAmountType = typeof savingsGoalRuleAmountTypeEnum[number];

export const savingsGoalRules = pgTable("savings_goal_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: varchar("goal_id").notNull().references(() => savingsGoals.id, { onDelete: "cascade" }),
  // Optional human label so users can tell rules apart in the UI.
  label: text("label"),
  // Optional account filter — when set, only matches transactions on that account.
  accountId: varchar("account_id"),
  // Optional category filter (e.g. "Income"). Case-insensitive equality.
  category: text("category"),
  // Optional merchant substring filter. Case-insensitive substring match.
  merchantPattern: text("merchant_pattern"),
  amountType: text("amount_type").notNull().default("all").$type<SavingsGoalRuleAmountType>(),
  amountValue: real("amount_value"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("savings_goal_rules_user_idx").on(t.userId),
  index("savings_goal_rules_goal_idx").on(t.goalId),
]);

export const insertSavingsGoalRuleSchema = createInsertSchema(savingsGoalRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amountType: z.enum(savingsGoalRuleAmountTypeEnum),
});
export type SavingsGoalRule = typeof savingsGoalRules.$inferSelect;
export type InsertSavingsGoalRule = z.infer<typeof insertSavingsGoalRuleSchema>;

// ─── Spiritual: Meditation library, sessions, prayer entries ──────────────────

export const meditationThemeEnum = [
  "calm", "focus", "sleep", "grief", "gratitude",
  "energy", "release", "connection", "clarity",
] as const;
export type MeditationTheme = typeof meditationThemeEnum[number];

export const meditationLibrary = pgTable("meditation_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Stable slug used as a deterministic seed key; unique so re-seeding is idempotent.
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  theme: text("theme").notNull().$type<MeditationTheme>(),
  durationMinutes: integer("duration_minutes").notNull(),
  scriptText: text("script_text").notNull(),
  audioUrl: text("audio_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeditationLibrarySchema = createInsertSchema(meditationLibrary).omit({
  id: true,
  createdAt: true,
}).extend({
  theme: z.enum(meditationThemeEnum as unknown as [MeditationTheme, ...MeditationTheme[]]),
});
export type MeditationLibraryItem = typeof meditationLibrary.$inferSelect;
export type InsertMeditationLibraryItem = z.infer<typeof insertMeditationLibrarySchema>;

export const meditationSessions = pgTable("meditation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  libraryId: varchar("library_id").references(() => meditationLibrary.id, { onDelete: "set null" }),
  themeOverride: text("theme_override"),
  durationSec: integer("duration_sec").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  // Mood pulse: optional 1–5 rating before/after the session.
  moodBefore: integer("mood_before"),
  moodAfter: integer("mood_after"),
  notes: text("notes"),
});

export const insertMeditationSessionSchema = createInsertSchema(meditationSessions).omit({
  id: true,
  completedAt: true,
});
export type MeditationSession = typeof meditationSessions.$inferSelect;
export type InsertMeditationSession = z.infer<typeof insertMeditationSessionSchema>;

export const prayerEntries = pgTable("prayer_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  intention: text("intention"),
  gratitudeList: text("gratitude_list").array(),
  // When true, the entry appears anonymously in /api/prayer-entries/collective.
  shareCollective: boolean("share_collective").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrayerEntrySchema = createInsertSchema(prayerEntries).omit({
  id: true,
  createdAt: true,
});
export type PrayerEntry = typeof prayerEntries.$inferSelect;
export type InsertPrayerEntry = z.infer<typeof insertPrayerEntrySchema>;

// ── Wearable + Screen Time Manager ───────────────────────────────────────────
// Supported sources for the Wearable Manager. Apple Health + Screen Time ship
// end-to-end in this milestone; the OAuth scaffolds for whoop/oura/garmin are
// in place but their data pulls are stubbed until provider keys are wired up.
export const wearableSourceEnum = [
  "apple_health",
  "screen_time",
  "whoop",
  "oura",
  "garmin",
] as const;
export type WearableSource = typeof wearableSourceEnum[number];

// Per-day, per-source screen time totals (Apple Screen Time export).
export const screenTimeUsage = pgTable("screen_time_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("screen_time"),
  dateKey: text("date_key").notNull(), // YYYY-MM-DD (user-local)
  totalMinutes: integer("total_minutes").notNull().default(0),
  byCategory: jsonb("by_category"), // { social: 192, productivity: 35, ... }
  byApp: jsonb("by_app"), // { "Instagram": 88, "Slack": 22, ... }
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("screen_time_usage_user_date_source_idx").on(t.userId, t.dateKey, t.source)]);

export const insertScreenTimeUsageSchema = createInsertSchema(screenTimeUsage).omit({
  id: true,
  createdAt: true,
});
export type ScreenTimeUsage = typeof screenTimeUsage.$inferSelect;
export type InsertScreenTimeUsage = z.infer<typeof insertScreenTimeUsageSchema>;

// One row per (user, source) tracking last sync state. Used to surface
// last-synced timestamps and the most recent error in the manager UI.
export const wearableSyncJobs = pgTable("wearable_sync_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  status: text("status").notNull().default("idle"), // idle | running | success | error | not_configured
  lastSyncAt: timestamp("last_sync_at"),
  errorText: text("error_text"),
  recordsImported: integer("records_imported").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [uniqueIndex("wearable_sync_jobs_user_source_idx").on(t.userId, t.source)]);

export const insertWearableSyncJobSchema = createInsertSchema(wearableSyncJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type WearableSyncJob = typeof wearableSyncJobs.$inferSelect;
export type InsertWearableSyncJob = z.infer<typeof insertWearableSyncJobSchema>;

// ── Imported Conversations (ChatGPT export, raw paste, etc.) ─────────────────
export const importedConversationSourceEnum = ["chatgpt_export", "raw_paste", "other"] as const;
export type ImportedConversationSource = typeof importedConversationSourceEnum[number];

export const importedConversations = pgTable("imported_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  source: text("source").notNull().$type<ImportedConversationSource>(),
  originalTitle: text("original_title").notNull(),
  messages: jsonb("messages").notNull().default([]),
  summary: text("summary"),
  topics: text("topics").array(),
  suggestedActions: jsonb("suggested_actions"),
  sourceTimestamp: timestamp("source_timestamp"),
  importedAt: timestamp("imported_at").defaultNow(),
  projectId: varchar("project_id").references(() => projects.id),
}, (t) => [
  index("imported_conversations_user_idx").on(t.userId),
]);

export const insertImportedConversationSchema = createInsertSchema(importedConversations).omit({
  id: true,
  importedAt: true,
});

export type ImportedConversation = typeof importedConversations.$inferSelect;
export type InsertImportedConversation = z.infer<typeof insertImportedConversationSchema>;

export type ImportedConversationMessage = {
  role: "user" | "assistant" | "unknown";
  content: string;
  timestamp?: number;
};

// ────────────────────────────────────────────────────────────────────────────
// Strict, partial PATCH/PUT update schemas for Task #124.
//
// Pattern: take the corresponding insert schema, omit any owner key (userId
// or parent foreign key — those are sourced from the session or URL, never
// the request body), call .partial() so every field becomes optional, then
// .strict() so unknown fields are rejected with a 400 instead of silently
// written to the database.
//
// All schemas live here together so contributors can audit "what fields can
// a client patch?" in one place.
// ────────────────────────────────────────────────────────────────────────────

export const conversationUpdateSchema = insertConversationSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const aiSyncSessionUpdateSchema = insertAiSyncSessionSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const aiSyncItemUpdateSchema = insertAiSyncItemSchema
  .omit({ sessionId: true })
  .partial()
  .strict();

export const goalUpdateSchema = insertGoalSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const habitUpdateSchema = insertHabitSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const scheduleBlockUpdateSchema = insertScheduleBlockSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const stabilizingActionUpdateSchema = insertStabilizingActionSchema
  .omit({ blueprintId: true })
  .partial()
  .strict();

export const recoveryReflectionUpdateSchema = insertRecoveryReflectionSchema
  .omit({ blueprintId: true })
  .partial()
  .strict();

export const routineUpdateSchema = insertRoutineSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const taskUpdateSchema = insertTaskSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const projectUpdateSchema = insertProjectSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const calendarEventUpdateSchema = insertCalendarEventSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const calendarEventTaskUpdateSchema = insertCalendarEventTaskSchema
  .omit({ calendarEventId: true, userId: true })
  .partial()
  .strict();

export const challengeUpdateSchema = insertChallengeSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const savedContentUpdateSchema = insertSavedContentSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const systemModuleUpdateSchema = insertSystemModuleSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const dailyScheduleEventUpdateSchema = insertDailyScheduleEventSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const importedDocumentItemUpdateSchema = insertImportedDocumentItemSchema
  .omit({ documentId: true })
  .partial()
  .strict();

export const mealPlanUpdateSchema = insertMealPlanSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const mealUpdateSchema = insertMealSchema
  .omit({ userId: true, mealPlanId: true })
  .partial()
  .strict();

export const workoutPlanUpdateSchema = insertWorkoutPlanSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const exerciseUpdateSchema = insertExerciseSchema
  .omit({ workoutPlanId: true })
  .partial()
  .strict();

export const workoutSessionUpdateSchema = insertWorkoutSessionSchema
  .omit({ userId: true, workoutPlanId: true })
  .partial()
  .strict();

export const workoutSessionStepUpdateSchema = insertWorkoutSessionStepSchema
  .omit({ sessionId: true, userId: true, stepIndex: true })
  .partial()
  .strict();

export const shoppingListUpdateSchema = insertShoppingListSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const shoppingListItemUpdateSchema = insertShoppingListItemSchema
  .omit({ shoppingListId: true })
  .partial()
  .strict();

export const dimensionBlueprintUpdateSchema = insertDimensionBlueprintSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const resetProtocolUpdateSchema = insertResetProtocolSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const universalPlanUpdateSchema = insertUniversalPlanSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const streakUpdateSchema = insertStreakSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const aiSuggestionUpdateSchema = insertAiSuggestionSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const conversationInsightUpdateSchema = insertConversationInsightSchema
  .omit({ userId: true })
  .partial()
  .strict();

export const dwFollowupUpdateSchema = insertDwFollowupSchema
  .omit({ userId: true })
  .partial()
  .strict();

// NOTE: elevation plan + action update schemas live inside server/routes.ts
// (and server/routes/support-detailed.ts for the dead-code variant). They
// are intentionally narrower than what `insertElevationPlan*Schema` would
// allow (only title/goal/status / isCompleted/title/description). Keeping
// the contract local avoids drift between this file and the route's
// hardened allow-list.

export const reminderUpdateSchema = insertReminderSchema
  .omit({ userId: true })
  .partial()
  .strict();
