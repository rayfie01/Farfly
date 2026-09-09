-- Proposed schema for a NEW Supabase project. Review and apply through a generated
-- Supabase CLI migration before enabling cloud persistence. Not applied by this build.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', avatar_url text,
 adaptive_recommendations boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.provider_connections (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in ('pinterest','soundcloud')),
 external_user_id text, connected_at timestamptz not null default now(),
 unique(user_id,provider)
);
-- OAuth secrets never belong in the public schema; persist encrypted credentials
-- through a server-only secret store, referencing provider_connections.id.
create table public.boards (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 external_id text not null,name text not null,enabled boolean not null default true,
 unique(user_id,external_id)
);
create table public.pins (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 external_id text not null,provider text not null,board_id uuid references public.boards(id) on delete set null,
 title text,image_url text not null,source_url text,updated_at timestamptz not null default now(),
 unique(user_id,provider,external_id)
);
create table public.pin_analysis (
 pin_id uuid primary key references public.pins(id) on delete cascade,
 descriptors jsonb not null default '[]',mood_vector jsonb not null,
 model_version text not null,analyzed_at timestamptz not null default now()
);
create table public.pin_interactions (
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 pin_id uuid not null references public.pins(id) on delete cascade,
 kind text not null check(kind in ('open','like','save','dwell','dislike')),
 dwell_ms integer check(dwell_ms>=0),created_at timestamptz not null default now()
);
create table public.tracks (
 id uuid primary key default gen_random_uuid(),provider text not null,external_id text not null,
 title text not null,artist text not null,artwork_url text,permalink text,
 duration_ms integer check(duration_ms>=0),tags jsonb not null default '[]',
 updated_at timestamptz not null default now(),unique(provider,external_id)
);
-- Do not persist expiring playable URLs. Resolve them on the server at playback time.
create table public.track_interactions (
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 track_id uuid not null references public.tracks(id) on delete cascade,
 kind text not null check(kind in ('play','half','finish','like','replay','skip','dislike','block_artist')),
 created_at timestamptz not null default now()
);
create table public.mood_sessions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,mood_vector jsonb not null,tags jsonb not null default '[]',
 artwork_url text,created_at timestamptz not null default now()
);
create table public.mood_session_tracks (
 session_id uuid not null references public.mood_sessions(id) on delete cascade,
 track_id uuid not null references public.tracks(id) on delete cascade,
 position integer not null check(position>=0),primary key(session_id,track_id),unique(session_id,position)
);
create table public.current_mood_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mood_vector jsonb not null,updated_at timestamptz not null default now()
);
create table public.saved_tracks (
 user_id uuid not null references auth.users(id) on delete cascade,
 track_id uuid not null references public.tracks(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,track_id)
);
create table public.saved_pins (
 user_id uuid not null references auth.users(id) on delete cascade,
 pin_id uuid not null references public.pins(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,pin_id)
);
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
do $$ declare t text; begin
 foreach t in array array['provider_connections','boards','pins','pin_interactions','track_interactions','mood_sessions','current_mood_state','saved_tracks','saved_pins'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 end loop;
end $$;
alter table public.pin_analysis enable row level security;
create policy own_analysis on public.pin_analysis for select to authenticated using(exists(select 1 from public.pins p where p.id=pin_id and p.user_id=(select auth.uid())));
alter table public.mood_session_tracks enable row level security;
create policy own_session_tracks on public.mood_session_tracks for all to authenticated using(exists(select 1 from public.mood_sessions s where s.id=session_id and s.user_id=(select auth.uid()))) with check(exists(select 1 from public.mood_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
alter table public.tracks enable row level security;
create policy readable_catalog on public.tracks for select to authenticated using(true);
-- Shared track catalog and vision analyses are written only by the trusted service.
grant select on public.tracks,public.pin_analysis to authenticated;
grant select,insert,update,delete on public.profiles,public.boards,public.pins,public.pin_interactions,public.track_interactions,public.mood_sessions,public.mood_session_tracks,public.current_mood_state,public.saved_tracks,public.saved_pins to authenticated;
grant select on public.provider_connections to authenticated;
grant usage,select on all sequences in schema public to authenticated;
create index pin_interactions_recent on public.pin_interactions(user_id,created_at desc);
create index track_interactions_recent on public.track_interactions(user_id,created_at desc);
create index sessions_recent on public.mood_sessions(user_id,created_at desc);
create index pins_board on public.pins(board_id);
create index pins_user on public.pins(user_id);
create index session_tracks_track on public.mood_session_tracks(track_id);
create index saved_pins_pin on public.saved_pins(pin_id);
create index saved_tracks_track on public.saved_tracks(track_id);
commit;
