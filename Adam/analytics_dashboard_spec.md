# Tiny Time Growth Analytics Dashboard Spec

## 1) Objective
Build a **new standalone web dashboard repo** for product/growth analytics that reads production data from the existing Firebase project (`baby-feeding-tracker-978e6`) and stores analytics-ready aggregates in Supabase for fast charting and drill-down.

Primary outcomes:
- Daily active usage visibility
- Retention health visibility
- Viral/share behavior visibility
- Per-user and per-feature behavioral visibility

## 2) Metrics (Locked Definitions)

### 2.1 Core
- `DAU(D)`: Distinct users with at least one qualifying event on day `D`.
- `T7(D)`: Distinct users active in days `[D-6, D]`.
- `Signups(D)`: Users whose `users.createdAt` falls on day `D`.

### 2.2 Retention
For signup cohort day `C`:
- `D1(C)`: % of users signed up on `C` that are active on `C+1`
- `D3(C)`: active on `C+3`
- `D7(C)`: active on `C+7`
- `D14(C)`: active on `C+14`
- `D28(C)`: active on `C+28`

Formula:
- `Retention_N(C) = retained_users(C, N) / signups(C)`

### 2.3 L-ness
Use stickiness definition:
- `Lness(D) = DAU(D) / T7(D)` (percent)

### 2.4 K-factor
Daily viral coefficient:
- `InvitesSent(D)`: count of invite docs created on day `D`
- `AcceptedFromDSends(D)`: invites created on `D` and accepted within 7 days
- `InvitesPerActive(D) = InvitesSent(D) / DAU(D)`
- `InviteConversion(D) = AcceptedFromDSends(D) / InvitesSent(D)`
- `KFactor(D) = InvitesPerActive(D) * InviteConversion(D)`

### 2.5 Shares/App Open
- `SharesPerUser(D) = InvitesSent(D) / DAU(D)`
- `AppOpensPerUser(D) = AppOpenEvents(D) / DAU(D)`

### 2.6 Logs Per Day Per User (by category)
- `BottleLogsPerUser(D) = bottle_logs(D) / DAU(D)` from `feedings`
- `SolidsLogsPerUser(D) = solids_logs(D) / DAU(D)` from `solidsSessions`
- `NursingLogsPerUser(D) = nursing_logs(D) / DAU(D)` from `nursingSessions`
- `SleepLogsPerUser(D) = sleep_logs(D) / DAU(D)` from `sleepSessions`
- `DiaperLogsPerUser(D) = diaper_logs(D) / DAU(D)` from `diaperChanges`

### 2.7 Qualifying “Active” Event
An event counts toward active user status if it is one of:
- `app_open`
- any tracker write (bottle, solids, nursing, sleep, diaper)
- invite creation or invite accept

### 2.8 Null/Zero Handling
If denominator is `0`, return `0` (never `NaN`).

### 2.9 Timezone
All day bucketing in `America/Los_Angeles`.

## 3) Page UX and Layout (Exact)

### 3.1 Overall Shell
- Left sidebar:
  - Overview
  - Acquisition
  - Retention
  - Virality
  - Engagement
  - Users
  - Entity Admin (Page 2)
  - Data Quality
- Top filter bar:
  - Date range (default last 90d)
  - Platform (`all/iOS/Android/Web`)
  - App version
  - Country
  - Family size bucket
- Main content is card-based, responsive grid.

### 3.2 Overview Page
Top KPI row:
- DAU (current day)
- T7
- L-ness
- K-factor
- Signups
- App opens per user

Charts:
- DAU + T7 line chart
- Signups daily line chart
- Logs/User multi-line (bottle/solids/nursing/sleep/diaper)
- Shares/User and K-factor dual-axis chart

### 3.3 Retention Page
- Multi-line chart with D1, D3, D7, D14, D28 over cohort day
- Cohort heatmap table
- Small cards for latest D1/D7/D28

### 3.4 Virality Page
- Invites sent daily
- Invite conversion
- K-factor
- Table: top inviters, invites sent, accepted, acceptance rate

### 3.5 Engagement Page
- App opens per day per user
- Logs/user by category multi-line
- Feature adoption % (7d and 28d active users using each feature)

### 3.6 Users Page
Table columns:
- user id
- email/displayName
- signup date
- last active
- family count + family names
- kid count
- active today / active 7d / active 28d
- features used (7d/28d)
- invites sent, invites accepted, shares/user (28d)
- app opens/day (28d avg)
- bottle/solids/nursing/sleep/diaper logs/day/user (28d avg)

User detail drawer:
- activity timeline
- family and kid membership details
- feature usage summary

### 3.7 Data Quality Page
- Events with missing `user_id`
- Late arrivals (ingested >24h late)
- Duplicate event checks
- ETL last successful run timestamp

### 3.8 Entity Admin Page (Page 2)
Purpose: operational management of `users`, `families`, and `kids` with bi-directional navigation.

Primary navigation:
- Sidebar/tab entry: `Entity Admin`
- Sub-tabs in page:
  - `Users`
  - `Families`
  - `Kids`

List views:
- `Users` table:
  - uid, email, displayName, createdAt, lastActiveAt, family count, kid count
  - click row/name opens `/entity/users/[uid]`
- `Families` table:
  - familyId, name, createdAt, members count, kids count, primaryKidId
  - click row/name opens `/entity/families/[familyId]`
- `Kids` table:
  - kidId, name, familyId, ownerId, members count, birthDate, createdAt
  - click row/name opens `/entity/kids/[kidId]?familyId=...`

Detail pages:
- User detail `/entity/users/[uid]`
  - profile fields + membership graph (families and kids)
  - activity summary (7d/28d)
  - invite history (created/accepted)
  - actions: disable analytics access, trigger data refresh, archive user, hard delete user
- Family detail `/entity/families/[familyId]`
  - family meta (`name`, `members`, `primaryKidId`)
  - kids list with links
  - member list with links
  - actions: rename family, set primary kid, archive family, hard delete family
- Kid detail `/entity/kids/[kidId]`
  - kid profile (`name`, `ownerId`, `birthDate`, `members`)
  - parent family context and linked members
  - feature usage snapshot for this kid
  - actions: update kid profile metadata, archive kid, hard delete kid

Relationship model (from current app data):
- `families/{familyId}.members` is source of user-family membership.
- `families/{familyId}/kids/{kidId}.members` is user-kid membership.
- `families/{familyId}.primaryKidId` indicates default kid.
- invite accept flow adds user to both family members and all kid members.

Recommended backend approach:
- Use server routes with Firebase Admin SDK for all Entity Admin reads/writes.
- Mirror normalized entities into Supabase read models for fast filtering/sorting:
  - `entity_users`
  - `entity_families`
  - `entity_kids`
  - `entity_memberships` (`user_id`, `family_id`, `kid_id`, `source`)
- Keep writes authoritative in Firebase, then enqueue sync to Supabase.
- For hard deletes in Firebase:
  - user: remove from `families.members`, `kids.members`, then delete `users/{uid}` and optional auth account.
  - family: recursive delete `families/{familyId}` and related invite docs.
  - kid: delete `families/{familyId}/kids/{kidId}` subtree and clear `primaryKidId` if it matched.

Safety rules:
- Soft delete (archive) is first-class in UI.
- Hard delete is behind a `Danger Zone` panel and requires typed confirmation.
- Hard delete requires impact preview (counts of families/kids/memberships/events affected).
- All mutations require confirmation modal + audit log entry.
- Restrict page to admin allowlist only.

Suggested routes/components:
- `app/(dashboard)/entity/page.tsx` (tab shell)
- `app/(dashboard)/entity/users/[uid]/page.tsx`
- `app/(dashboard)/entity/families/[familyId]/page.tsx`
- `app/(dashboard)/entity/kids/[kidId]/page.tsx`
- `components/entity/EntityTable.tsx`
- `components/entity/EntityDetailHeader.tsx`
- `components/entity/RelationshipGraph.tsx`

## 4) Data Architecture

### 4.1 Source of Truth: Firebase
- Firestore project: `baby-feeding-tracker-978e6`
- Source collections:
  - `users/{uid}`
  - `families/{familyId}`
  - `families/{familyId}/kids/{kidId}/feedings/{docId}`
  - `.../solidsSessions/{docId}`
  - `.../nursingSessions/{docId}`
  - `.../sleepSessions/{docId}`
  - `.../diaperChanges/{docId}`
  - `invites/{code}`

### 4.2 Analytics Store: Supabase (recommended)
Use Supabase Postgres for:
- fast chart queries
- SQL cohort math
- easy row-level admin panel integrations
- materialized views if needed

### 4.3 Flow
1. Extract raw events from Firebase with Admin SDK.
2. Normalize to canonical event rows (`analytics_events_raw`).
3. Compute daily aggregates (`analytics_daily_metrics`).
4. Compute cohorts (`analytics_retention_daily`).
5. Compute user rollups (`analytics_user_rollups_daily`).
6. Dashboard reads only Supabase analytics tables.

## 5) Supabase Schema (Starter SQL)

```sql
create table if not exists analytics_events_raw (
  id bigserial primary key,
  event_id text not null unique,
  event_type text not null,
  event_ts timestamptz not null,
  event_day date not null,
  user_id text,
  family_id text,
  kid_id text,
  platform text,
  app_version text,
  country text,
  payload jsonb default '{}'::jsonb,
  inserted_at timestamptz default now()
);

create index if not exists idx_events_day on analytics_events_raw(event_day);
create index if not exists idx_events_user_day on analytics_events_raw(user_id, event_day);
create index if not exists idx_events_type_day on analytics_events_raw(event_type, event_day);

create table if not exists analytics_daily_metrics (
  metric_day date primary key,
  dau integer not null default 0,
  t7 integer not null default 0,
  signups integer not null default 0,
  lness numeric(8,4) not null default 0,
  invites_sent integer not null default 0,
  invites_accepted_from_sends integer not null default 0,
  invite_conversion numeric(8,4) not null default 0,
  k_factor numeric(8,4) not null default 0,
  shares_per_user numeric(8,4) not null default 0,
  app_opens integer not null default 0,
  app_opens_per_user numeric(8,4) not null default 0,
  bottle_logs integer not null default 0,
  solids_logs integer not null default 0,
  nursing_logs integer not null default 0,
  sleep_logs integer not null default 0,
  diaper_logs integer not null default 0,
  bottle_logs_per_user numeric(8,4) not null default 0,
  solids_logs_per_user numeric(8,4) not null default 0,
  nursing_logs_per_user numeric(8,4) not null default 0,
  sleep_logs_per_user numeric(8,4) not null default 0,
  diaper_logs_per_user numeric(8,4) not null default 0,
  updated_at timestamptz default now()
);

create table if not exists analytics_retention_daily (
  cohort_day date primary key,
  cohort_size integer not null default 0,
  r1 numeric(8,4) not null default 0,
  r3 numeric(8,4) not null default 0,
  r7 numeric(8,4) not null default 0,
  r14 numeric(8,4) not null default 0,
  r28 numeric(8,4) not null default 0,
  updated_at timestamptz default now()
);

create table if not exists analytics_user_rollups_daily (
  rollup_day date not null,
  user_id text not null,
  email text,
  display_name text,
  signup_day date,
  last_active_day date,
  family_count integer not null default 0,
  family_names text[] default '{}',
  kid_count integer not null default 0,
  active_today boolean not null default false,
  active_7d boolean not null default false,
  active_28d boolean not null default false,
  invites_sent_28d integer not null default 0,
  invites_accepted_28d integer not null default 0,
  shares_per_user_28d numeric(8,4) not null default 0,
  app_opens_per_day_28d numeric(8,4) not null default 0,
  bottle_logs_per_day_per_user_28d numeric(8,4) not null default 0,
  solids_logs_per_day_per_user_28d numeric(8,4) not null default 0,
  nursing_logs_per_day_per_user_28d numeric(8,4) not null default 0,
  sleep_logs_per_day_per_user_28d numeric(8,4) not null default 0,
  diaper_logs_per_day_per_user_28d numeric(8,4) not null default 0,
  features_used_7d text[] default '{}',
  features_used_28d text[] default '{}',
  primary key (rollup_day, user_id)
);
```

### 5.1 Entity Admin read-model tables (for Page 2)
```sql
create table if not exists entity_users (
  user_id text primary key,
  email text,
  display_name text,
  photo_url text,
  created_at timestamptz,
  last_active_at timestamptz,
  family_count integer not null default 0,
  kid_count integer not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by text,
  updated_at timestamptz default now()
);

create table if not exists entity_families (
  family_id text primary key,
  name text,
  created_at timestamptz,
  primary_kid_id text,
  members_count integer not null default 0,
  kids_count integer not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by text,
  updated_at timestamptz default now()
);

create table if not exists entity_kids (
  kid_id text not null,
  family_id text not null,
  name text,
  owner_id text,
  birth_date bigint,
  created_at timestamptz,
  members_count integer not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by text,
  primary key (family_id, kid_id)
);

create table if not exists entity_memberships (
  id bigserial primary key,
  user_id text not null,
  family_id text,
  kid_id text,
  relation_type text not null, -- family_member | kid_member | owner
  source text not null default 'firebase',
  unique(user_id, family_id, kid_id, relation_type)
);

create table if not exists entity_admin_audit_log (
  id bigserial primary key,
  actor_user_id text not null,
  action text not null, -- archive_user | restore_user | hard_delete_user | ...
  entity_type text not null, -- user | family | kid
  entity_id text not null,
  reason text,
  impact_preview jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

### 5.2 Entity Admin API contract (server-only)
- `GET /api/entity/users?search=&cursor=`
- `GET /api/entity/families?search=&cursor=`
- `GET /api/entity/kids?search=&familyId=&cursor=`
- `GET /api/entity/users/:uid`
- `GET /api/entity/families/:familyId`
- `GET /api/entity/kids/:kidId?familyId=...`
- `POST /api/entity/families/:familyId/rename`
- `POST /api/entity/families/:familyId/set-primary-kid`
- `POST /api/entity/kids/:kidId/update-profile?familyId=...`
- `POST /api/entity/users/:uid/archive`
- `POST /api/entity/users/:uid/restore`
- `POST /api/entity/users/:uid/hard-delete`
- `POST /api/entity/families/:familyId/archive`
- `POST /api/entity/families/:familyId/restore`
- `POST /api/entity/families/:familyId/hard-delete`
- `POST /api/entity/kids/:kidId/archive?familyId=...`
- `POST /api/entity/kids/:kidId/restore?familyId=...`
- `POST /api/entity/kids/:kidId/hard-delete?familyId=...`
- `POST /api/entity/impact-preview`

All mutating endpoints:
- validate input with Zod
- write to Firebase first
- write audit record
- trigger async Supabase mirror refresh

Delete behavior:
- `archive`: set `is_archived=true`, preserve data.
- `restore`: set `is_archived=false`.
- `hard-delete`: irreversible, only allowed after typed confirmation and successful impact preview.

## 6) Firebase Extraction Notes

### 6.1 Existing relevant fields in current app
- User profile timestamps: `users/{uid}.createdAt`, `users/{uid}.lastActiveAt`
- Invite fields: `invites.{createdBy, createdAt, used, usedBy, usedAt, familyId, kidId}`
- Tracker actor fields: tracker docs include `createdByUid`; sleep start includes `startedByUid`

### 6.2 Canonical event mapping
- `app_open`: if present from analytics stream or custom log sink
- `signup`: from `users.createdAt`
- `invite_created`: `invites.createdAt`
- `invite_accepted`: `invites.usedAt`
- `bottle_log`: `feedings.createdAt|timestamp`
- `solids_log`: `solidsSessions.createdAt|timestamp`
- `nursing_log`: `nursingSessions.createdAt|timestamp`
- `sleep_log`: `sleepSessions.createdAt|startTime`
- `diaper_log`: `diaperChanges.createdAt|timestamp`

## 7) ETL/Sync Jobs

### 7.1 Jobs
- `backfill` job: last 365 days
- `daily` job: run hourly, recompute last 35 days (handles late events)
- `user_rollup` job: daily at 02:15 PT

### 7.2 Idempotency
- Upsert by deterministic `event_id`:
  - e.g. `firestore:${collection_path}:${doc_id}:${event_type}`
- Always reprocess sliding window (35 days).

### 7.3 Pseudocode (TypeScript)
```ts
for (const day of eachDay(windowStart, windowEnd)) {
  const events = await loadEventsFromFirestore(dayStartPT, dayEndPT);
  await upsertRawEvents(events);
  const daily = computeDailyMetrics(events, prior6DaysEvents);
  await upsertDailyMetric(day, daily);
}

const cohorts = await computeRetentionFromRaw();
await upsertRetentionRows(cohorts);

const rollups = await computeUserRollups(asOfDay);
await upsertUserRollups(rollups);
```

## 8) Dashboard Repo Build Guide for AI Agent

### 8.1 Stack
- Next.js 15 + TypeScript
- Tailwind + Recharts (or ECharts)
- Supabase JS client
- Firebase Admin SDK (server-only job runtime)
- Zod for schema validation

### 8.2 Repo structure
```txt
tiny-analytics-dashboard/
  app/
    (dashboard)/overview/page.tsx
    (dashboard)/retention/page.tsx
    (dashboard)/virality/page.tsx
    (dashboard)/engagement/page.tsx
    (dashboard)/users/page.tsx
    (dashboard)/data-quality/page.tsx
    api/etl/daily/route.ts
    api/etl/backfill/route.ts
  lib/
    firebase-admin.ts
    supabase-admin.ts
    metrics.ts
    retention.ts
    queries.ts
  components/
    dashboard/MetricCard.tsx
    dashboard/FilterBar.tsx
    dashboard/LinePanel.tsx
    dashboard/UserTable.tsx
  sql/
    001_analytics_schema.sql
  docs/
    METRIC_DEFINITIONS.md
```

### 8.3 Env vars
```bash
FIREBASE_PROJECT_ID=baby-feeding-tracker-978e6
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANALYTICS_TZ=America/Los_Angeles
```

### 8.4 Firebase Admin init
```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getFirebaseDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}
```

### 8.5 Supabase Admin init
```ts
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

### 8.6 Daily metrics computation stub
```ts
function safeDiv(num: number, den: number) {
  return den === 0 ? 0 : num / den;
}

export function computeDailyMetrics(dayEvents: EventRow[], t7Users: Set<string>) {
  const dauUsers = new Set(dayEvents.map(e => e.user_id).filter(Boolean));
  const dau = dauUsers.size;
  const t7 = t7Users.size;
  const lness = safeDiv(dau, t7);

  const invitesSent = dayEvents.filter(e => e.event_type === "invite_created").length;
  const invitesAccepted = dayEvents.filter(e => e.event_type === "invite_accepted_from_d_send").length;
  const inviteConversion = safeDiv(invitesAccepted, invitesSent);
  const kFactor = safeDiv(invitesSent, dau) * inviteConversion;

  return { dau, t7, lness, invitesSent, invitesAccepted, inviteConversion, kFactor };
}
```

## 9) Security and Access
- Dashboard should require admin login (allowlist emails).
- Never expose Firebase service account key client-side.
- Never expose Supabase service role key client-side.
- Public pages off by default.

## 10) Data Quality Rules
- Drop events without usable timestamp.
- Keep events with missing user id but track in data quality counters.
- Deduplicate by `event_id`.
- Recompute rolling windows nightly.

## 11) Performance Expectations
- Overview page load under 1.5s from Supabase aggregates.
- Users table server-side pagination (`limit/offset` or cursor).
- 90-day charts via single aggregated query each.

## 12) Definition of Done
- All locked metrics rendered and match formulas.
- Filters affect all charts and tables consistently.
- ETL jobs runnable for backfill + daily incremental.
- Data quality page populated.
- User table + user detail drawer functional.
- Deployable with env vars only.

## 13) Source references copied into `Adam/references`
This folder includes concrete source files from this repo to guide implementation and schema mapping.
