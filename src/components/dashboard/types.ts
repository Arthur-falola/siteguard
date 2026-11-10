export interface WebsiteRow {
  id: string;
  user_id: string;
  name: string;
  url: string;
  check_interval_minutes: number;
  is_active: boolean;
  status: string;
  last_status_code: number | null;
  last_response_time_ms: number | null;
  last_checked_at: string | null;
  ssl_expires_at: string | null;
  ssl_days_remaining: number | null;
  ssl_error: string | null;
  ssl_issuer: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckRow {
  id: string;
  website_id: string;
  status_code: number | null;
  response_time_ms: number | null;
  ok: boolean;
  error: string | null;
  failure_kind: string | null;
  checked_at: string;
  website_name?: string;
  website_url?: string;
}

export interface IncidentRow {
  id: string;
  website_id: string;
  user_id: string;
  started_at: string;
  resolved_at: string | null;
  duration_seconds: number | null;
  status: string;
  cause: string | null;
  website_name?: string;
  website_url?: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  website_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}
