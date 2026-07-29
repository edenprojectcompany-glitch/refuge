-- =============================================================================
-- Halles — simulacre de l'environnement Supabase
-- =============================================================================
-- Recrée sur un Postgres nu ce que Supabase fournit d'office : les trois rôles,
-- le schéma `auth`, sa table `users` et `auth.uid()`.
-- Sert UNIQUEMENT aux tests locaux (scripts/test-sql.sh) : ne jamais l'appliquer
-- sur un projet Supabase, qui a déjà tout ça.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase lit l'identité dans le JWT porté par la requête. En local, on
-- s'appuie sur le même mécanisme : un GUC de session posé par le test.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
