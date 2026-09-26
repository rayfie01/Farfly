-- Export of the migration already applied to the Far.Fly Supabase project.
create table public.provider_connections (
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('pinterest','spotify')),
 encrypted_tokens text not null check (char_length(encrypted_tokens) <= 32000),
 primary key (user_id, provider)
);
alter table public.provider_connections enable row level security;
revoke all on public.provider_connections from anon;
grant select, insert, update, delete on public.provider_connections to authenticated;
create policy own_connections_select on public.provider_connections for select to authenticated using ((select auth.uid())=user_id);
create policy own_connections_insert on public.provider_connections for insert to authenticated with check ((select auth.uid())=user_id);
create policy own_connections_update on public.provider_connections for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy own_connections_delete on public.provider_connections for delete to authenticated using ((select auth.uid())=user_id);

