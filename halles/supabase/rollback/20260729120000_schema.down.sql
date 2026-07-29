-- Rollback de 20260729120000_schema.sql
-- Destructif : supprime les tables et donc les données. Ne jamais jouer en production
-- sans sauvegarde préalable.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop materialized view if exists analytics.daily_stats;
drop schema if exists analytics cascade;

drop table if exists events;
drop table if exists hotel_users;
drop table if exists profiles;
drop table if exists itineraries;
drop table if exists hotel_places;
drop table if exists perks;
drop table if exists places;
drop table if exists hotels;

drop function if exists public.set_updated_at();

drop type if exists event_type;
drop type if exists user_role;
drop type if exists content_status;
drop type if exists place_category;
