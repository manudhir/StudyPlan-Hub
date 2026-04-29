-- Migration: Add token rotation attack detection
-- Description: Adds family_id and revoked columns to support token family-based rotation

-- Add columns for token rotation detection
ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);

-- Improve search performance with trigram indexes (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_study_plans_title_trgm ON study_plans USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_study_plans_description_trgm ON study_plans USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON tasks USING GIN (title gin_trgm_ops);

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_followers_user_plan ON followers(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_tasks_plan_day ON tasks(plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_progress_plan_task ON progress(plan_id, task_id);
CREATE INDEX IF NOT EXISTS idx_ratings_plan_user ON ratings(plan_id, user_id);
