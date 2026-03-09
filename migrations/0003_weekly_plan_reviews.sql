-- PR #15: Add weekly_plan_reviews table
-- Stores the weekly review recap and user feedback for completed elevation plans.

CREATE TABLE "weekly_plan_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"wins" jsonb DEFAULT '[]'::jsonb,
	"friction_points" jsonb DEFAULT '[]'::jsonb,
	"completion_rate" integer,
	"feedback_worked" text,
	"feedback_improve" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "weekly_plan_reviews" ADD CONSTRAINT "weekly_plan_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_reviews" ADD CONSTRAINT "weekly_plan_reviews_plan_id_elevation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."elevation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_plan_reviews_user_plan_idx" ON "weekly_plan_reviews" USING btree ("user_id","plan_id");
