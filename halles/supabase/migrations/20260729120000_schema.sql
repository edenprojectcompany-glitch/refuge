-- =============================================================================
-- Halles — schéma initial
-- =============================================================================
-- Multi-tenant à schéma unique : toutes les données cohabitent dans `public`,
-- le cloisonnement se fait par `hotel_id` et par la RLS (migration suivante).
-- =============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Schéma privé pour l'agrégation analytique.
-- PostgREST n'expose que `public` : rien de ce qui est ici n'est joignable
-- depuis le réseau, quel que soit le jeton utilisé.
-- -----------------------------------------------------------------------------
create schema if not exists analytics;

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
create type place_category as enum (
  'restaurant','bar','cafe','boulangerie','brunch',
  'culture','shopping','balade','pratique','nuit'
);

create type content_status as enum ('draft','published','archived','closed');

create type user_role as enum ('admin','hotelier');

create type event_type as enum (
  'session_start','page_view','place_view','outbound_click',
  'perk_view','perk_open','itinerary_view','contact_click','map_interaction'
);

-- -----------------------------------------------------------------------------
-- Horodatage automatique : `updated_at` sert à l'admin (tri par fraîcheur)
-- et à la revalidation on-demand des pages guest.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- HOTELS — les tenants. Un hôtel = un sous-domaine = un guide.
-- -----------------------------------------------------------------------------
create table hotels (
  id uuid primary key default gen_random_uuid(),

  -- Le slug est la clé de résolution du middleware : il finit dans une URL
  -- publique, donc format strict et immuable en pratique.
  slug text not null unique
    constraint hotels_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])$'),
  -- Domaine custom : la colonne existe pour ne pas fermer la porte, la
  -- résolution n'est pas implémentée en v1.
  custom_domain text unique,

  name text not null check (length(btrim(name)) > 0),
  city text not null check (length(btrim(city)) > 0),
  address text,

  -- Position de l'hôtel : origine de tous les calculs de distance à pied.
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),

  rooms_count int check (rooms_count > 0),          -- sert au taux de scan estimé
  logo_url text,
  primary_color text not null default '#1a1a1a'
    constraint hotels_primary_color_format check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  default_locale text not null default 'fr'
    constraint hotels_default_locale_supported check (default_locale in ('fr','en')),

  -- Infos pratiques : seule zone éditable par l'hôtelier (via RPC).
  wifi_name text,
  wifi_password text,
  breakfast_info text,
  checkin_info text,
  checkout_info text,
  transport_info text,
  contact_whatsapp text,
  contact_phone text,
  -- Blocs libres : [{ "title": "...", "body": "...", "icon": "..." }]
  custom_blocks jsonb not null default '[]'::jsonb
    constraint hotels_custom_blocks_is_array check (jsonb_typeof(custom_blocks) = 'array'),

  status content_status not null default 'draft',
  plan text not null default 'standard',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hotels_set_updated_at
  before update on hotels
  for each row execute function public.set_updated_at();

comment on table hotels is 'Tenants. Un hôtel = un abonnement = un guide de quartier.';
comment on column hotels.custom_domain is 'Prévu pour une v2 : non résolu par le middleware en v1.';

-- -----------------------------------------------------------------------------
-- PLACES — base d'adresses mutualisée par ville.
-- C'est l'actif réutilisable : un lieu saisi une fois sert à tous les hôtels
-- de la ville. Aucune colonne `hotel_id` ici, volontairement.
-- -----------------------------------------------------------------------------
create table places (
  id uuid primary key default gen_random_uuid(),

  city text not null check (length(btrim(city)) > 0),
  name text not null check (length(btrim(name)) > 0),
  category place_category not null,
  address text not null check (length(btrim(address)) > 0),

  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),

  price_range int check (price_range between 1 and 4),

  -- Contenu bilingue. Le FR est obligatoire, l'EN est un enrichissement :
  -- l'affichage retombe sur le FR quand l'EN est vide.
  short_desc_fr text,
  short_desc_en text,
  long_desc_fr text,
  long_desc_en text,

  phone text,
  website text,
  booking_url text,
  instagram text,

  -- { "mon": [["12:00","14:30"],["19:00","22:30"]], ..., "sun": [] }
  -- Jour absent = horaires inconnus ; tableau vide = fermé.
  opening_hours jsonb
    constraint places_opening_hours_is_object
      check (opening_hours is null or jsonb_typeof(opening_hours) = 'object'),

  photo_url text,
  tags text[] not null default '{}',

  status content_status not null default 'draft',
  verified_at date,                                  -- alimente la to-do de maintenance

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger places_set_updated_at
  before update on places
  for each row execute function public.set_updated_at();

create index places_city_category_status_idx on places (city, category, status);
-- Écran admin « lieux non vérifiés depuis 6 mois » : les NULL d'abord.
create index places_verified_at_idx on places (verified_at nulls first);

comment on table places is 'Base d''adresses mutualisée par ville, indépendante des hôtels.';

-- -----------------------------------------------------------------------------
-- PERKS — les avantages négociés. Le cœur de la valeur vendue.
-- -----------------------------------------------------------------------------
create table perks (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,

  title_fr text not null check (length(btrim(title_fr)) > 0),
  title_en text,
  description_fr text,
  description_en text,
  -- Conditions montrées telles quelles au commerçant : jamais de sous-entendu.
  conditions_fr text,
  conditions_en text,

  valid_from date,
  valid_until date,
  constraint perks_validity_order check (valid_until is null or valid_from is null or valid_until >= valid_from),

  status content_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger perks_set_updated_at
  before update on perks
  for each row execute function public.set_updated_at();

create index perks_place_id_idx on perks (place_id);
-- Alerte admin « expire dans 30 jours ».
create index perks_valid_until_idx on perks (valid_until) where status = 'published';

-- -----------------------------------------------------------------------------
-- HOTEL_PLACES — la curation. Quels lieux, dans quel ordre, avec quel mot.
-- -----------------------------------------------------------------------------
create table hotel_places (
  hotel_id uuid not null references hotels(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,

  position int not null default 100,
  is_featured boolean not null default false,

  -- Le mot de l'hôtelier : c'est ce qui distingue le guide d'un Google Maps.
  hotel_note_fr text,
  hotel_note_en text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (hotel_id, place_id)
);

create trigger hotel_places_set_updated_at
  before update on hotel_places
  for each row execute function public.set_updated_at();

create index hotel_places_place_id_idx on hotel_places (place_id);
create index hotel_places_hotel_position_idx on hotel_places (hotel_id, position);

-- -----------------------------------------------------------------------------
-- ITINERAIRES
-- hotel_id null = parcours disponible pour toute la ville.
-- -----------------------------------------------------------------------------
create table itineraries (
  id uuid primary key default gen_random_uuid(),
  city text not null check (length(btrim(city)) > 0),
  hotel_id uuid references hotels(id) on delete cascade,

  title_fr text not null check (length(btrim(title_fr)) > 0),
  title_en text,
  description_fr text,
  description_en text,

  duration_minutes int check (duration_minutes > 0),
  tags text[] not null default '{}',

  -- [{ "place_id": uuid, "note_fr": "...", "note_en": "...", "order": 1 }]
  steps jsonb not null
    constraint itineraries_steps_is_array check (jsonb_typeof(steps) = 'array'),

  status content_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger itineraries_set_updated_at
  before update on itineraries
  for each row execute function public.set_updated_at();

create index itineraries_city_status_idx on itineraries (city, status);
create index itineraries_hotel_id_idx on itineraries (hotel_id);

-- -----------------------------------------------------------------------------
-- UTILISATEURS
-- `profiles` prolonge `auth.users` : le rôle vit ici, jamais côté client.
-- -----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'hotelier',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription (magic link).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table hotel_users (
  hotel_id uuid not null references hotels(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (hotel_id, user_id)
);

create index hotel_users_user_id_idx on hotel_users (user_id);

-- -----------------------------------------------------------------------------
-- EVENTS — mesure d'audience sans donnée personnelle.
-- Pas d'IP, pas de user-agent, pas de cookie : `session_id` est un UUID de
-- sessionStorage qui meurt avec l'onglet. Voir docs/rgpd.md.
-- -----------------------------------------------------------------------------
create table events (
  id bigserial primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  session_id text not null check (length(session_id) between 8 and 64),
  type event_type not null,
  place_id uuid references places(id) on delete set null,
  perk_id uuid references perks(id) on delete set null,
  source text check (source is null or source in ('chambre','reception','carte-cle','autre')),
  locale text check (locale is null or locale in ('fr','en')),
  meta jsonb not null default '{}'::jsonb
    constraint events_meta_is_object check (jsonb_typeof(meta) = 'object'),
  created_at timestamptz not null default now()
);

create index events_hotel_created_idx on events (hotel_id, created_at desc);
create index events_hotel_type_created_idx on events (hotel_id, type, created_at desc);
-- Purge des lignes de plus de 13 mois (cron quotidien).
create index events_created_at_idx on events (created_at);

comment on table events is 'Événements bruts. Le dashboard ne les requête jamais : il lit analytics.daily_stats.';

-- -----------------------------------------------------------------------------
-- AGRÉGATION QUOTIDIENNE
-- Une vue matérialisée ne supporte pas la RLS : elle vit donc dans le schéma
-- privé `analytics`, et l'hôtelier y accède uniquement via la fonction
-- `public.hotel_daily_stats()` qui vérifie son appartenance à l'hôtel.
-- -----------------------------------------------------------------------------
create materialized view analytics.daily_stats as
select
  hotel_id,
  (created_at at time zone 'Europe/Paris')::date as day,
  count(distinct session_id) filter (where type = 'session_start') as sessions,
  count(*) filter (where type = 'outbound_click')                  as outbound_clicks,
  count(*) filter (where type = 'perk_open')                       as perk_opens,
  count(*)                                                          as total_events
from events
group by 1, 2;

-- Index unique obligatoire pour `refresh materialized view concurrently`
-- (sinon le dashboard est indisponible pendant chaque rafraîchissement).
create unique index daily_stats_hotel_day_idx on analytics.daily_stats (hotel_id, day);

-- -----------------------------------------------------------------------------
-- PRIVILÈGES
-- Le schéma analytics n'est joignable par personne d'autre que le service role.
-- -----------------------------------------------------------------------------
revoke all on schema analytics from public, anon, authenticated;
revoke all on analytics.daily_stats from public, anon, authenticated;
grant usage on schema analytics to service_role;
grant select on analytics.daily_stats to service_role;
