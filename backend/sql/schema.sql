-- StudySync Database Schema
-- High-performance PostgreSQL schema with proper indexing

-- =====================================================
-- USERS TABLE
-- Source of truth: auth.users UUID is primary key
-- =====================================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  gmail_name text,
  username text unique not null,
  public_user_id varchar(7) unique not null,
  avatar_url text,
  display_name text,
  gender text,
  age integer,
  relationship_status text,
  preferred_sessions jsonb default '[]'::jsonb,
  onboarding_completed boolean default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for fast lookups
create index idx_users_username on users(username);
create index idx_users_public_id on users(public_user_id);
create index idx_users_email on users(email);
create index idx_users_onboarding on users(onboarding_completed) where onboarding_completed = false;

-- =====================================================
-- FRIENDSHIPS TABLE
-- Bi-directional relationship with status tracking
-- =====================================================
create type friendship_status as enum ('pending', 'accepted', 'rejected');

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references users(id) on delete cascade,
  receiver_id uuid references users(id) on delete cascade,
  status friendship_status default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, receiver_id)
);

-- Indexes for friendship queries
create index idx_friendships_requester on friendships(requester_id);
create index idx_friendships_receiver on friendships(receiver_id);
create index idx_friendships_status on friendships(status);
create index idx_friendships_both on friendships(requester_id, receiver_id, status);

-- =====================================================
-- SESSION TYPES TABLE
-- User-defined session categories
-- =====================================================
create table session_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create index idx_session_types_user on session_types(user_id);

-- =====================================================
-- SPACES TABLE
-- Collaborative study spaces
-- =====================================================
create table spaces (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references users(id),
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamptz default now()
);

create index idx_spaces_created_by on spaces(created_by);

-- =====================================================
-- SPACE MEMBERS TABLE
-- Space membership with roles
-- =====================================================
create type space_role as enum ('owner', 'member');

create table space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role space_role default 'member',
  joined_at timestamptz default now(),
  unique (space_id, user_id)
);

create index idx_space_members_space on space_members(space_id);
create index idx_space_members_user on space_members(user_id);
create index idx_space_members_role on space_members(space_id, role);

-- =====================================================
-- SPACE INVITES TABLE
-- Invitation system for private spaces
-- =====================================================
create type invite_status as enum ('pending', 'accepted', 'rejected');

create table space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,
  invited_user_id uuid references users(id),
  invited_by uuid references users(id),
  status invite_status default 'pending',
  created_at timestamptz default now(),
  unique (space_id, invited_user_id)
);

create index idx_space_invites_space on space_invites(space_id);
create index idx_space_invites_user on space_invites(invited_user_id);
create index idx_space_invites_status on space_invites(status);

-- =====================================================
-- SESSION EVENTS TABLE (MOST IMPORTANT)
-- Event-based time tracking - source of truth
-- No derived totals stored
-- =====================================================
create table session_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_type_id uuid references session_types(id),
  space_id uuid references spaces(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int,
  efficiency int check (efficiency >= 0 and efficiency <= 100),
  notes text,
  created_at timestamptz default now()
);

-- Critical indexes for hot paths
create index idx_session_user_time on session_events(user_id, started_at desc);
create index idx_session_space_time on session_events(space_id, started_at desc);
create index idx_session_user_active on session_events(user_id, ended_at) where ended_at is null;
create index idx_session_type on session_events(session_type_id);
create index idx_session_created on session_events(created_at desc);

-- =====================================================
-- USER STREAKS TABLE
-- Daily login streak tracking
-- =====================================================
create table user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique not null,
  current_streak int default 0,
  best_streak int default 0,
  last_updated date,
  streak_multiplier decimal(3,2) default 1.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_user_streaks_user on user_streaks(user_id);
create index idx_user_streaks_updated on user_streaks(last_updated);

-- =====================================================
-- SPACE ACTIVITY TABLE
-- Real-time activity feed for spaces
-- =====================================================
create table space_activity (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_space_activity_space on space_activity(space_id, created_at desc);
create index idx_space_activity_user on space_activity(user_id, created_at desc);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- User productivity view (aggregated stats)
create view user_productivity as
select 
  user_id,
  date_trunc('day', started_at) as day,
  count(*) as session_count,
  sum(duration_seconds) as total_seconds,
  avg(efficiency) as avg_efficiency
from session_events
where ended_at is not null
group by user_id, date_trunc('day', started_at);

-- Space productivity view
create view space_productivity as
select 
  space_id,
  date_trunc('day', started_at) as day,
  count(*) as session_count,
  sum(duration_seconds) as total_seconds,
  count(distinct user_id) as active_members
from session_events
where ended_at is not null and space_id is not null
group by space_id, date_trunc('day', started_at);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update session duration on end
create or replace function calculate_session_duration()
returns trigger as $$
begin
  if new.ended_at is not null and old.ended_at is null then
    new.duration_seconds := extract(epoch from (new.ended_at - new.started_at))::int;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-calculate duration
create trigger trg_calculate_session_duration
  before update on session_events
  for each row
  execute function calculate_session_duration();

-- Function to update space member count
create or replace function update_space_member_count()
returns trigger as $$
begin
  update spaces 
  set member_count = (select count(*) from space_members where space_id = new.space_id)
  where id = new.space_id;
  return new;
end;
$$ language plpgsql;

-- Trigger for member count updates (commented - use with caution)
-- create trigger trg_update_space_member_count
--   after insert or delete on space_members
--   for each row
--   execute function update_space_member_count();
