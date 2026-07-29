-- Rollback de 20260729120200_rls.sql
-- Retire les policies et coupe la RLS. Les GRANT posés par la migration sont
-- révoqués : on revient à une base fermée à anon/authenticated.

drop policy if exists hotels_lecture_publique       on hotels;
drop policy if exists hotels_lecture_membre         on hotels;
drop policy if exists hotels_lecture_admin          on hotels;
drop policy if exists places_lecture_publique       on places;
drop policy if exists places_lecture_admin          on places;
drop policy if exists perks_lecture_publique        on perks;
drop policy if exists perks_lecture_admin           on perks;
drop policy if exists hotel_places_lecture_publique on hotel_places;
drop policy if exists hotel_places_lecture_membre   on hotel_places;
drop policy if exists hotel_places_lecture_admin    on hotel_places;
drop policy if exists itineraries_lecture_publique  on itineraries;
drop policy if exists itineraries_lecture_admin     on itineraries;
drop policy if exists profiles_lecture_soi          on profiles;
drop policy if exists profiles_maj_nom              on profiles;
drop policy if exists hotel_users_lecture_soi       on hotel_users;
drop policy if exists events_insertion_publique     on events;

revoke all on hotels, places, perks, hotel_places, itineraries, profiles, hotel_users, events
  from anon, authenticated;
revoke all on sequence events_id_seq from anon, authenticated;

alter table hotels       disable row level security;
alter table places       disable row level security;
alter table perks        disable row level security;
alter table hotel_places disable row level security;
alter table itineraries  disable row level security;
alter table profiles     disable row level security;
alter table hotel_users  disable row level security;
alter table events       disable row level security;
