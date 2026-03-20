CREATE TABLE "accountability_partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" varchar NOT NULL,
	"recipient_id" varchar,
	"invited_email" text NOT NULL,
	"invite_token" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"unlinked_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "accountability_partners_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "community_opportunities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"is_online" boolean DEFAULT false,
	"location" text,
	"url" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"match_score" real DEFAULT 0.5,
	"featured" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_community_opportunities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"opportunity_id" varchar NOT NULL,
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
ALTER TABLE "users" ADD COLUMN "coaching_mode" text DEFAULT 'gentle';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_tier" text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "wellness_preferences" ADD COLUMN "use_astrology_in_guidance" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "wellness_preferences" ADD COLUMN "use_numerology_in_guidance" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "accountability_partners" ADD CONSTRAINT "accountability_partners_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accountability_partners" ADD CONSTRAINT "accountability_partners_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_community_opportunities" ADD CONSTRAINT "saved_community_opportunities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_community_opportunities" ADD CONSTRAINT "saved_community_opportunities_opportunity_id_community_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."community_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_reviews" ADD CONSTRAINT "weekly_plan_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_reviews" ADD CONSTRAINT "weekly_plan_reviews_plan_id_elevation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."elevation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_opp_title_org_idx" ON "community_opportunities" USING btree ("title","organization");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_community_opp_user_opp_idx" ON "saved_community_opportunities" USING btree ("user_id","opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_plan_reviews_user_plan_idx" ON "weekly_plan_reviews" USING btree ("user_id","plan_id");