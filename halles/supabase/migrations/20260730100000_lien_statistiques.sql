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

-- Le jeton vit dans sa propre table, et surtout pas dans `hotels` : cette
-- dernière est lisible par le rôle anonyme (c'est ce qui fait marcher le
-- guide), et un `select=stats_token` aurait suffi à récupérer les jetons de
-- tous les hôtels publiés. Une colonne se protège par privilège de colonne,
-- ce qui casse le `select *` du guide et se re-perce à la première colonne
-- ajoutée. Une table sans grant ni policy ne se perce pas par distraction.
create table if not exists hotel_stats_tokens (
  hotel_id uuid primary key references hotels (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table hotel_stats_tokens is
  'Secret du lien /s/{token}, hors de hotels pour rester illisible par anon. À régénérer pour révoquer un accès.';

alter table hotel_stats_tokens enable row level security;

-- Aucune policy, aucun grant à anon ni authenticated : la table n'est jamais
-- lue par PostgREST. Seuls le service role et les fonctions `security definer`
-- ci-dessous y touchent.
grant all on hotel_stats_tokens to service_role;

-- Un hôtel sans jeton serait un hôtel dont l'hôtelier ne voit rien : on ne
-- laisse pas ça dépendre du chemin d'écriture emprunté par le back-office.
create or replace function public.creer_jeton_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into hotel_stats_tokens (hotel_id) values (new.id)
  on conflict (hotel_id) do nothing;
  return new;
end;
$$;

drop trigger if exists hotels_jeton_stats on hotels;
create trigger hotels_jeton_stats
  after insert on hotels
  for each row execute function public.creer_jeton_stats();

-- Hôtels déjà en base au moment de la migration.
insert into hotel_stats_tokens (hotel_id)
select id from hotels
on conflict (hotel_id) do nothing;

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
  from hotel_stats_tokens t
  join hotels h on h.id = t.hotel_id
  left join analytics.daily_stats d
    on d.hotel_id = h.id
   and d.day >= (current_date - make_interval(days => greatest(p_jours, 1)))
  where t.token = p_jeton
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
    select h.id
    from hotel_stats_tokens t
    join hotels h on h.id = t.hotel_id
    where t.token = p_jeton and h.status = 'published'
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
