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
