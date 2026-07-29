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
