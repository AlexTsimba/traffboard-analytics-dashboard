CREATE TYPE "public"."chart_type" AS ENUM('area', 'line', 'bar');--> statement-breakpoint
CREATE TYPE "public"."date_range" AS ENUM('7d', '30d', '90d', '1y');--> statement-breakpoint
CREATE TYPE "public"."metric_group" AS ENUM('general', 'visit-to-reg', 'reg-to-ftd', 'quality');--> statement-breakpoint
CREATE TYPE "public"."refresh_interval" AS ENUM('off', '30s', '1m', '5m', '15m');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user', 'viewer');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"default_date_range" date_range DEFAULT '30d',
	"default_chart_type" chart_type DEFAULT 'area',
	"default_metric_group" "metric_group" DEFAULT 'general',
	"auto_refresh_interval" "refresh_interval" DEFAULT 'off',
	"compact_mode" boolean DEFAULT false,
	"dark_mode" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"partner_id" integer NOT NULL,
	"original_value" varchar(255) NOT NULL,
	"original_field" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"partner_id" integer NOT NULL,
	"original_value" varchar(255) NOT NULL,
	"original_field" varchar(100) NOT NULL,
	"campaign_type" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"partner_id" integer NOT NULL,
	"original_value" varchar(255) NOT NULL,
	"original_field" varchar(100) NOT NULL,
	"category" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"partner_id" integer NOT NULL,
	"original_value" varchar(255) NOT NULL,
	"original_field" varchar(100) NOT NULL,
	"source_type" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"language" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"daily_reports" boolean DEFAULT false,
	"weekly_reports" boolean DEFAULT true,
	"alert_thresholds" boolean DEFAULT true,
	"system_updates" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_player_id_unique";--> statement-breakpoint
ALTER TABLE "partner_settings" ADD COLUMN "dimension_mappings" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyers_partner_value_idx" ON "buyers" USING btree ("partner_id","original_value");--> statement-breakpoint
CREATE INDEX "buyers_name_idx" ON "buyers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "campaigns_partner_value_idx" ON "campaigns" USING btree ("partner_id","original_value");--> statement-breakpoint
CREATE INDEX "campaigns_name_idx" ON "campaigns" USING btree ("name");--> statement-breakpoint
CREATE INDEX "funnels_partner_value_idx" ON "funnels" USING btree ("partner_id","original_value");--> statement-breakpoint
CREATE INDEX "funnels_name_idx" ON "funnels" USING btree ("name");--> statement-breakpoint
CREATE INDEX "funnels_category_idx" ON "funnels" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sources_partner_value_idx" ON "traffic_sources" USING btree ("partner_id","original_value");--> statement-breakpoint
CREATE INDEX "sources_name_idx" ON "traffic_sources" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sources_type_idx" ON "traffic_sources" USING btree ("source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "player_date_unique" ON "players" USING btree ("player_id","date");--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "partners_email";