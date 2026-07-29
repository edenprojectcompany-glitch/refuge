-- Rollback de 20260729120100_fonctions.sql
-- À rejouer APRÈS le rollback de la RLS : les policies dépendent de ces fonctions.

drop function if exists public.purge_old_events();
drop function if exists public.refresh_daily_stats();
drop function if exists public.hotel_daily_stats(uuid, date, date);
drop function if exists public.update_hotel_info(uuid, jsonb);
drop function if exists public.is_hotel_member(uuid);
drop function if exists public.is_admin();
