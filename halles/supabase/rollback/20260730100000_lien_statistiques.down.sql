-- Rollback de 20260730100000_lien_statistiques.sql
drop function if exists public.classements_par_jeton(uuid, int, int);
drop function if exists public.stats_par_jeton(uuid, int);
drop index if exists hotels_stats_token_idx;
alter table hotels drop column if exists stats_token;
