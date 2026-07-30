-- =============================================================================
-- Halles — installation complète
-- =============================================================================
-- Fichier ASSEMBLÉ par scripts/generer-installation.sh : ne pas l'éditer.
-- Source : supabase/migrations/*.sql puis supabase/seed.sql
--
-- À coller en une fois dans l'éditeur SQL d'un projet Supabase NEUF, puis
-- exécuter. À ne lancer qu'une seule fois : les migrations créent des types
-- et des tables, un second passage échouerait sur « already exists ».
--
-- Le jeu de démonstration en fin de fichier (1 hôtel, 25 lieux, 8 avantages)
-- est supprimable : voir la section « NETTOYAGE » du README.
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- 20260729120000_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 20260729120100_fonctions.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — fonctions métier et helpers d'autorisation
-- =============================================================================
-- Ces fonctions sont référencées par les policies RLS de la migration suivante :
-- elles doivent exister avant.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers d'autorisation
-- -----------------------------------------------------------------------------
-- `security definer` + search_path figé : la fonction lit `profiles` et
-- `hotel_users` sans être elle-même soumise à la RLS de ces tables, ce qui
-- évite une récursion infinie dans les policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Vrai si l''utilisateur connecté a le rôle admin. Le back-office passe malgré tout par le service role côté serveur.';

create or replace function public.is_hotel_member(p_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hotel_users
    where hotel_id = p_hotel_id and user_id = auth.uid()
  );
$$;

comment on function public.is_hotel_member(uuid) is
  'Vrai si l''utilisateur connecté est rattaché à cet hôtel via hotel_users.';

-- -----------------------------------------------------------------------------
-- update_hotel_info — seule écriture autorisée à un hôtelier.
-- On n'expose pas d'UPDATE large sur `hotels` : un UPDATE colonne par colonne
-- se contrôle mal en RLS (rien n'empêcherait de modifier `slug` ou `status`).
-- La liste blanche est ici, en dur.
-- -----------------------------------------------------------------------------
create or replace function public.update_hotel_info(p_hotel_id uuid, p_payload jsonb)
returns hotels
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel hotels;
  v_unknown text;
begin
  if not (public.is_hotel_member(p_hotel_id) or public.is_admin()) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'payload_invalide' using errcode = '22023';
  end if;

  -- Toute clé hors liste blanche fait échouer l'appel : on préfère une erreur
  -- explicite à une modification silencieusement ignorée.
  select string_agg(key, ', ') into v_unknown
  from jsonb_object_keys(p_payload) as key
  where key not in (
    'wifi_name','wifi_password','breakfast_info','checkin_info','checkout_info',
    'transport_info','contact_whatsapp','contact_phone','custom_blocks'
  );

  if v_unknown is not null then
    raise exception 'champs_non_modifiables: %', v_unknown using errcode = '42501';
  end if;

  if p_payload ? 'custom_blocks'
     and jsonb_typeof(p_payload -> 'custom_blocks') is distinct from 'array' then
    raise exception 'custom_blocks_doit_etre_un_tableau' using errcode = '22023';
  end if;

  -- Clé absente du payload = champ inchangé ; clé présente et vide = champ effacé.
  update hotels set
    wifi_name        = case when p_payload ? 'wifi_name'        then nullif(btrim(p_payload ->> 'wifi_name'), '')        else wifi_name end,
    wifi_password    = case when p_payload ? 'wifi_password'    then nullif(btrim(p_payload ->> 'wifi_password'), '')    else wifi_password end,
    breakfast_info   = case when p_payload ? 'breakfast_info'   then nullif(btrim(p_payload ->> 'breakfast_info'), '')   else breakfast_info end,
    checkin_info     = case when p_payload ? 'checkin_info'     then nullif(btrim(p_payload ->> 'checkin_info'), '')     else checkin_info end,
    checkout_info    = case when p_payload ? 'checkout_info'    then nullif(btrim(p_payload ->> 'checkout_info'), '')    else checkout_info end,
    transport_info   = case when p_payload ? 'transport_info'   then nullif(btrim(p_payload ->> 'transport_info'), '')   else transport_info end,
    contact_whatsapp = case when p_payload ? 'contact_whatsapp' then nullif(btrim(p_payload ->> 'contact_whatsapp'), '') else contact_whatsapp end,
    contact_phone    = case when p_payload ? 'contact_phone'    then nullif(btrim(p_payload ->> 'contact_phone'), '')    else contact_phone end,
    custom_blocks    = case when p_payload ? 'custom_blocks'    then p_payload -> 'custom_blocks'                        else custom_blocks end
  where id = p_hotel_id
  returning * into v_hotel;

  if not found then
    raise exception 'hotel_introuvable' using errcode = 'P0002';
  end if;

  return v_hotel;
end;
$$;

revoke all on function public.update_hotel_info(uuid, jsonb) from public, anon;
grant execute on function public.update_hotel_info(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- hotel_daily_stats — lecture des stats agrégées par l'hôtelier.
-- Passe par une fonction parce qu'une vue matérialisée ignore la RLS.
-- -----------------------------------------------------------------------------
create or replace function public.hotel_daily_stats(
  p_hotel_id uuid,
  p_from date default (current_date - interval '30 days')::date,
  p_to date default current_date
)
returns table (
  day date,
  sessions bigint,
  outbound_clicks bigint,
  perk_opens bigint,
  total_events bigint
)
language plpgsql
stable
security definer
set search_path = public, analytics
as $$
begin
  if not (public.is_hotel_member(p_hotel_id) or public.is_admin()) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return query
    select d.day, d.sessions, d.outbound_clicks, d.perk_opens, d.total_events
    from analytics.daily_stats d
    where d.hotel_id = p_hotel_id
      and d.day between p_from and p_to
    order by d.day;
end;
$$;

revoke all on function public.hotel_daily_stats(uuid, date, date) from public, anon;
grant execute on function public.hotel_daily_stats(uuid, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Maintenance — appelées par les crons Vercel avec le service role.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_daily_stats()
returns void
language plpgsql
security definer
set search_path = public, analytics
as $$
begin
  -- `concurrently` garde la vue lisible pendant le rafraîchissement.
  refresh materialized view concurrently analytics.daily_stats;
end;
$$;

revoke all on function public.refresh_daily_stats() from public, anon, authenticated;
grant execute on function public.refresh_daily_stats() to service_role;

create or replace function public.purge_old_events()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  -- 13 mois : permet une comparaison année sur année, pas un jour de plus.
  delete from events where created_at < now() - interval '13 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_events() from public, anon, authenticated;
grant execute on function public.purge_old_events() to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 20260729120200_rls.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — Row Level Security
-- =============================================================================
-- Principe : le guest est anonyme et ne lit que du contenu publié ; l'hôtelier
-- ne voit que son hôtel ; l'admin travaille exclusivement via le service role
-- côté serveur (qui contourne la RLS par conception).
--
-- Une table sans policy et avec RLS activée est fermée à tout le monde sauf au
-- service role. C'est l'état par défaut souhaité : on ouvre ensuite au cas par cas.
-- =============================================================================

alter table hotels        enable row level security;
alter table places        enable row level security;
alter table perks         enable row level security;
alter table hotel_places  enable row level security;
alter table itineraries   enable row level security;
alter table profiles      enable row level security;
alter table hotel_users   enable row level security;
alter table events        enable row level security;

-- -----------------------------------------------------------------------------
-- HOTELS
-- -----------------------------------------------------------------------------

-- Le guide public n'existe que si l'hôtel est publié. Un hôtel en `draft` est
-- donc invisible, y compris pour le middleware qui résout le sous-domaine
-- avec la clé anon : c'est voulu, un tenant non publié doit renvoyer un 404.
create policy hotels_lecture_publique on hotels
  for select
  to anon, authenticated
  using (status = 'published');

-- L'hôtelier voit son hôtel même en brouillon (période d'onboarding).
create policy hotels_lecture_membre on hotels
  for select
  to authenticated
  using (public.is_hotel_member(id));

create policy hotels_lecture_admin on hotels
  for select
  to authenticated
  using (public.is_admin());

-- Aucune policy INSERT/UPDATE/DELETE : la création d'hôtel passe par l'admin
-- (service role) et la modification des infos pratiques par
-- `public.update_hotel_info()`, qui est security definer.

-- -----------------------------------------------------------------------------
-- PLACES
-- -----------------------------------------------------------------------------

-- Base mutualisée : tout lieu publié est lisible par n'importe quel guide.
-- Le filtrage par hôtel se fait par jointure sur hotel_places, pas par la RLS.
create policy places_lecture_publique on places
  for select
  to anon, authenticated
  using (status = 'published');

create policy places_lecture_admin on places
  for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- PERKS
-- -----------------------------------------------------------------------------

-- Un avantage n'est visible que si l'avantage ET le lieu sont publiés :
-- sinon on afficherait une réduction dans un établissement retiré du guide.
-- La validité dans le temps est filtrée applicativement (l'écran doit pouvoir
-- expliquer « offre terminée » plutôt que de faire disparaître la page).
create policy perks_lecture_publique on perks
  for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from places p
      where p.id = perks.place_id and p.status = 'published'
    )
  );

create policy perks_lecture_admin on perks
  for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- HOTEL_PLACES (curation)
-- -----------------------------------------------------------------------------

-- Lisible si l'hôtel parent est publié. La curation d'un hôtel est donc
-- publique — c'est le contenu même du guide.
create policy hotel_places_lecture_publique on hotel_places
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from hotels h
      where h.id = hotel_places.hotel_id and h.status = 'published'
    )
  );

-- L'hôtelier consulte sa propre curation en lecture seule, même hôtel en brouillon.
create policy hotel_places_lecture_membre on hotel_places
  for select
  to authenticated
  using (public.is_hotel_member(hotel_id));

create policy hotel_places_lecture_admin on hotel_places
  for select
  to authenticated
  using (public.is_admin());

-- Aucune policy d'écriture : l'hôtelier ne modifie jamais sa curation lui-même.

-- -----------------------------------------------------------------------------
-- ITINERAIRES
-- -----------------------------------------------------------------------------

-- Publié, et soit rattaché à un hôtel publié, soit ouvert à toute la ville.
create policy itineraries_lecture_publique on itineraries
  for select
  to anon, authenticated
  using (
    status = 'published'
    and (
      hotel_id is null
      or exists (
        select 1 from hotels h
        where h.id = itineraries.hotel_id and h.status = 'published'
      )
    )
  );

create policy itineraries_lecture_admin on itineraries
  for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- PROFILES / HOTEL_USERS
-- -----------------------------------------------------------------------------

-- Chacun lit sa propre fiche. Personne ne modifie son rôle : seul le service
-- role peut promouvoir un compte en admin.
create policy profiles_lecture_soi on profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_maj_nom on profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from profiles p where p.id = auth.uid()));

create policy hotel_users_lecture_soi on hotel_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- EVENTS
-- -----------------------------------------------------------------------------

-- Insertion ouverte au public : le guest n'a pas de compte, la mesure d'audience
-- doit fonctionner sans authentification. Deux garde-fous :
--   1. l'hôtel visé doit exister et être publié ;
--   2. aucune lecture n'est possible (pas de policy SELECT), donc la table ne
--      peut pas servir d'oracle ni de canal de fuite.
-- Le volume est borné en amont par le rate limiting de /api/track.
create policy events_insertion_publique on events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from hotels h
      where h.id = events.hotel_id and h.status = 'published'
    )
  );

-- Pas de policy SELECT/UPDATE/DELETE, volontairement : les statistiques se
-- lisent via public.hotel_daily_stats(), la purge via public.purge_old_events().

-- -----------------------------------------------------------------------------
-- Privilèges de table
-- La RLS filtre les lignes, les GRANT décident des verbes. Les deux sont requis.
-- -----------------------------------------------------------------------------
grant select on hotels, places, perks, hotel_places, itineraries to anon, authenticated;
grant insert on events to anon, authenticated;
grant usage, select on sequence events_id_seq to anon, authenticated;
grant select on profiles, hotel_users to authenticated;
grant update on profiles to authenticated;

-- Rien n'est accordé par défaut sur les objets créés plus tard.
alter default privileges in schema public revoke all on tables from anon, authenticated;

/*
 * Le service role, lui, doit tout pouvoir : c'est par lui que passe le
 * back-office. Supabase le lui accorde par défaut sur les nouvelles tables du
 * schéma public, mais s'appuyer sur ce réglage implicite rend le déploiement
 * fragile — un projet configuré autrement ferait échouer l'administration sur
 * un « permission denied » incompréhensible. On l'écrit donc noir sur blanc.
 */
grant all on hotels, places, perks, hotel_places, itineraries, profiles, hotel_users, events
  to service_role;
grant all on sequence events_id_seq to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 20260729130000_stockage.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — bucket de stockage des photos
-- =============================================================================
-- Les photos des lieux viennent du site du commerçant, mais sont recopiées une
-- fois ici par le back-office. Un lien direct vers son serveur casserait à
-- chaque refonte de son site, subirait sa protection anti-hotlink, et
-- obligerait à autoriser tous les domaines dans l'optimiseur d'images de
-- Next — ce qui en ferait un proxy d'images public.
--
-- Ne rapatrier que des photos de commerçants déjà partenaires.
-- =============================================================================

-- Le schéma `storage` n'existe que sur un projet Supabase. Sur un Postgres nu
-- (tests locaux), on ne fait rien plutôt que d'échouer.
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'schéma storage absent : bucket photos non créé (attendu hors Supabase)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'photos', 'photos', true,
    3 * 1024 * 1024,                                    -- 3 Mo : une photo de fiche, pas un original d'appareil
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
  on conflict (id) do nothing;

  -- Lecture publique : les photos s'affichent dans un guide sans compte.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'photos_lecture_publique'
  ) then
    create policy photos_lecture_publique on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'photos');
  end if;

  -- Aucune policy d'écriture : seul le service role dépose des fichiers, depuis
  -- le back-office. Un visiteur ne doit jamais pouvoir écrire dans le bucket.
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 20260729130100_stats_globales.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — agrégat tous hôtels pour le back-office
-- =============================================================================
-- La vue matérialisée vit dans le schéma privé `analytics` : PostgREST ne
-- l'expose pas. Le back-office y accède par cette fonction, réservée au
-- service role — un hôtelier n'a rien à faire dans les chiffres consolidés.
-- =============================================================================

create or replace function public.stats_globales(p_jours int default 30)
returns table (
  day date,
  sessions bigint,
  outbound_clicks bigint,
  perk_opens bigint,
  total_events bigint
)
language sql
stable
security definer
set search_path = public, analytics
as $$
  select d.day,
         sum(d.sessions)::bigint,
         sum(d.outbound_clicks)::bigint,
         sum(d.perk_opens)::bigint,
         sum(d.total_events)::bigint
  from analytics.daily_stats d
  where d.day >= (current_date - make_interval(days => greatest(p_jours, 1)))
  group by d.day
  order by d.day;
$$;

revoke all on function public.stats_globales(int) from public, anon, authenticated;
grant execute on function public.stats_globales(int) to service_role;

comment on function public.stats_globales(int) is
  'Agrégat tous hôtels des N derniers jours. Réservé au back-office (service role).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 20260729140000_duplication_curation.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — duplication de curation
-- =============================================================================
-- C'est la fonction qui conditionne la rentabilité : reprendre la sélection d'un
-- hôtel voisin fait passer l'onboarding de dix heures à trois.
--
-- Deux garde-fous produit :
--   * même ville obligatoire — dupliquer Paris vers Lyon n'a aucun sens ;
--   * les notes de l'hôtelier ne sont PAS copiées par défaut. Ce sont ses mots :
--     recopiés tels quels, ils feraient dire à un hôtelier ce qu'un autre a
--     écrit, et deux guides identiques détruiraient précisément ce qui
--     distingue le produit d'une carte. L'appelant peut les demander
--     explicitement, pour repartir d'une base à réécrire.
--
-- Les lieux déjà présents dans la cible sont laissés intacts : la duplication
-- est un ajout, jamais un écrasement.
-- =============================================================================

create or replace function public.dupliquer_curation(
  p_source uuid,
  p_cible uuid,
  p_avec_notes boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ville_source text;
  v_ville_cible text;
  v_ajoutes int;
begin
  if p_source = p_cible then
    raise exception 'source_et_cible_identiques' using errcode = '22023';
  end if;

  select city into v_ville_source from hotels where id = p_source;
  select city into v_ville_cible from hotels where id = p_cible;

  if v_ville_source is null or v_ville_cible is null then
    raise exception 'hotel_introuvable' using errcode = 'P0002';
  end if;

  if v_ville_source is distinct from v_ville_cible then
    raise exception 'villes_differentes' using errcode = '22023';
  end if;

  insert into hotel_places (hotel_id, place_id, position, is_featured, hotel_note_fr, hotel_note_en)
  select p_cible,
         source.place_id,
         source.position,
         source.is_featured,
         case when p_avec_notes then source.hotel_note_fr end,
         case when p_avec_notes then source.hotel_note_en end
  from hotel_places source
  join places lieu on lieu.id = source.place_id
  where source.hotel_id = p_source
    -- Un lieu fermé ou archivé n'a pas à repartir dans un nouveau guide.
    and lieu.status = 'published'
  on conflict (hotel_id, place_id) do nothing;

  get diagnostics v_ajoutes = row_count;
  return v_ajoutes;
end;
$$;

revoke all on function public.dupliquer_curation(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.dupliquer_curation(uuid, uuid, boolean) to service_role;

comment on function public.dupliquer_curation(uuid, uuid, boolean) is
  'Recopie la sélection de lieux d''un hôtel vers un autre de la même ville. Sans les notes, sauf demande explicite.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 20260730100000_lien_statistiques.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — lien privé de statistiques par hôtel
-- =============================================================================
-- L'hôtelier ne gère rien : il donne le QR code, et c'est tout. Il n'a donc ni
-- compte, ni mot de passe, ni adresse à nous confier. Mais il paie tous les
-- mois : il doit pouvoir constater que ça tourne, sans quoi il ne renouvelle
-- pas.
--
-- D'où un jeton secret par hôtel, transmis une fois. Quiconque a le lien voit
-- les chiffres de cet hôtel — et rien d'autre : ni les siens, ni ceux d'un
-- concurrent, ni le moindre contenu modifiable. Le jeton est régénérable
-- depuis le back-office si un employé part avec.
-- =============================================================================

alter table hotels
  add column if not exists stats_token uuid not null default gen_random_uuid();

create unique index if not exists hotels_stats_token_idx on hotels (stats_token);

comment on column hotels.stats_token is
  'Secret du lien /s/{token}. À régénérer pour révoquer un accès.';

-- -----------------------------------------------------------------------------
-- Lecture des statistiques par jeton, sans authentification.
--
-- `security definer` : la fonction lit la vue matérialisée du schéma privé, que
-- personne ne peut interroger directement. Elle ne renvoie que des agrégats —
-- jamais une ligne d'événement, jamais un identifiant de session.
-- -----------------------------------------------------------------------------
create or replace function public.stats_par_jeton(
  p_jeton uuid,
  p_jours int default 30
)
returns table (
  hotel_nom text,
  hotel_ville text,
  hotel_couleur text,
  chambres int,
  day date,
  sessions bigint,
  outbound_clicks bigint,
  perk_opens bigint
)
language sql
stable
security definer
set search_path = public, analytics
as $$
  select h.name,
         h.city,
         h.primary_color,
         h.rooms_count,
         d.day,
         d.sessions,
         d.outbound_clicks,
         d.perk_opens
  from hotels h
  left join analytics.daily_stats d
    on d.hotel_id = h.id
   and d.day >= (current_date - make_interval(days => greatest(p_jours, 1)))
  where h.stats_token = p_jeton
    and h.status = 'published'
  order by d.day;
$$;

-- Ouvert à anon : c'est le jeton qui fait office de clé, et il n'expose que des
-- agrégats d'un seul hôtel.
grant execute on function public.stats_par_jeton(uuid, int) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Classement des lieux et avantages les plus consultés, même principe.
-- -----------------------------------------------------------------------------
create or replace function public.classements_par_jeton(
  p_jeton uuid,
  p_jours int default 30,
  p_limite int default 10
)
returns table (
  genre text,
  libelle text,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with hotel as (
    select id from hotels where stats_token = p_jeton and status = 'published'
  ),
  fenetre as (
    select e.*
    from events e
    join hotel on hotel.id = e.hotel_id
    where e.created_at >= now() - make_interval(days => greatest(p_jours, 1))
  )
  (
    select 'lieu'::text, p.name, count(*)::bigint
    from fenetre f
    join places p on p.id = f.place_id
    where f.type in ('place_view', 'outbound_click')
    group by p.name
    order by count(*) desc
    limit greatest(p_limite, 1)
  )
  union all
  (
    select 'avantage'::text, k.title_fr, count(*)::bigint
    from fenetre f
    join perks k on k.id = f.perk_id
    where f.type = 'perk_open'
    group by k.title_fr
    order by count(*) desc
    limit greatest(p_limite, 1)
  );
$$;

grant execute on function public.classements_par_jeton(uuid, int, int) to anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- seed.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Halles — jeu de démonstration
-- =============================================================================
-- Un hôtel publié, 25 lieux, 8 avantages, 2 itinéraires : de quoi voir un guide
-- complet dès la fin de l'installation.
--
-- Les établissements sont FICTIFS, à des adresses et coordonnées réelles du
-- Marais. Aucun commerçant réel n'est associé ici à un avantage qu'il n'a pas
-- négocié — ne pas remplacer ces noms par des enseignes existantes tant que
-- l'accord n'est pas signé.
--
-- Idempotent : `on conflict do nothing` sur des UUID fixes, rejouable sans risque.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- HÔTEL DÉMO
-- -----------------------------------------------------------------------------
insert into hotels (
  id, slug, name, city, address, lat, lng, rooms_count,
  primary_color, default_locale,
  wifi_name, wifi_password, breakfast_info, checkin_info, checkout_info,
  transport_info, contact_whatsapp, contact_phone, custom_blocks, status
) values (
  'a0000000-0000-4000-8000-000000000001',
  'lemarais',
  'Hôtel Sainte-Croix',
  'Paris',
  '18 rue Sainte-Croix de la Bretonnerie, 75004 Paris',
  48.858370, 2.355200, 34,
  '#2f4b3f', 'fr',
  'Sainte-Croix Guests', 'bonjour2026',
  'Petit-déjeuner servi de 7 h à 10 h 30 dans la salle voûtée du rez-de-chaussée. 14 € par personne, en supplément.',
  'Arrivée à partir de 15 h. Réception ouverte 24 h/24.',
  'Départ avant 11 h. Bagagerie gratuite le jour du départ.',
  'Métro Hôtel de Ville (lignes 1 et 11) à 4 minutes à pied. Rambuteau (ligne 11) à 5 minutes. Station Vélib'' au 25 rue du Temple.',
  '+33600000000', '+33142000000',
  '[{"title":"Parapluies","body":"Des parapluies sont à votre disposition à la réception, sans supplément.","icon":"umbrella"},{"title":"Pressing","body":"Dépôt avant 9 h, retour le lendemain soir. Tarifs affichés à la réception.","icon":"shirt"}]'::jsonb,
  'published'
) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- LIEUX — 25 adresses du Marais et alentours
-- -----------------------------------------------------------------------------
insert into places (
  id, city, name, category, address, lat, lng, price_range,
  short_desc_fr, short_desc_en, long_desc_fr, long_desc_en,
  phone, website, booking_url, instagram, opening_hours, photo_url, tags, status, verified_at
) values

-- --- Restaurants ---
('b0000000-0000-4000-8000-000000000001','Paris','Le Comptoir des Archives','restaurant',
 '32 rue des Archives, 75004 Paris', 48.858020, 2.355900, 2,
 'Bistrot de quartier, ardoise qui change chaque jour.',
 'Neighbourhood bistro with a daily changing chalkboard menu.',
 'Une salle étroite, vingt-huit couverts, une ardoise réécrite chaque matin selon le marché. La cuisine est française sans détour : un poisson, une viande, un plat végétarien. On y va pour dîner tôt, vers 19 h 30, avant que la file ne se forme sur le trottoir.',
 'A narrow room, twenty-eight seats, and a chalkboard rewritten each morning around whatever the market offered. Straightforward French cooking: one fish, one meat, one vegetarian dish. Come early, around 7.30pm, before the queue forms on the pavement.',
 '+33142720001', 'https://exemple.fr/comptoir-archives', null, 'comptoirdesarchives',
 '{"mon":[],"tue":[["12:00","14:30"],["19:00","22:30"]],"wed":[["12:00","14:30"],["19:00","22:30"]],"thu":[["12:00","14:30"],["19:00","22:30"]],"fri":[["12:00","14:30"],["19:00","23:00"]],"sat":[["19:00","23:00"]],"sun":[]}'::jsonb,
 null, '{"terrasse","sans-resa"}', 'published', '2026-06-12'),

('b0000000-0000-4000-8000-000000000002','Paris','Table Sainte-Croix','restaurant',
 '9 rue Sainte-Croix de la Bretonnerie, 75004 Paris', 48.858600, 2.354600, 3,
 'Cuisine du sud-ouest, salle voûtée du XVIIe.',
 'South-west French cooking under a 17th-century vaulted ceiling.',
 'Sous les voûtes d''une ancienne cave à vin, une cuisine du Sud-Ouest tenue par la même famille depuis 1998. Canard, haricots tarbais, pruneaux à l''armagnac. Portions généreuses, service qui prend le temps. Réservation vivement conseillée le week-end.',
 'Under the vaults of a former wine cellar, south-western cooking run by the same family since 1998. Duck, tarbais beans, prunes in armagnac. Generous portions, unhurried service. Book ahead at weekends.',
 '+33142720002', 'https://exemple.fr/table-sainte-croix', 'https://exemple.fr/table-sainte-croix/reserver', null,
 '{"mon":[["19:00","22:30"]],"tue":[["19:00","22:30"]],"wed":[["19:00","22:30"]],"thu":[["19:00","22:30"]],"fri":[["19:00","23:00"]],"sat":[["12:00","14:30"],["19:00","23:00"]],"sun":[["12:00","15:00"]]}'::jsonb,
 null, '{"enfants"}', 'published', '2026-06-12'),

('b0000000-0000-4000-8000-000000000003','Paris','Kubo','restaurant',
 '4 rue de Braque, 75003 Paris', 48.861200, 2.357800, 2,
 'Comptoir japonais, quinze places, poisson du jour.',
 'Japanese counter, fifteen seats, fish of the day.',
 'Quinze tabourets face au comptoir, aucun menu écrit : le chef annonce ce qu''il a trouvé le matin à Rungis. Compter une heure trente, pas plus — le service tourne. Pas de réservation, on inscrit son prénom sur le carnet à l''entrée.',
 'Fifteen stools facing the counter and no written menu: the chef announces whatever he found at Rungis that morning. Allow ninety minutes, no more. No bookings — write your name in the notebook by the door.',
 '+33142720003', null, null, 'kubo.paris',
 '{"mon":[],"tue":[["19:00","22:00"]],"wed":[["19:00","22:00"]],"thu":[["19:00","22:00"]],"fri":[["19:00","22:30"]],"sat":[["19:00","22:30"]],"sun":[]}'::jsonb,
 null, '{"sans-resa","tardif"}', 'published', '2026-05-30'),

('b0000000-0000-4000-8000-000000000004','Paris','Chez Perrine','restaurant',
 '21 rue du Roi de Sicile, 75004 Paris', 48.856900, 2.358400, 1,
 'Cantine familiale, plat du jour à 14 €.',
 'Family canteen, daily special at €14.',
 'Une cantine sans manières où l''on mange pour moins de vingt euros. Nappes en papier, plat du jour affiché à la craie sur la vitrine, une carafe d''eau posée sans qu''on la demande. Bondé entre 12 h 30 et 13 h 30 : venir avant ou après.',
 'An unfussy canteen where you eat for under twenty euros. Paper tablecloths, the day''s dish chalked on the window, a carafe of water brought without asking. Packed between 12.30 and 1.30pm — come before or after.',
 '+33142720004', null, null, null,
 '{"mon":[["12:00","15:00"]],"tue":[["12:00","15:00"]],"wed":[["12:00","15:00"]],"thu":[["12:00","15:00"]],"fri":[["12:00","15:00"]],"sat":[],"sun":[]}'::jsonb,
 null, '{"sans-resa","enfants"}', 'published', '2026-06-01'),

('b0000000-0000-4000-8000-000000000005','Paris','Verger','restaurant',
 '55 rue Charlot, 75003 Paris', 48.863100, 2.362400, 3,
 'Entièrement végétal, produits d''Île-de-France.',
 'Fully plant-based, produce from the Paris region.',
 'Cuisine entièrement végétale, sans militantisme affiché : les légumes viennent de quatre fermes d''Île-de-France et la carte change toutes les trois semaines. Menu en cinq services le soir, formule courte le midi. Belle carte de vins nature.',
 'Fully plant-based cooking without the lecture: vegetables from four farms around Paris, menu rewritten every three weeks. Five-course tasting menu in the evening, a shorter set lunch. Good natural wine list.',
 '+33142720005', 'https://exemple.fr/verger', 'https://exemple.fr/verger/reserver', 'verger.paris',
 '{"mon":[],"tue":[],"wed":[["12:00","14:00"],["19:30","22:00"]],"thu":[["12:00","14:00"],["19:30","22:00"]],"fri":[["12:00","14:00"],["19:30","22:30"]],"sat":[["19:30","22:30"]],"sun":[["12:00","15:00"]]}'::jsonb,
 null, '{"vegan","terrasse"}', 'published', '2026-06-20'),

-- --- Bars ---
('b0000000-0000-4000-8000-000000000006','Paris','Le Petit Temple','bar',
 '78 rue du Temple, 75003 Paris', 48.861000, 2.356300, 2,
 'Bar à vins nature, planches de charcuterie.',
 'Natural wine bar with charcuterie boards.',
 'Trente références au verre, ardoise renouvelée chaque semaine, et un patron qui fait goûter avant de servir. On y mange une planche debout au comptoir ou assis sur les trois tables du fond. Ça se remplit vers 19 h.',
 'Thirty wines by the glass, a list rewritten weekly, and an owner who lets you taste before pouring. Eat a charcuterie board standing at the bar or at one of the three tables at the back. Fills up around 7pm.',
 '+33142720006', null, null, 'lepetittemple',
 '{"mon":[["17:00","00:00"]],"tue":[["17:00","00:00"]],"wed":[["17:00","00:00"]],"thu":[["17:00","01:00"]],"fri":[["17:00","02:00"]],"sat":[["17:00","02:00"]],"sun":[]}'::jsonb,
 null, '{"tardif","sans-resa"}', 'published', '2026-06-12'),

('b0000000-0000-4000-8000-000000000007','Paris','Bar des Rosiers','bar',
 '14 rue des Rosiers, 75004 Paris', 48.857400, 2.359600, 2,
 'Cocktails classiques, sans esbroufe.',
 'Classic cocktails, no theatrics.',
 'Une dizaine de cocktails classiques exécutés correctement, dans une salle qui n''a pas changé depuis vingt ans. Pas de fumée, pas de pince à épiler : un negroni, un daiquiri, une conversation. Dernier service à 1 h.',
 'A dozen classic cocktails made properly, in a room unchanged for twenty years. No smoke, no tweezers: a negroni, a daiquiri, a conversation. Last orders at 1am.',
 '+33142720007', null, null, null,
 '{"mon":[],"tue":[["18:00","01:00"]],"wed":[["18:00","01:00"]],"thu":[["18:00","02:00"]],"fri":[["18:00","02:00"]],"sat":[["18:00","02:00"]],"sun":[["18:00","00:00"]]}'::jsonb,
 null, '{"tardif"}', 'published', '2026-05-28'),

('b0000000-0000-4000-8000-000000000008','Paris','Brasserie du Pont-Marie','bar',
 '2 rue de l''Hôtel de Ville, 75004 Paris', 48.854300, 2.357700, 2,
 'Grande terrasse au bord de la Seine.',
 'Large terrace by the Seine.',
 'Le genre de brasserie où l''on s''assoit sans regarder la carte, pour une bière et la vue sur l''île Saint-Louis. La cuisine est correcte sans plus ; la terrasse, elle, vaut le détour au coucher du soleil.',
 'The kind of brasserie where you sit down without reading the menu, for a beer and the view of the Île Saint-Louis. The food is fine; the terrace at sunset is the reason to come.',
 '+33142720008', null, null, null,
 '{"mon":[["08:00","01:00"]],"tue":[["08:00","01:00"]],"wed":[["08:00","01:00"]],"thu":[["08:00","01:00"]],"fri":[["08:00","02:00"]],"sat":[["08:00","02:00"]],"sun":[["08:00","01:00"]]}'::jsonb,
 null, '{"terrasse","sans-resa","enfants"}', 'published', '2026-06-05'),

-- --- Cafés ---
('b0000000-0000-4000-8000-000000000009','Paris','Torréfaction Barbette','cafe',
 '11 rue Barbette, 75003 Paris', 48.859300, 2.360100, 1,
 'Torréfacteur, filtre et espresso à emporter.',
 'Roastery serving filter and espresso to take away.',
 'On torréfie dans l''arrière-boutique deux fois par semaine, l''odeur se sent depuis le trottoir. Quatre tabourets seulement : c''est un endroit où l''on prend son café et où l''on repart marcher.',
 'They roast in the back room twice a week and you can smell it from the pavement. Only four stools: this is a place to take your coffee and keep walking.',
 '+33142720009', 'https://exemple.fr/barbette', null, 'torrefaction.barbette',
 '{"mon":[["08:00","18:00"]],"tue":[["08:00","18:00"]],"wed":[["08:00","18:00"]],"thu":[["08:00","18:00"]],"fri":[["08:00","18:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","17:00"]]}'::jsonb,
 null, '{"sans-resa","vegan"}', 'published', '2026-06-18'),

('b0000000-0000-4000-8000-000000000010','Paris','Café des Blancs-Manteaux','cafe',
 '25 rue des Blancs-Manteaux, 75004 Paris', 48.858800, 2.357300, 1,
 'Café de quartier, terrasse au soleil du matin.',
 'Neighbourhood café, morning sun on the terrace.',
 'Un café de quartier comme il en reste peu dans le Marais : comptoir en zinc, habitués qui lisent le journal, croissants livrés à 7 h. La terrasse prend le soleil jusqu''à midi.',
 'A neighbourhood café of a kind now rare in the Marais: zinc counter, regulars with newspapers, croissants delivered at 7am. The terrace gets sun until noon.',
 '+33142720010', null, null, null,
 '{"mon":[["07:00","20:00"]],"tue":[["07:00","20:00"]],"wed":[["07:00","20:00"]],"thu":[["07:00","20:00"]],"fri":[["07:00","20:00"]],"sat":[["08:00","20:00"]],"sun":[["08:00","14:00"]]}'::jsonb,
 null, '{"terrasse","sans-resa","enfants"}', 'published', '2026-06-02'),

('b0000000-0000-4000-8000-000000000011','Paris','Le Salon de Bretagne','cafe',
 '38 rue de Turenne, 75003 Paris', 48.858100, 2.364500, 2,
 'Salon de thé, quarante thés, pâtisseries maison.',
 'Tea room, forty teas, house-made pastries.',
 'Une adresse calme pour l''après-midi, avec quarante thés en vrac et des pâtisseries faites sur place. Le seul endroit du quartier où l''on peut lire deux heures sans qu''on vous demande de libérer la table.',
 'A quiet afternoon address with forty loose-leaf teas and pastries made on site. The only place nearby where you can read for two hours without being asked to free the table.',
 '+33142720011', null, null, null,
 '{"mon":[],"tue":[["12:00","19:00"]],"wed":[["12:00","19:00"]],"thu":[["12:00","19:00"]],"fri":[["12:00","19:00"]],"sat":[["11:00","19:30"]],"sun":[["11:00","19:30"]]}'::jsonb,
 null, '{"enfants"}', 'published', '2026-05-20'),

-- --- Boulangeries ---
('b0000000-0000-4000-8000-000000000012','Paris','Fournil Sainte-Anastase','boulangerie',
 '6 rue Sainte-Anastase, 75003 Paris', 48.859900, 2.363000, 1,
 'Levain naturel, fournée de 17 h.',
 'Naturally leavened bread, second bake at 5pm.',
 'Pain au levain, farines de meule, une seconde fournée à 17 h pour ceux qui rentrent tard. La baguette de tradition part avant 10 h le dimanche.',
 'Sourdough, stone-milled flour, and a second bake at 5pm for anyone getting back late. The tradition baguette sells out before 10am on Sundays.',
 '+33142720012', null, null, null,
 '{"mon":[],"tue":[["07:00","20:00"]],"wed":[["07:00","20:00"]],"thu":[["07:00","20:00"]],"fri":[["07:00","20:00"]],"sat":[["07:00","20:00"]],"sun":[["07:00","14:00"]]}'::jsonb,
 null, '{"sans-resa"}', 'published', '2026-06-15'),

('b0000000-0000-4000-8000-000000000013','Paris','Maison Volta','boulangerie',
 '3 rue Volta, 75003 Paris', 48.866200, 2.357100, 1,
 'Viennoiseries au beurre, kouign-amann réputé.',
 'Butter pastries; the kouign-amann is the one to get.',
 'Petite boulangerie du Haut-Marais dont le kouign-amann se vend jusqu''au dernier avant midi. Les viennoiseries sont au beurre de baratte, ça se sent.',
 'A small bakery in the upper Marais whose kouign-amann sells out before noon. The pastries are made with churned butter, and it shows.',
 '+33142720013', null, null, 'maisonvolta',
 '{"mon":[["07:00","19:30"]],"tue":[["07:00","19:30"]],"wed":[["07:00","19:30"]],"thu":[["07:00","19:30"]],"fri":[["07:00","19:30"]],"sat":[["07:00","19:30"]],"sun":[]}'::jsonb,
 null, '{"sans-resa"}', 'published', '2026-04-10'),

-- --- Brunch ---
('b0000000-0000-4000-8000-000000000014','Paris','Dimanche Matin','brunch',
 '17 rue de Poitou, 75003 Paris', 48.862400, 2.363100, 2,
 'Brunch servi du vendredi au dimanche, sans réservation.',
 'Brunch Friday to Sunday, walk-ins only.',
 'Œufs pochés, pain de la boulangerie d''à côté, jus pressé devant vous. On ne réserve pas : on donne son prénom et on attend au comptoir avec un café. Compter vingt minutes d''attente vers 11 h 30.',
 'Poached eggs, bread from the bakery next door, juice pressed in front of you. No bookings: leave your name and wait at the counter with a coffee. Expect a twenty-minute wait around 11.30am.',
 '+33142720014', null, null, 'dimanchematin.paris',
 '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[["09:00","15:00"]],"sat":[["09:00","16:00"]],"sun":[["09:00","16:00"]]}'::jsonb,
 null, '{"sans-resa","enfants","vegan"}', 'published', '2026-06-21'),

('b0000000-0000-4000-8000-000000000015','Paris','La Table Longue','brunch',
 '44 rue de Saintonge, 75003 Paris', 48.862900, 2.363700, 2,
 'Grande table partagée, brunch tous les jours.',
 'One long shared table, brunch every day.',
 'Une seule grande table de vingt places, où l''on s''assoit à côté d''inconnus. Brunch servi tous les jours jusqu''à 15 h, avec une formule unique. Convient bien aux voyageurs seuls.',
 'A single twenty-seat table where you sit next to strangers. Brunch served daily until 3pm, one set formula. Good for solo travellers.',
 '+33142720015', 'https://exemple.fr/table-longue', null, null,
 '{"mon":[["09:30","15:00"]],"tue":[["09:30","15:00"]],"wed":[["09:30","15:00"]],"thu":[["09:30","15:00"]],"fri":[["09:30","15:00"]],"sat":[["09:30","16:00"]],"sun":[["09:30","16:00"]]}'::jsonb,
 null, '{"enfants","vegan"}', 'published', '2026-06-08'),

-- --- Culture ---
('b0000000-0000-4000-8000-000000000016','Paris','Musée Carnavalet','culture',
 '23 rue de Sévigné, 75003 Paris', 48.857500, 2.362700, null,
 'L''histoire de Paris, collection permanente gratuite.',
 'The history of Paris; permanent collection free of charge.',
 'L''histoire de Paris depuis la préhistoire, dans deux hôtels particuliers reliés par un jardin. La collection permanente est gratuite. Deux heures suffisent si l''on va droit aux salles de la Révolution.',
 'The history of Paris from prehistory onwards, across two mansions joined by a garden. The permanent collection is free. Two hours is enough if you head straight for the Revolution rooms.',
 '+33144595858', 'https://www.carnavalet.paris.fr', null, null,
 '{"mon":[],"tue":[["10:00","18:00"]],"wed":[["10:00","18:00"]],"thu":[["10:00","18:00"]],"fri":[["10:00","18:00"]],"sat":[["10:00","18:00"]],"sun":[["10:00","18:00"]]}'::jsonb,
 null, '{"enfants","pluie"}', 'published', '2026-06-25'),

('b0000000-0000-4000-8000-000000000017','Paris','Galerie Perreau','culture',
 '9 rue Debelleyme, 75003 Paris', 48.861600, 2.363000, null,
 'Galerie d''art contemporain, entrée libre.',
 'Contemporary art gallery, free entry.',
 'Une galerie sur deux niveaux, six expositions par an, entrée libre. Le personnel laisse tranquille et répond volontiers si on demande. Vernissages le jeudi soir, ouverts à tous.',
 'A two-floor gallery with six shows a year and free entry. Staff leave you alone and answer gladly if asked. Openings on Thursday evenings, everyone welcome.',
 '+33142720017', 'https://exemple.fr/galerie-perreau', null, 'galerieperreau',
 '{"mon":[],"tue":[["11:00","19:00"]],"wed":[["11:00","19:00"]],"thu":[["11:00","21:00"]],"fri":[["11:00","19:00"]],"sat":[["11:00","19:00"]],"sun":[]}'::jsonb,
 null, '{"pluie"}', 'published', '2026-06-19'),

('b0000000-0000-4000-8000-000000000018','Paris','Cinéma Saint-Paul','culture',
 '73 rue Saint-Antoine, 75004 Paris', 48.854800, 2.362000, 2,
 'Trois salles, films en version originale.',
 'Three screens, films in their original language.',
 'Trois petites salles, programmation en version originale sous-titrée, séances jusqu''à 22 h 30. Les fauteuils datent, la programmation rattrape largement.',
 'Three small screens, everything in the original language with subtitles, last shows at 10.30pm. The seats have seen better days; the programming more than makes up for it.',
 '+33142720018', 'https://exemple.fr/cinema-saint-paul', null, null,
 '{"mon":[["14:00","22:30"]],"tue":[["14:00","22:30"]],"wed":[["11:00","22:30"]],"thu":[["14:00","22:30"]],"fri":[["14:00","23:00"]],"sat":[["11:00","23:00"]],"sun":[["11:00","22:00"]]}'::jsonb,
 null, '{"pluie","tardif"}', 'published', '2026-05-15'),

-- --- Shopping ---
('b0000000-0000-4000-8000-000000000019','Paris','Papeterie Guénégaud','shopping',
 '5 rue Guénégaud, 75003 Paris', 48.860700, 2.359000, 2,
 'Papiers, carnets et encres, depuis 1954.',
 'Paper, notebooks and inks, since 1954.',
 'Papiers marbrés, carnets cousus main, encres en flacon. Une boutique d''un autre siècle où l''on entre pour dix minutes et où l''on reste une heure.',
 'Marbled papers, hand-sewn notebooks, bottled inks. A shop from another century: you go in for ten minutes and stay an hour.',
 '+33142720019', null, null, null,
 '{"mon":[],"tue":[["11:00","19:00"]],"wed":[["11:00","19:00"]],"thu":[["11:00","19:00"]],"fri":[["11:00","19:00"]],"sat":[["11:00","19:00"]],"sun":[]}'::jsonb,
 null, '{"pluie"}', 'published', '2026-06-10'),

('b0000000-0000-4000-8000-000000000020','Paris','Fripe Charlot','shopping',
 '62 rue Charlot, 75003 Paris', 48.863400, 2.362800, 2,
 'Friperie triée, pièces des années 60 à 90.',
 'Curated vintage, 1960s to 1990s.',
 'Une friperie triée, pas un bac à fouiller : deux cents pièces sélectionnées, des années 60 aux années 90. Les prix sont affichés, la retouche est offerte sur place.',
 'Curated vintage rather than a bin to rummage through: two hundred selected pieces from the 60s to the 90s. Prices are marked and alterations are done on site at no charge.',
 '+33142720020', null, null, 'fripecharlot',
 '{"mon":[["13:00","19:30"]],"tue":[["13:00","19:30"]],"wed":[["13:00","19:30"]],"thu":[["13:00","19:30"]],"fri":[["13:00","19:30"]],"sat":[["12:00","20:00"]],"sun":[["14:00","19:00"]]}'::jsonb,
 null, '{"pluie"}', 'published', '2026-06-14'),

('b0000000-0000-4000-8000-000000000021','Paris','Marché des Enfants Rouges','shopping',
 '39 rue de Bretagne, 75003 Paris', 48.862900, 2.362100, 1,
 'Le plus vieux marché couvert de Paris (1615).',
 'The oldest covered market in Paris (1615).',
 'Le plus vieux marché couvert de Paris, ouvert en 1615. Maraîchers, traiteurs du monde entier et quelques tables serrées. À midi c''est bondé : y aller vers 11 h ou après 14 h.',
 'The oldest covered market in Paris, opened in 1615. Greengrocers, food stalls from all over, and a few tightly packed tables. Rammed at lunchtime — go around 11am or after 2pm.',
 null, null, null, null,
 '{"mon":[],"tue":[["08:30","20:30"]],"wed":[["08:30","20:30"]],"thu":[["08:30","20:30"]],"fri":[["08:30","20:30"]],"sat":[["08:30","20:30"]],"sun":[["08:30","17:00"]]}'::jsonb,
 null, '{"pluie","enfants","sans-resa"}', 'published', '2026-06-25'),

-- --- Balades ---
('b0000000-0000-4000-8000-000000000022','Paris','Place des Vosges','balade',
 'Place des Vosges, 75004 Paris', 48.855600, 2.365500, null,
 'La plus ancienne place de Paris, arcades et pelouses.',
 'The oldest square in Paris: arcades and lawns.',
 'Trente-six pavillons de brique rose autour d''un carré de pelouses. On fait le tour sous les arcades quand il pleut, on s''assoit sur l''herbe quand il fait beau. Le jardin ferme à la tombée de la nuit.',
 'Thirty-six pink-brick pavilions around a square of lawns. Walk the arcades when it rains, sit on the grass when it doesn''t. The garden closes at dusk.',
 null, null, null, null,
 '{"mon":[["08:00","21:00"]],"tue":[["08:00","21:00"]],"wed":[["08:00","21:00"]],"thu":[["08:00","21:00"]],"fri":[["08:00","21:00"]],"sat":[["08:00","21:00"]],"sun":[["08:00","21:00"]]}'::jsonb,
 null, '{"enfants","terrasse"}', 'published', '2026-06-25'),

('b0000000-0000-4000-8000-000000000023','Paris','Jardin de l''Hôtel de Sully','balade',
 '62 rue Saint-Antoine, 75004 Paris', 48.854900, 2.364300, null,
 'Passage discret entre Saint-Antoine et la place des Vosges.',
 'A quiet shortcut between Saint-Antoine and the Place des Vosges.',
 'Un jardin à la française coincé entre deux hôtels particuliers, et surtout un passage discret qui débouche directement sur la place des Vosges. Presque personne ne le connaît, alors qu''il est ouvert à tous.',
 'A formal garden wedged between two mansions, and above all a discreet passage that comes out directly on the Place des Vosges. Almost nobody knows it, though it is open to everyone.',
 null, null, null, null,
 '{"mon":[["09:00","19:00"]],"tue":[["09:00","19:00"]],"wed":[["09:00","19:00"]],"thu":[["09:00","19:00"]],"fri":[["09:00","19:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","19:00"]]}'::jsonb,
 null, '{"enfants"}', 'published', '2026-06-25'),

-- --- Pratique ---
('b0000000-0000-4000-8000-000000000024','Paris','Pharmacie du Temple','pratique',
 '84 rue du Temple, 75003 Paris', 48.861500, 2.356100, null,
 'Pharmacie ouverte tard, personnel anglophone.',
 'Late-opening pharmacy, English-speaking staff.',
 'Ouverte jusqu''à 21 h en semaine, personnel anglophone. La plus proche de l''hôtel pour un dépannage du soir.',
 'Open until 9pm on weekdays with English-speaking staff. The closest option to the hotel for an evening emergency.',
 '+33142720024', null, null, null,
 '{"mon":[["08:30","21:00"]],"tue":[["08:30","21:00"]],"wed":[["08:30","21:00"]],"thu":[["08:30","21:00"]],"fri":[["08:30","21:00"]],"sat":[["09:00","20:00"]],"sun":[["10:00","13:00"]]}'::jsonb,
 null, '{}', 'published', '2026-06-25'),

-- --- Nuit ---
('b0000000-0000-4000-8000-000000000025','Paris','Le Sous-Sol','nuit',
 '12 rue Michel le Comte, 75003 Paris', 48.861800, 2.355000, 2,
 'Cave voûtée, concerts jazz du jeudi au samedi.',
 'Vaulted cellar, jazz sets Thursday to Saturday.',
 'Une cave voûtée sous un immeuble du XVIIe, concerts de jazz à 21 h 30 du jeudi au samedi. Cinquante places, entrée à prix libre le jeudi. Le son est meilleur au fond à gauche.',
 'A vaulted cellar under a 17th-century building, jazz sets at 9.30pm Thursday to Saturday. Fifty seats, pay-what-you-like on Thursdays. The sound is best at the back left.',
 '+33142720025', 'https://exemple.fr/le-sous-sol', null, 'lesoussol.jazz',
 '{"mon":[],"tue":[],"wed":[],"thu":[["20:00","01:00"]],"fri":[["20:00","02:00"]],"sat":[["20:00","02:00"]],"sun":[]}'::jsonb,
 null, '{"tardif","pluie"}', 'published', '2026-06-11')

on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- AVANTAGES NÉGOCIÉS — 8 offres actives
-- -----------------------------------------------------------------------------
insert into perks (
  id, place_id, title_fr, title_en, description_fr, description_en,
  conditions_fr, conditions_en, valid_from, valid_until, status
) values

('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
 'Apéritif offert', 'Complimentary aperitif',
 'Un verre de vin ou un kir offert à chaque convive avant le repas.',
 'A glass of wine or a kir offered to each guest before the meal.',
 'Valable au dîner uniquement, hors vendredi et samedi. Un verre par personne. À signaler avant la commande.',
 'Dinner service only, excluding Friday and Saturday. One glass per person. Mention before ordering.',
 '2026-01-01', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002',
 '-10 % sur l''addition', '10% off the bill',
 'Dix pour cent de remise sur le total, boissons comprises.',
 'Ten percent off the total, drinks included.',
 'Hors menus de groupe et hors 24 et 31 décembre. Une remise par table. À présenter avant l''arrivée de l''addition.',
 'Excludes group menus and 24 and 31 December. One discount per table. Show before the bill arrives.',
 '2026-01-01', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000005',
 'Dessert offert', 'Complimentary dessert',
 'Le dessert du jour offert pour deux menus commandés.',
 'The dessert of the day, free with two set menus ordered.',
 'Valable midi et soir, du mercredi au dimanche. Un dessert pour deux menus. Sur présentation de l''écran avant la commande.',
 'Lunch and dinner, Wednesday to Sunday. One dessert per two set menus. Show this screen before ordering.',
 '2026-03-01', '2026-11-30', 'published'),

('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000006',
 'Deuxième verre à moitié prix', 'Second glass half price',
 'Le deuxième verre de vin à moitié prix, sur toute la carte au verre.',
 'Second glass of wine at half price, across the by-the-glass list.',
 'Du lundi au jeudi, avant 20 h. Un avantage par personne et par soirée.',
 'Monday to Thursday, before 8pm. One per person per evening.',
 '2026-02-01', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000009',
 'Café filtre offert', 'Free filter coffee',
 'Un café filtre offert pour tout achat de café en grains.',
 'A filter coffee offered with any purchase of coffee beans.',
 'Un par jour et par personne. Sur place uniquement.',
 'One per person per day. In-store only.',
 '2026-01-15', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000014',
 'Jus pressé offert', 'Free fresh juice',
 'Un jus pressé offert avec chaque brunch complet.',
 'A fresh juice offered with every full brunch.',
 'Vendredi, samedi et dimanche. Un jus par brunch commandé. À signaler à la prise de commande.',
 'Friday, Saturday and Sunday. One juice per brunch ordered. Mention when ordering.',
 '2026-04-01', '2026-10-31', 'published'),

('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000020',
 '-15 % sur la boutique', '15% off in store',
 'Quinze pour cent de remise sur l''ensemble des pièces.',
 'Fifteen percent off everything in store.',
 'Hors périodes de soldes. Non cumulable avec une autre remise. Une utilisation par séjour.',
 'Excludes sale periods. Not combinable with other discounts. One use per stay.',
 '2026-01-01', '2026-08-31', 'published'),

('c0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000025',
 'Entrée au tarif réduit', 'Reduced entry',
 'Entrée au tarif réduit pour les concerts du jeudi et du vendredi.',
 'Reduced entry for Thursday and Friday concerts.',
 'Dans la limite des places disponibles. Deux entrées maximum. Réservation conseillée par téléphone.',
 'Subject to availability. Maximum two entries. Phoning ahead is advised.',
 '2026-01-01', '2026-12-31', 'published')

on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- CURATION — les 25 lieux rattachés à l'hôtel démo
-- `position` croissante = ordre d'affichage. 4 lieux en avant.
-- -----------------------------------------------------------------------------
insert into hotel_places (hotel_id, place_id, position, is_featured, hotel_note_fr, hotel_note_en) values
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001', 10, true,
 'Notre cantine à nous. Dites que vous venez de l''hôtel, Marc vous gardera une table près de la fenêtre.',
 'Our own canteen. Say you are staying with us and Marc will keep you a table by the window.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000006', 20, true,
 'En remontant la rue du Temple. Le patron fait goûter avant de servir : laissez-vous guider plutôt que de choisir.',
 'Just up the rue du Temple. The owner lets you taste before pouring — let him choose for you.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000012', 30, true,
 'La fournée de 17 h vaut le détour si vous rentrez tard. Le pain aux noix part très vite.',
 'The 5pm bake is worth timing your return for. The walnut bread goes fast.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000023', 40, true,
 'Notre raccourci préféré vers la place des Vosges. Traversez le jardin, la porte du fond est ouverte à tous.',
 'Our favourite shortcut to the Place des Vosges. Cross the garden; the far door is open to everyone.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002', 50, false,
 'Pour un dîner qui dure. Réservez, surtout le samedi.',
 'For a long dinner. Book ahead, especially on Saturdays.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003', 60, false,
 'Quinze places seulement : passez inscrire votre prénom en fin d''après-midi.',
 'Only fifteen seats: drop by in the late afternoon to leave your name.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004', 70, false,
 'Le midi, pour manger vite et bien sans se ruiner. Évitez 12 h 30.',
 'Lunch, quick and good and cheap. Avoid 12.30pm.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005', 80, false,
 'Même si vous n''êtes pas végétarien. Le menu du soir est ce qui se fait de mieux dans le quartier.',
 'Even if you are not vegetarian. The evening menu is the best thing in the neighbourhood.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000007', 90, false,
 'Pour un dernier verre calme, sans musique forte.',
 'For a quiet last drink, without loud music.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000008', 100, false,
 'La cuisine est ordinaire, la terrasse au coucher du soleil ne l''est pas.',
 'The food is ordinary; the terrace at sunset is not.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000009', 110, false,
 'Le meilleur café du quartier, à emporter. Quatre tabourets, pas plus.',
 'The best coffee nearby, to take away. Four stools, no more.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000010', 120, false,
 'Si vous préférez petit-déjeuner dehors : la terrasse a le soleil du matin.',
 'If you would rather have breakfast out: the terrace gets the morning sun.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000011', 130, false,
 'Un après-midi de pluie s''y passe très bien.',
 'A rainy afternoon passes well here.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000013', 140, false,
 'Un peu plus loin, mais le kouign-amann justifie les dix minutes de marche.',
 'A little further, but the kouign-amann justifies the ten-minute walk.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000014', 150, false,
 'Notre adresse du dimanche. Arrivez à 9 h ou après 14 h.',
 'Our Sunday address. Arrive at 9am or after 2pm.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000015', 160, false,
 'La grande table partagée : agréable quand on voyage seul.',
 'The long shared table: good when travelling alone.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000016', 170, false,
 'Collection permanente gratuite, à sept minutes. Commencez par le deuxième étage.',
 'Free permanent collection, seven minutes away. Start on the second floor.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000017', 180, false,
 'Entrée libre, on peut y passer vingt minutes sans culpabiliser.',
 'Free entry; twenty minutes is a perfectly respectable visit.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000018', 190, false,
 'Films en version originale, à six minutes à pied.',
 'Films in their original language, six minutes on foot.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000019', 200, false,
 'Pour rapporter autre chose qu''un aimant de frigo.',
 'For bringing home something other than a fridge magnet.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000020', 210, false,
 'Friperie sérieusement triée. La retouche est offerte sur place.',
 'Properly curated vintage. Alterations are done on site at no charge.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000021', 220, false,
 'Le marché couvert de 1615. Idéal un midi de pluie.',
 'The covered market from 1615. Ideal on a rainy lunchtime.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000022', 230, false,
 'Cinq minutes par la rue de Turenne. Les arcades restent sèches quand il pleut.',
 'Five minutes via the rue de Turenne. The arcades stay dry when it rains.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000024', 240, false,
 'La pharmacie la plus proche, ouverte jusqu''à 21 h.',
 'The nearest pharmacy, open until 9pm.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000025', 250, false,
 'Concerts à 21 h 30. Demandez une place au fond à gauche, le son y est meilleur.',
 'Sets at 9.30pm. Ask for a seat at the back left, where the sound is best.')
on conflict (hotel_id, place_id) do nothing;

-- -----------------------------------------------------------------------------
-- ITINÉRAIRES
-- -----------------------------------------------------------------------------
insert into itineraries (
  id, city, hotel_id, title_fr, title_en, description_fr, description_en,
  duration_minutes, tags, steps, status
) values

('d0000000-0000-4000-8000-000000000001','Paris', null,
 'Le Marais en une demi-journée', 'The Marais in half a day',
 'Une boucle de trois kilomètres qui part du café du coin et finit devant un verre, en passant par le plus vieux marché couvert de Paris.',
 'A three-kilometre loop that starts with a coffee and ends with a drink, by way of the oldest covered market in Paris.',
 240, '{"demi-journee","enfants"}',
 '[
   {"place_id":"b0000000-0000-4000-8000-000000000009","order":1,"note_fr":"Commencez par un filtre, à emporter : la boutique ne compte que quatre tabourets.","note_en":"Start with a filter coffee to take away — the shop has only four stools."},
   {"place_id":"b0000000-0000-4000-8000-000000000016","order":2,"note_fr":"Deux heures suffisent. Montez directement au deuxième étage.","note_en":"Two hours is plenty. Go straight to the second floor."},
   {"place_id":"b0000000-0000-4000-8000-000000000021","order":3,"note_fr":"Déjeuner debout au marché. Vers 11 h ou après 14 h, jamais à midi.","note_en":"Lunch standing at the market. Around 11am or after 2pm, never at noon."},
   {"place_id":"b0000000-0000-4000-8000-000000000022","order":4,"note_fr":"Faites le tour sous les arcades, puis asseyez-vous sur la pelouse.","note_en":"Walk the arcades, then sit on the grass."},
   {"place_id":"b0000000-0000-4000-8000-000000000023","order":5,"note_fr":"Sortez par le jardin de Sully : le passage du fond ramène rue Saint-Antoine.","note_en":"Leave through the Sully garden: the passage at the back leads back to the rue Saint-Antoine."},
   {"place_id":"b0000000-0000-4000-8000-000000000006","order":6,"note_fr":"Terminez au comptoir. Votre avantage : deuxième verre à moitié prix avant 20 h.","note_en":"Finish at the bar. Your perk: second glass half price before 8pm."}
 ]'::jsonb,
 'published'),

('d0000000-0000-4000-8000-000000000002','Paris','a0000000-0000-4000-8000-000000000001',
 'Une soirée dans le Haut-Marais', 'An evening in the upper Marais',
 'Trois arrêts en trois quarts d''heure de marche, de l''apéritif au concert de minuit.',
 'Three stops within forty-five minutes of walking, from aperitif to a midnight set.',
 210, '{"soir","pluie"}',
 '[
   {"place_id":"b0000000-0000-4000-8000-000000000006","order":1,"note_fr":"Apéritif à 18 h 30, avant que le comptoir ne se remplisse.","note_en":"Aperitif at 6.30pm, before the bar fills up."},
   {"place_id":"b0000000-0000-4000-8000-000000000005","order":2,"note_fr":"Dîner à 19 h 30. Le dessert du jour vous est offert pour deux menus.","note_en":"Dinner at 7.30pm. The dessert of the day is on the house with two set menus."},
   {"place_id":"b0000000-0000-4000-8000-000000000025","order":3,"note_fr":"Concert à 21 h 30, du jeudi au samedi. Tarif réduit avec votre avantage.","note_en":"Set at 9.30pm, Thursday to Saturday. Reduced entry with your perk."}
 ]'::jsonb,
 'published')

on conflict (id) do nothing;
