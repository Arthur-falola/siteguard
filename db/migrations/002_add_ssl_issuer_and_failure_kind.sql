-- SiteGuard migration 002: SSL issuer + check failure kind.
-- Additive only; safe to apply on a live database (IF NOT EXISTS).
-- recordCheckAndIncidents() also applies these two ALTERs idempotently
-- at runtime, so deployments that have not run this file yet keep working.

ALTER TABLE websites ADD COLUMN IF NOT EXISTS ssl_issuer text;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS failure_kind text;
