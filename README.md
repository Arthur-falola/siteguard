# SiteGuard — The Website Health Assistant for Freelancers and Agencies

A complete SaaS MVP: monitor your clients' websites from one dashboard — real
uptime checks, SSL expiry tracking, automatic incidents, in-app alerts.

**Status (10 Nov 2026): the application is built and verified locally
(`npm run build` passes, 26 routes). It is NOT yet deployed and NOT yet
connected to a database — see "What still needs Arthur" below. Nothing in the
app fakes data: without a database it says so honestly instead of showing
invented monitoring results.**

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- PostgreSQL via the `pg` driver + SQL migrations (`db/migrations/`)
- Auth: bcrypt password hashing + signed JWT sessions (`jose`), httpOnly cookie
- Charts: Recharts. No paid services required for the MVP.

## What is implemented

- **Landing page** (`/`): nav, hero, interactive dashboard preview (labelled
  "Illustrative preview — sample data"), features, how it works,
  freelancer/agency benefits, pricing, FAQ, footer. Pricing is labelled
  "Launch pricing — to be confirmed": Free $0 (1 site), Starter $9/mo (5
  sites), Pro $29/mo (20 sites). No payments are taken.
- **Auth**: sign up, login, logout, password reset (token hashed, 24 h
  expiry), protected `/app/*` routes (proxy + per-route checks), per-user data
  isolation (`user_id` scoping on every query).
- **Dashboard** (`/app`): Overview (totals, online/down, avg response time,
  uptime %, response-time chart, recent incidents/activity), Websites (CRUD),
  Incidents (open prominent, history with durations), Reports (uptime,
  response times, SSL, history, printable view), Settings, Account
  (change name/password).
- **Monitoring engine** (`src/lib/monitor.ts`): real server-side HTTP(S)
  checks — status code, response time, history; SSL certificate expiry
  (days remaining, warning at ≤ 14 days). SSRF-hardened: rejects localhost,
  private/loopback/link-local/reserved IPs (literal and DNS-resolved),
  `*.local`, embedded credentials; max 3 redirects, each re-validated;
  10 s timeouts.
- **Incidents**: auto-created on downtime, resolved on recovery with
  duration; at most one open incident per site (partial unique index).
- **Notifications**: in-app alerts for site down / recovered / SSL expiring
  (SSL alerts at most once per site per 24 h). Email architecture is ready
  (`src/lib/email.ts`, Resend) but **no email is sent** unless
  `RESEND_API_KEY` is configured — the app never claims otherwise.
- **Cron**: `vercel.json` schedules `/api/cron/check` daily at 08:00 UTC
  (Hobby plan allows one cron per day — the app states this honestly and
  does not claim 1-minute or 5-minute monitoring). Manual "Check now" per
  site is also available (rate-limited).
- **Plan limits enforced in the API**, not just the UI (Free 1 site / 7 days
  history, Starter 5 / 30 days, Pro 20 / 90 days).

## What still needs Arthur (nothing here costs money yet)

1. **A PostgreSQL database** (free tier is enough, e.g. Neon, Supabase, or
   Vercel Postgres/Neon integration). No Supabase account exists for Arthur
   yet and none was created by the agent. Once the database exists:
   - Set `DATABASE_URL` (connection string) in Vercel env vars.
   - Run `npm run db:migrate` (or `node scripts/migrate.mjs`) once — it
     creates the 6 tables (`users`, `websites`, `checks`, `incidents`,
     `notifications`, `subscriptions`).
2. **Environment variables** (Vercel → Project → Settings → Environment
   Variables; see `.env.example` — never commit real values):
   - `DATABASE_URL` — Postgres connection string (required for auth + data)
   - `SESSION_SECRET` — long random string for session JWTs (required)
   - `CRON_SECRET` — long random string; Vercel Cron sends it as a Bearer
     token to `/api/cron/check` (required in production)
   - `NEXT_PUBLIC_APP_URL` — the deployed URL, e.g.
     `https://siteguard-xxx.vercel.app` (used in password-reset links)
   - `RESEND_API_KEY` — optional; only if password-reset / alert emails
     should actually be sent (Resend free tier works)
3. **GitHub repo + Vercel project — BLOCKED on permissions (10 Nov 2026)**:
   - GitHub: `create_repository` via the connected GitHub App returns
     `403 Resource not accessible by integration` — the App cannot create
     repos under `Arthur-falola`. Fix: Arthur creates the empty public repo
     `siteguard` himself on github.com (or grants the App repo-creation
     scope), then the code in `~/workspace/siteguard-app` (already a git
     repo, committed locally) can be pushed to it.
   - Vercel: every project/deployment call via the connected Vercel MCP
     (`create_project`, `create_deployment`, `create_git_project`,
     `list_projects`) returns `403 … Trying to access resource under scope
     "arthurfalola-8382s-projects". You must re-authenticate to this scope`.
     The API's suggested fix (`authorize_team_access`) does not exist in the
     MCP tool list (checked: 0 matches in 177 tools). Fix: Arthur grants
     this Vercel connection access to the `arthurfalola-8382s-projects`
     scope (Vercel consent / app installation), then retry; or Arthur runs
     `vercel login` + `vercel deploy` from the project folder himself.
   - Until then there is **no live URL and no GitHub repo URL** to report.
     The code is complete and committed locally in `~/workspace/siteguard-app`.

## Local development

```bash
npm install
cp .env.example .env.local   # fill DATABASE_URL, SESSION_SECRET, CRON_SECRET
npm run db:migrate           # creates the tables
npm run dev                  # http://localhost:3000
npm run build                # production build check
```

Without `DATABASE_URL`, the app still runs: the landing page works, and the
dashboard shows an honest "Database not connected" state.

## How to use (once deployed + database connected)

1. Open the live URL → **Start Monitoring** → create an account (Free plan:
   1 website).
2. **Websites → Add website**: name + URL (e.g. `https://example.com`).
   Click **Check now** for an immediate real check, or wait for the daily
   08:00 UTC cron.
3. **Overview** shows status, uptime and response times; **Incidents**
   lists every downtime with start/end/duration; **Reports** gives a
   per-site health summary you can print.
4. The bell icon shows in-app alerts (down / recovered / SSL expiring).

## Project structure

- `src/app/page.tsx` + `src/components/landing/` — public landing page
- `src/app/(auth)/` — login / register / forgot-password / reset-password
- `src/app/app/` — protected dashboard (overview, websites, incidents,
  reports, settings, account)
- `src/app/api/` — auth, sites CRUD, manual check, cron, incidents,
  notifications, account
- `src/lib/` — `db.ts`, `auth.ts`, `monitor.ts` (SSRF-safe checks),
  `notify.ts` (checks + incidents), `plans.ts`, `rate-limit.ts`, `email.ts`
- `db/migrations/001_init.sql` — full schema; `scripts/migrate.mjs` — runner
- `proxy.ts` — protects `/app/*` (Next.js 16 `proxy` convention)
- `vercel.json` — daily cron
