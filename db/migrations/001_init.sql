-- SiteGuard initial schema (001_init)
-- PostgreSQL, applied by scripts/migrate.mjs. Idempotent (IF NOT EXISTS)
-- so a re-run after a partial failure is safe.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reset_token_hash text,
  reset_token_expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  check_interval_minutes int NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'unknown',
  last_status_code int,
  last_response_time_ms int,
  last_checked_at timestamptz,
  ssl_expires_at timestamptz,
  ssl_days_remaining int,
  ssl_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites (user_id);
CREATE INDEX IF NOT EXISTS idx_websites_user_status ON websites (user_id, status);

CREATE TABLE IF NOT EXISTS checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  status_code int,
  response_time_ms int,
  ok boolean NOT NULL,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checks_website_checked_at ON checks (website_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  duration_seconds int,
  status text NOT NULL DEFAULT 'open',
  cause text
);
-- One open incident per website.
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_one_open_per_website
  ON incidents (website_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website_id uuid REFERENCES websites(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
