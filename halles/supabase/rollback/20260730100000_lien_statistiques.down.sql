-- Rollback de 20260730100000_lien_statistiques.sql
drop function if exists public.classements_par_jeton(uuid, int, int);
drop function if exists public.stats_par_jeton(uuid, int);
drop trigger if exists hotels_jeton_stats on hotels;
drop function if exists public.creer_jeton_stats();
drop table if exists hotel_stats_tokens;
