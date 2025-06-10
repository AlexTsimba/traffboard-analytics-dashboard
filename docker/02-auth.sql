-- Authentication System Tables

-- Create user role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"role" user_role DEFAULT 'user',
	"is_verified" boolean DEFAULT false,
	"two_factor_secret" text,
	"two_factor_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY,
	"user_id" integer REFERENCES users(id) ON DELETE CASCADE,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Create refresh tokens table
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" text PRIMARY KEY,
	"user_id" integer REFERENCES users(id) ON DELETE CASCADE,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Create auth indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
