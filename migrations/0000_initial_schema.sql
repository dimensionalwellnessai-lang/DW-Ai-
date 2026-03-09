CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE "accountability_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tasks_committed" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"tasks_partial" integer DEFAULT 0,
	"tasks_skipped" integer DEFAULT 0,
	"follow_through_rate" real DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_completed_date" timestamp,
	"last_reset_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "accountability_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"unlocked_at" timestamp DEFAULT now(),
	"related_dimension" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "activity_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"guest_id" varchar,
	"date" text NOT NULL,
	"activity_title" text NOT NULL,
	"activity_id" varchar,
	"switch_id" text,
	"completed" boolean DEFAULT false NOT NULL,
	"skipped_reason" text,
	"scheduled_time" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_feature_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"feature_name" text NOT NULL,
	"usage_count" integer DEFAULT 1,
	"last_used_at" timestamp DEFAULT now(),
	"total_time_spent_seconds" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_learnings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"topic" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_pattern_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dimension" text,
	"pattern_type" text NOT NULL,
	"pattern_data" jsonb NOT NULL,
	"confidence" integer DEFAULT 70,
	"evidence_count" integer DEFAULT 1,
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"suggestion_type" text NOT NULL,
	"feature_name" text,
	"trigger_reason" text,
	"suggestion_text" text NOT NULL,
	"status" text DEFAULT 'pending',
	"responded_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_sync_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"item_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recurrence_group_key" text,
	"recurrence_pattern" text,
	"start_time" timestamp,
	"end_time" timestamp,
	"dimension_tags" text[],
	"metadata" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"ai_confidence" integer DEFAULT 80,
	"user_decision" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_sync_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar,
	"status" text DEFAULT 'processing' NOT NULL,
	"total_items" integer DEFAULT 0,
	"processed_items" integer DEFAULT 0,
	"accepted_items" integer DEFAULT 0,
	"rejected_items" integer DEFAULT 0,
	"source_type" text DEFAULT 'chat',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "astrology_predictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"date" timestamp NOT NULL,
	"moon_phase" text,
	"celestial_events" jsonb,
	"energy_level" integer,
	"mood_alignment" text,
	"personalized_insights" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "baseline_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" varchar NOT NULL,
	"baseline_signs" text[],
	"daily_supports" text[],
	"preferred_pace" text DEFAULT 'steady',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "birth_charts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"birth_date" text NOT NULL,
	"birth_time" text NOT NULL,
	"birth_city" text NOT NULL,
	"birth_state" text,
	"birth_country" text NOT NULL,
	"timezone" text NOT NULL,
	"daylight_savings" boolean DEFAULT false,
	"zodiac_system" text DEFAULT 'tropical',
	"house_system" text DEFAULT 'placidus',
	"placements" jsonb,
	"aspects" jsonb,
	"interpretations" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "birth_charts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "body_scans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"height" text,
	"weight" text,
	"waist" text,
	"goals" text[],
	"notes" text,
	"consent_given" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"event_type" text DEFAULT 'event',
	"dimension_tags" text[],
	"project_id" varchar,
	"routine_id" varchar,
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"recurrence_end_date" text,
	"linked_type" text DEFAULT 'none',
	"linked_id" varchar,
	"linked_route" text,
	"linked_meta" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "category_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"metadata" jsonb,
	"date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"duration_days" integer NOT NULL,
	"daily_tasks" jsonb,
	"start_date" text,
	"current_day" integer DEFAULT 0,
	"status" text DEFAULT 'not_started',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"messages" jsonb,
	"ai_response" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "completion_status" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"body_scan_completed" boolean DEFAULT false,
	"meal_preferences_completed" boolean DEFAULT false,
	"blueprint_completions" jsonb,
	"reset_protocol_completed" boolean DEFAULT false,
	"onboarding_completed" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "completion_status_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_insights" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"category" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source" jsonb NOT NULL,
	"pinned" boolean DEFAULT false,
	"pinned_at" timestamp,
	"hidden" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"guest_id" varchar,
	"title" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_mood_checkins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"guest_id" varchar,
	"date" text NOT NULL,
	"time_of_day" text NOT NULL,
	"mood" text NOT NULL,
	"custom_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_schedule_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"scheduled_time" text NOT NULL,
	"end_time" text,
	"day_of_week" integer,
	"system_reference" varchar,
	"system_type" text,
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dimension_blueprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dimension" text NOT NULL,
	"when_at_my_best" text,
	"what_i_stand_for" text[],
	"how_this_supports_me" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dimension_systems" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dimension" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"components" text[],
	"related_goals" text[],
	"related_routines" text[],
	"related_habits" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dw_conversation_processing_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"last_processed_index" integer NOT NULL,
	"processed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dw_followups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"prompt" text NOT NULL,
	"related_insight_id" varchar,
	"source_conversation_id" varchar,
	"status" text DEFAULT 'pending',
	"snoozed_until" timestamp,
	"accepted_at" timestamp,
	"answered_at" timestamp,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dw_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"insight_line" text,
	"quotes" jsonb,
	"theme" text,
	"tags" jsonb,
	"switch_tag" text,
	"source_conversation_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dw_journal_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"story" text NOT NULL,
	"quotes" jsonb,
	"tags" jsonb,
	"source_conversation_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevation_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"checked_date" varchar(10) NOT NULL,
	"momentum_status" text NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb,
	"suggested_focus" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevation_plan_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_day_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"time_of_day" text,
	"duration_minutes" integer,
	"is_completed" boolean DEFAULT false NOT NULL,
	"linked_entity" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevation_plan_days" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"day_index" integer NOT NULL,
	"theme" text NOT NULL,
	"intention" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevation_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"goal" text,
	"focus_dimension" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"source_conversation_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_plan_id" varchar,
	"title" text NOT NULL,
	"exercise_type" text DEFAULT 'other',
	"day_label" text,
	"tags" text[],
	"notes" text,
	"sets" text,
	"reps" text,
	"duration" text,
	"equipment" text[],
	"instructions" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"household_tasks_enabled" boolean DEFAULT false,
	"household_tasks_suggested" boolean DEFAULT false,
	"household_tasks_dismissed" boolean DEFAULT false,
	"financial_tools_enabled" boolean DEFAULT false,
	"advanced_analytics_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "feature_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "feed_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_type" text,
	"content_title" text,
	"content_url" text,
	"action" text NOT NULL,
	"topic" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"wellness_dimension" text,
	"progress" integer DEFAULT 0,
	"target_value" integer DEFAULT 100,
	"is_active" boolean DEFAULT true,
	"data_source" text DEFAULT 'user',
	"explain_why" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"frequency" text DEFAULT 'daily',
	"reminder_time" text,
	"is_active" boolean DEFAULT true,
	"streak" integer DEFAULT 0,
	"data_source" text DEFAULT 'user',
	"explain_why" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "household_cleaning_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"room" text NOT NULL,
	"task_name" text NOT NULL,
	"frequency" text NOT NULL,
	"last_completed" timestamp,
	"next_due" timestamp,
	"is_completed" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "household_laundry_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"laundry_type" text NOT NULL,
	"scheduled_day" text,
	"last_completed" timestamp,
	"next_scheduled" timestamp,
	"reminder_enabled" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "imported_document_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"item_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"details" jsonb,
	"destination_system" text,
	"confidence" integer,
	"is_selected" boolean DEFAULT true,
	"linked_entity_id" varchar,
	"linked_entity_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "imported_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"raw_text" text,
	"analysis_json" jsonb,
	"document_title" text,
	"summary" text,
	"confidence" integer,
	"status" text DEFAULT 'pending',
	"extraction_method" text,
	"ocr_confidence" integer,
	"error_message" text,
	"primary_category" text,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now(),
	"saved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "interaction_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"page_path" text,
	"action_target" text,
	"action_value" text,
	"duration_ms" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "life_dimension_assessments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dimension" text NOT NULL,
	"score" real NOT NULL,
	"answers" jsonb,
	"assessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "life_systems" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"weekly_schedule" jsonb,
	"suggested_habits" jsonb,
	"suggested_tools" text[],
	"schedule_blocks" jsonb,
	"meal_suggestions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"meal_plan_id" varchar,
	"meal_type" text,
	"title" text,
	"photo_url" text,
	"calories" integer,
	"protein" integer,
	"carbs" integer,
	"fat" integer,
	"items" jsonb,
	"ai_analysis" text,
	"logged_at" timestamp DEFAULT now(),
	"scheduled_time" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"source" text DEFAULT 'import',
	"imported_document_id" varchar,
	"is_active" boolean DEFAULT true,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_prep_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"weekday_prep_enabled" boolean DEFAULT true,
	"prep_days" text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
	"fresh_days" text[] DEFAULT ARRAY['saturday', 'sunday'],
	"auto_generate_shopping_list" boolean DEFAULT true,
	"default_servings" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "meal_prep_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"meal_plan_id" varchar,
	"title" text NOT NULL,
	"meal_type" text DEFAULT 'other',
	"week_label" text,
	"tags" text[],
	"notes" text,
	"ingredients" text[],
	"instructions" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mood_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"energy_level" integer NOT NULL,
	"mood_level" integer NOT NULL,
	"clarity_level" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"accountability_enabled" boolean DEFAULT true,
	"pre_task_enabled" boolean DEFAULT true,
	"post_task_enabled" boolean DEFAULT true,
	"morning_briefing_enabled" boolean DEFAULT true,
	"evening_summary_enabled" boolean DEFAULT true,
	"pre_task_minutes" integer DEFAULT 15,
	"morning_briefing_time" text DEFAULT '08:00',
	"evening_summary_time" text DEFAULT '21:00',
	"quiet_hours_enabled" boolean DEFAULT false,
	"quiet_hours_start" text DEFAULT '22:00',
	"quiet_hours_end" text DEFAULT '08:00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"responsibilities" text[],
	"priorities" text[],
	"free_time_hours" text,
	"peak_motivation_time" text,
	"wellness_focus" text[],
	"life_area_details" jsonb,
	"short_term_goals" text,
	"long_term_goals" text,
	"relationship_goals" text,
	"conversation_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "project_chats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"messages" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dimension_tags" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recovery_reflections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" varchar NOT NULL,
	"title" text,
	"content" text,
	"lessons_learned" text[],
	"adjustments_to_make" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"scheduled_at" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"source_entity_type" text,
	"source_entity_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reset_protocol" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"red_flags" text[],
	"how_i_reset" text[],
	"when_things_get_hard" text[],
	"my_support_system" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "reset_protocol_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "routine_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"dimension_tags" text[],
	"steps" jsonb,
	"total_duration_minutes" integer,
	"schedule_options" jsonb,
	"mode" text DEFAULT 'guided',
	"project_id" varchar,
	"is_active" boolean DEFAULT true,
	"data_source" text DEFAULT 'user',
	"explain_why" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"thumbnail" text,
	"source" text,
	"duration" text,
	"metadata" jsonb,
	"saved_at" timestamp DEFAULT now(),
	"is_read" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "schedule_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "shopping_list_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shopping_list_id" varchar NOT NULL,
	"ingredient" text NOT NULL,
	"quantity" text,
	"unit" text,
	"category" text DEFAULT 'other',
	"source_meal_id" varchar,
	"is_checked" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"meal_plan_id" varchar,
	"week_label" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stabilizing_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" varchar NOT NULL,
	"action_name" text NOT NULL,
	"action_type" text DEFAULT 'suggestion',
	"routine_id" varchar,
	"duration_minutes" integer,
	"instructions" text,
	"links" text[],
	"dimension_tags" text[],
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"streak_type" text NOT NULL,
	"related_id" varchar,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stress_signals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" varchar NOT NULL,
	"draining_patterns" text[],
	"early_signals" text[],
	"context_tags" text[],
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "support_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" varchar NOT NULL,
	"helpful_support" text[],
	"unhelpful_support" text[],
	"trusted_people" jsonb,
	"boundaries" text[],
	"environment_needs" text[],
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "system_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"system_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"settings" jsonb,
	"routine_steps" jsonb,
	"linked_subsystems" text[],
	"conditional_logic" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_accountability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_id" varchar,
	"calendar_event_id" varchar,
	"task_name" text NOT NULL,
	"scheduled_time" timestamp NOT NULL,
	"scheduled_end_time" timestamp,
	"committed_at" timestamp,
	"commitment_response" text,
	"confirmed_at" timestamp,
	"completion_status" text,
	"reflection_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo',
	"is_completed" boolean DEFAULT false,
	"due_date" text,
	"scheduled_start" text,
	"scheduled_end" text,
	"project_id" varchar,
	"goal_id" varchar,
	"routine_id" varchar,
	"blueprint_action_id" varchar,
	"dimension_tags" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracker_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"guest_id" varchar,
	"mood_checkins_enabled" boolean DEFAULT true,
	"mood_checkin_times" text[],
	"activity_reminders_enabled" boolean DEFAULT true,
	"reminder_minutes_before" integer DEFAULT 15,
	"daily_synopsis_enabled" boolean DEFAULT true,
	"daily_synopsis_time" text DEFAULT '21:00',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracking_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tracking_type" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"notes" text,
	"related_dimension" text,
	"logged_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "universal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'active',
	"workout_plan_id" varchar,
	"meal_plan_id" varchar,
	"shopping_list_id" varchar,
	"plan_data" jsonb,
	"connected_dimensions" text[],
	"connected_goal_ids" text[],
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"guest_id" varchar,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"page_context" text,
	"energy_level" text,
	"status" text DEFAULT 'new',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_learning_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"preferred_times" jsonb DEFAULT '{}'::jsonb,
	"preferred_action_types" jsonb DEFAULT '[]'::jsonb,
	"sensitivity" jsonb DEFAULT '{}'::jsonb,
	"friction_points" jsonb DEFAULT '[]'::jsonb,
	"wins" jsonb DEFAULT '[]'::jsonb,
	"avoid" jsonb DEFAULT '[]'::jsonb,
	"last_feedback_at" timestamp,
	"learning_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_learning_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"pattern_type" text,
	"description" text,
	"frequency" integer DEFAULT 1,
	"last_occurrence" timestamp,
	"sentiment" text,
	"related_dimension" text,
	"ai_notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"goals" text[],
	"schedule_availability" jsonb,
	"diet_restrictions" text[],
	"allergies" text[],
	"workout_location" text,
	"workout_equipment" text[],
	"fitness_goal" text,
	"experience_level" text,
	"injuries_limitations" text[],
	"coaching_tone" text,
	"meditation_style" text,
	"meditation_voice" text,
	"meditation_duration_min" integer,
	"meditation_duration_max" integer,
	"reminder_preference" text,
	"profile_completeness" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_system_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enabled_systems" text[],
	"meditation_enabled" boolean DEFAULT false,
	"spiritual_enabled" boolean DEFAULT false,
	"astrology_enabled" boolean DEFAULT false,
	"journaling_enabled" boolean DEFAULT true,
	"meal_containers_enabled" boolean DEFAULT true,
	"ai_routing_enabled" boolean DEFAULT true,
	"preferred_wake_time" text,
	"preferred_sleep_time" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_system_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_values_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"faith_dietary_exclusions" text[],
	"strong_food_dislikes" text[],
	"meal_budget_level" text,
	"max_meal_prep_time_min" integer,
	"movement_environment" text[],
	"accessibility_needs" text[],
	"sensory_needs" text,
	"fixed_schedule_notes" text,
	"reminder_style" text,
	"additional_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_values_rules_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"first_name" text,
	"password" text,
	"system_name" text,
	"role" text DEFAULT 'user',
	"onboarding_completed" boolean DEFAULT false,
	"trial_start_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"oauth_provider" text,
	"oauth_id" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"logged_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wearable_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"heart_rate" integer,
	"stress_level" integer,
	"sleep_quality" integer,
	"activity_level" integer,
	"hrv_score" integer,
	"detected_mood" text,
	"biometric_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wearable_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_type" text NOT NULL,
	"device_name" text,
	"manufacturer" text,
	"is_active" boolean DEFAULT true,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_feedback_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"guest_id" varchar,
	"week_number" integer NOT NULL,
	"status" text DEFAULT 'draft',
	"answers" jsonb,
	"trial_start_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wellness_blueprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text DEFAULT 'My Wellness Blueprint',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wellness_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content_type" text NOT NULL,
	"category" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"difficulty" text,
	"equipment" text[],
	"goal_tags" text[],
	"mood_tags" text[],
	"diet_tags" text[],
	"instructions" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wellness_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"belief_system" text,
	"traditions" text[],
	"other_tradition" text,
	"meditation_enabled" boolean DEFAULT true,
	"journal_enabled" boolean DEFAULT true,
	"astrology_enabled" boolean DEFAULT false,
	"tarot_enabled" boolean DEFAULT false,
	"energy_work_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wellness_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workout_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"source" text DEFAULT 'import',
	"imported_document_id" varchar,
	"is_active" boolean DEFAULT true,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_session_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"step_index" integer NOT NULL,
	"title" text NOT NULL,
	"step_type" text NOT NULL,
	"completed" boolean DEFAULT false,
	"sets_completed" integer,
	"reps_per_set" text,
	"weight_per_set" text,
	"duration_seconds" integer,
	"distance_meters" real,
	"notes" text,
	"logged_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_plan_id" varchar,
	"title" text NOT NULL,
	"session_type" text DEFAULT 'strength',
	"status" text DEFAULT 'in_progress',
	"voice_coach_enabled" boolean DEFAULT true,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"duration_seconds" integer,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accountability_stats" ADD CONSTRAINT "accountability_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_completions" ADD CONSTRAINT "activity_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feature_usage" ADD CONSTRAINT "ai_feature_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_learnings" ADD CONSTRAINT "ai_learnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_pattern_snapshots" ADD CONSTRAINT "ai_pattern_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sync_items" ADD CONSTRAINT "ai_sync_items_session_id_ai_sync_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sync_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sync_sessions" ADD CONSTRAINT "ai_sync_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sync_sessions" ADD CONSTRAINT "ai_sync_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrology_predictions" ADD CONSTRAINT "astrology_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_profiles" ADD CONSTRAINT "baseline_profiles_blueprint_id_wellness_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."wellness_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_charts" ADD CONSTRAINT "birth_charts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_scans" ADD CONSTRAINT "body_scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_entries" ADD CONSTRAINT "category_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_status" ADD CONSTRAINT "completion_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_insights" ADD CONSTRAINT "conversation_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_mood_checkins" ADD CONSTRAINT "daily_mood_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_schedule_events" ADD CONSTRAINT "daily_schedule_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_blueprints" ADD CONSTRAINT "dimension_blueprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_systems" ADD CONSTRAINT "dimension_systems_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_conversation_processing_log" ADD CONSTRAINT "dw_conversation_processing_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_followups" ADD CONSTRAINT "dw_followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_followups" ADD CONSTRAINT "dw_followups_related_insight_id_dw_insights_id_fk" FOREIGN KEY ("related_insight_id") REFERENCES "public"."dw_insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_insights" ADD CONSTRAINT "dw_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_journal_entries" ADD CONSTRAINT "dw_journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevation_checks" ADD CONSTRAINT "elevation_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevation_plan_actions" ADD CONSTRAINT "elevation_plan_actions_plan_day_id_elevation_plan_days_id_fk" FOREIGN KEY ("plan_day_id") REFERENCES "public"."elevation_plan_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevation_plan_days" ADD CONSTRAINT "elevation_plan_days_plan_id_elevation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."elevation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevation_plans" ADD CONSTRAINT "elevation_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_workout_plan_id_workout_plans_id_fk" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_settings" ADD CONSTRAINT "feature_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_cleaning_tasks" ADD CONSTRAINT "household_cleaning_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_laundry_schedule" ADD CONSTRAINT "household_laundry_schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_document_items" ADD CONSTRAINT "imported_document_items_document_id_imported_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."imported_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_documents" ADD CONSTRAINT "imported_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_dimension_assessments" ADD CONSTRAINT "life_dimension_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_systems" ADD CONSTRAINT "life_systems_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_preferences" ADD CONSTRAINT "meal_prep_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_logs" ADD CONSTRAINT "mood_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_profiles" ADD CONSTRAINT "onboarding_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_chats" ADD CONSTRAINT "project_chats_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_reflections" ADD CONSTRAINT "recovery_reflections_blueprint_id_wellness_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."wellness_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_protocol" ADD CONSTRAINT "reset_protocol_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_content" ADD CONSTRAINT "saved_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shopping_list_id_shopping_lists_id_fk" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stabilizing_actions" ADD CONSTRAINT "stabilizing_actions_blueprint_id_wellness_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."wellness_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stress_signals" ADD CONSTRAINT "stress_signals_blueprint_id_wellness_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."wellness_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_preferences" ADD CONSTRAINT "support_preferences_blueprint_id_wellness_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."wellness_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_modules" ADD CONSTRAINT "system_modules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_accountability" ADD CONSTRAINT "task_accountability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_settings" ADD CONSTRAINT "tracker_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_logs" ADD CONSTRAINT "tracking_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universal_plans" ADD CONSTRAINT "universal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universal_plans" ADD CONSTRAINT "universal_plans_workout_plan_id_workout_plans_id_fk" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universal_plans" ADD CONSTRAINT "universal_plans_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universal_plans" ADD CONSTRAINT "universal_plans_shopping_list_id_shopping_lists_id_fk" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_profile" ADD CONSTRAINT "user_learning_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_patterns" ADD CONSTRAINT "user_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_system_preferences" ADD CONSTRAINT "user_system_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_values_rules" ADD CONSTRAINT "user_values_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_data" ADD CONSTRAINT "wearable_data_device_id_wearable_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_data" ADD CONSTRAINT "wearable_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_devices" ADD CONSTRAINT "wearable_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_feedback_responses" ADD CONSTRAINT "weekly_feedback_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_blueprints" ADD CONSTRAINT "wellness_blueprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_preferences" ADD CONSTRAINT "wellness_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session_steps" ADD CONSTRAINT "workout_session_steps_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session_steps" ADD CONSTRAINT "workout_session_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_plan_id_workout_plans_id_fk" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dw_conv_processing_log_user_conv_idx" ON "dw_conversation_processing_log" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elevation_checks_user_date_idx" ON "elevation_checks" USING btree ("user_id","checked_date");--> statement-breakpoint
CREATE UNIQUE INDEX "elevation_plans_user_status_start_source_idx" ON "elevation_plans" USING btree ("user_id","status","start_date","source_conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_oauth_provider_id_idx" ON "users" USING btree ("oauth_provider","oauth_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_session_steps_session_id_step_index_idx" ON "workout_session_steps" USING btree ("session_id","step_index");