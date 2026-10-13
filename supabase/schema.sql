-- =========================================================================
-- ARONEX 1.0 — Supabase database setup
-- -------------------------------------------------------------------------
-- HOW TO RUN
--   1. Open your project in the Supabase dashboard.
--   2. Go to "SQL Editor" → "New query".
--   3. Replace YOUR_ADMIN_EMAIL@example.com below with the EXACT email of the
--      organiser Auth user you created in Authentication → Users.
--   4. Paste this whole file and click "Run".
--   5. Sign out of the admin page and sign in again so your session gets the
--      updated "admin" claim.
--
-- If the email is wrong, the role update affects ZERO users and the dashboard
-- will show no data.
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1. Registration table
-- ---------------------------------------------------------------------------
create table if not exists public.aronex_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  competition text not null
    check (competition in ('Ideathon', 'Poster Presentation')),

  domain text not null,
  team_leader_name text not null
    check (length(trim(team_leader_name)) between 2 and 100),
  team_leader_phone text not null,
  team_leader_email text not null,
  participant2_name text not null
    check (length(trim(participant2_name)) between 2 and 100),
  participant2_phone text not null,
  participant2_email text not null,

  college_name text not null,
  course text not null,
  academic_year text not null,
  project_title text,

  registration_fee integer not null default 200
    check (registration_fee = 200),

  payment_reference text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'submitted', 'verified', 'rejected')),

  constraint distinct_team_members
    check (lower(trim(team_leader_email)) <> lower(trim(participant2_email)))
);

-- Helpful index for the admin list (newest first)
create index if not exists aronex_registrations_created_at_idx
  on public.aronex_registrations (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Enable row-level security
-- ---------------------------------------------------------------------------
alter table public.aronex_registrations
  enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Remove broad default permissions, then grant the minimum
-- ---------------------------------------------------------------------------
revoke all on public.aronex_registrations from anon, authenticated;

-- Students may submit registrations…
grant insert on public.aronex_registrations to anon;

-- …and signed-in users may attempt to read/update (RLS narrows this to admins)
grant select, update on public.aronex_registrations to authenticated;

-- Public may ONLY insert a well-formed, unpaid registration.
-- NOTE: this public insert path is intentionally open. Add server-side
-- validation, rate limiting and a CAPTCHA before accepting real data at scale.
create policy "Public can submit team registrations"
on public.aronex_registrations
for insert
to anon
with check (
  competition in ('Ideathon', 'Poster Presentation')
  and registration_fee = 200
  and payment_status = 'pending'
);

-- ---------------------------------------------------------------------------
-- 4. Assign the admin role to your existing Auth user.
--    >>> REPLACE THE EMAIL BELOW BEFORE RUNNING <<<
-- ---------------------------------------------------------------------------
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com');

-- ---------------------------------------------------------------------------
-- 5. Only users whose trusted app_metadata role is "admin" may view/update.
-- ---------------------------------------------------------------------------
create policy "Admins can view registrations"
on public.aronex_registrations
for select
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy "Admins can update registrations"
on public.aronex_registrations
for update
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ---------------------------------------------------------------------------
-- Verify the admin role was applied (should return 1 row for your admin):
-- ---------------------------------------------------------------------------
-- select email, raw_app_meta_data -> 'role' as role
-- from auth.users
-- where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com');
