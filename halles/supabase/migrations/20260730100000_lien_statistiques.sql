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
