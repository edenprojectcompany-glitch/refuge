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
