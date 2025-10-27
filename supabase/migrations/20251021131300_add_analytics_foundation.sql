-- Adds analytics scaffolding for tracking user engagement.
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  platform text,
  app_version text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_user_id_idx on public.user_sessions (user_id);
create index if not exists user_sessions_started_at_idx on public.user_sessions (started_at);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.user_sessions(id) on delete set null,
  event_name text not null,
  event_source text default 'app',
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at);

-- helper view to summarize recent engagement
create or replace view public.analytics_event_summary as
select
  date_trunc('day', occurred_at) as day,
  event_name,
  count(*) as event_count
from public.analytics_events
where occurred_at >= now() - interval '30 days'
group by day, event_name
order by day desc, event_name;
