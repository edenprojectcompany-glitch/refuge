-- =============================================================================
-- Halles — vérification des policies RLS
-- =============================================================================
-- Chaque bloc pose une question à laquelle la base doit répondre correctement,
-- sinon le script s'arrête en erreur (exit code non nul, cf. psql -v ON_ERROR_STOP=1).
-- =============================================================================

\set ON_ERROR_STOP on

-- Utilitaire d'assertion.
create or replace function pg_temp.verifie(p_libelle text, p_condition boolean)
returns void
language plpgsql
as $$
begin
  if p_condition then
    raise notice 'OK   %', p_libelle;
  else
    raise exception 'ECHEC %', p_libelle;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Jeu d'essai : un hôtel brouillon, un lieu brouillon, deux utilisateurs.
-- -----------------------------------------------------------------------------
insert into hotels (id, slug, name, city, lat, lng, status)
values ('a0000000-0000-4000-8000-0000000000ff','brouillon','Hôtel Brouillon','Paris',48.86,2.35,'draft')
on conflict (id) do nothing;

insert into places (id, city, name, category, address, lat, lng, status)
values ('b0000000-0000-4000-8000-0000000000ff','Paris','Lieu Brouillon','bar','1 rue X',48.86,2.35,'draft')
on conflict (id) do nothing;

insert into perks (id, place_id, title_fr, status)
values ('c0000000-0000-4000-8000-0000000000ff','b0000000-0000-4000-8000-0000000000ff','Avantage caché','published')
on conflict (id) do nothing;

insert into hotel_places (hotel_id, place_id, position)
values ('a0000000-0000-4000-8000-0000000000ff','b0000000-0000-4000-8000-000000000001', 10)
on conflict do nothing;

insert into auth.users (id, email) values
  ('e0000000-0000-4000-8000-000000000001','hotelier@exemple.fr'),
  ('e0000000-0000-4000-8000-000000000002','intrus@exemple.fr')
on conflict (id) do nothing;

-- Le trigger on_auth_user_created a créé les profils ; on rattache l'hôtelier
-- à l'hôtel démo, l'intrus à rien du tout.
insert into hotel_users (hotel_id, user_id)
values ('a0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001')
on conflict do nothing;

select pg_temp.verifie(
  'le trigger auth.users crée bien un profil hotelier',
  (select count(*) = 2 from profiles where role = 'hotelier'
    and id in ('e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002'))
);

-- =============================================================================
-- ANON — le visiteur du guide
-- =============================================================================
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select pg_temp.verifie('anon ne voit que les hôtels publiés',
  (select count(*) = 0 from hotels where status <> 'published'));

select pg_temp.verifie('anon voit l''hôtel démo',
  (select count(*) = 1 from hotels where slug = 'lemarais'));

select pg_temp.verifie('anon ne voit aucun lieu non publié',
  (select count(*) = 0 from places where status <> 'published'));

select pg_temp.verifie('anon voit les 25 lieux publiés',
  (select count(*) = 25 from places));

select pg_temp.verifie('anon ne voit pas un avantage publié rattaché à un lieu brouillon',
  (select count(*) = 0 from perks where id = 'c0000000-0000-4000-8000-0000000000ff'));

select pg_temp.verifie('anon voit les 8 avantages du guide',
  (select count(*) = 8 from perks));

select pg_temp.verifie('anon ne voit pas la curation d''un hôtel brouillon',
  (select count(*) = 0 from hotel_places where hotel_id = 'a0000000-0000-4000-8000-0000000000ff'));

select pg_temp.verifie('anon voit la curation de l''hôtel publié',
  (select count(*) = 25 from hotel_places));

select pg_temp.verifie('anon voit les 2 itinéraires publiés',
  (select count(*) = 2 from itineraries));

-- Analytics : écriture autorisée, lecture impossible.
insert into events (hotel_id, session_id, type, locale, source)
values ('a0000000-0000-4000-8000-000000000001','sess-anon-000001','session_start','fr','chambre');

do $$
begin
  -- Pas de policy SELECT et pas de GRANT SELECT : la lecture échoue au niveau
  -- des privilèges, avant même la RLS. C'est la garantie la plus forte.
  begin
    perform * from events;
    raise exception 'ECHEC anon a pu relire les events';
  exception when insufficient_privilege then
    raise notice 'OK   anon ne peut pas relire les events';
  end;

  -- Écrire un événement sur un hôtel non publié doit être refusé.
  begin
    insert into events (hotel_id, session_id, type)
    values ('a0000000-0000-4000-8000-0000000000ff','sess-anon-000002','session_start');
    raise exception 'ECHEC anon a pu écrire un event sur un hôtel brouillon';
  exception when insufficient_privilege then
    raise notice 'OK   anon ne peut pas écrire d''event sur un hôtel brouillon';
  end;

  -- Aucune écriture sur le contenu.
  begin
    update hotels set name = 'Piraté' where slug = 'lemarais';
    raise exception 'ECHEC anon a pu modifier un hôtel';
  exception when insufficient_privilege then
    raise notice 'OK   anon ne peut pas modifier un hôtel';
  end;

  begin
    perform * from profiles;
    raise exception 'ECHEC anon a pu lire profiles';
  exception when insufficient_privilege then
    raise notice 'OK   anon ne peut pas lire profiles';
  end;
end
$$;

reset role;

-- =============================================================================
-- AUTHENTICATED — l'hôtelier
-- =============================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', false);

select pg_temp.verifie('l''hôtelier lit son hôtel',
  (select count(*) = 1 from hotels where id = 'a0000000-0000-4000-8000-000000000001'));

select pg_temp.verifie('l''hôtelier ne lit pas le profil des autres',
  (select count(*) = 1 from profiles));

-- Édition des infos pratiques via la RPC.
select update_hotel_info(
  'a0000000-0000-4000-8000-000000000001',
  '{"wifi_password":"nouveau2026","breakfast_info":"Petit-déjeuner de 7 h à 11 h.","custom_blocks":[]}'::jsonb
);

reset role;
select pg_temp.verifie('la RPC a bien modifié le mot de passe wifi',
  (select wifi_password = 'nouveau2026' from hotels where id = 'a0000000-0000-4000-8000-000000000001'));
select pg_temp.verifie('la RPC n''a pas touché aux champs non fournis',
  (select wifi_name = 'Sainte-Croix Guests' from hotels where id = 'a0000000-0000-4000-8000-000000000001'));

set role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', false);

do $$
begin
  -- Champ hors liste blanche : refus explicite.
  begin
    perform update_hotel_info('a0000000-0000-4000-8000-000000000001','{"slug":"pirate"}'::jsonb);
    raise exception 'ECHEC la RPC a accepté de modifier le slug';
  exception when insufficient_privilege then
    raise notice 'OK   la RPC refuse les champs hors liste blanche';
  end;

  -- Écriture directe sur la table : aucune policy UPDATE, donc refus.
  begin
    update hotels set wifi_name = 'contournement' where id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'ECHEC l''hôtelier a pu écrire directement dans hotels';
  exception when insufficient_privilege then
    raise notice 'OK   l''hôtelier ne peut pas écrire directement dans hotels';
  end;

  -- Statistiques du sien : autorisé.
  perform * from hotel_daily_stats('a0000000-0000-4000-8000-000000000001');
  raise notice 'OK   l''hôtelier lit les stats de son hôtel';
end
$$;

reset role;

-- =============================================================================
-- AUTHENTICATED — l'intrus, connecté mais rattaché à aucun hôtel
-- =============================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', false);

do $$
begin
  begin
    perform update_hotel_info('a0000000-0000-4000-8000-000000000001','{"wifi_name":"intrusion"}'::jsonb);
    raise exception 'ECHEC un intrus a pu éditer les infos d''un hôtel';
  exception when insufficient_privilege then
    raise notice 'OK   un intrus ne peut pas éditer les infos d''un hôtel';
  end;

  begin
    perform * from hotel_daily_stats('a0000000-0000-4000-8000-000000000001');
    raise exception 'ECHEC un intrus a pu lire les stats d''un hôtel';
  exception when insufficient_privilege then
    raise notice 'OK   un intrus ne peut pas lire les stats d''un hôtel';
  end;

  begin
    perform * from analytics.daily_stats;
    raise exception 'ECHEC un intrus a pu lire la vue matérialisée';
  exception when insufficient_privilege then
    raise notice 'OK   la vue analytics.daily_stats est hors de portée';
  end;
end
$$;

reset role;

-- =============================================================================
-- Maintenance
-- =============================================================================
select refresh_daily_stats();
select pg_temp.verifie('la vue agrégée contient la session enregistrée par anon',
  (select sessions = 1 from analytics.daily_stats
    where hotel_id = 'a0000000-0000-4000-8000-000000000001'));

select pg_temp.verifie('la purge ne supprime rien de récent', purge_old_events() = 0);

-- =============================================================================
-- Duplication de curation
-- =============================================================================
insert into hotels (id, slug, name, city, lat, lng, status)
values ('a0000000-0000-4000-8000-0000000000aa','hotel-voisin','Hôtel Voisin','Paris',48.86,2.36,'published')
on conflict (id) do nothing;

insert into hotels (id, slug, name, city, lat, lng, status)
values ('a0000000-0000-4000-8000-0000000000bb','hotel-lyon','Hôtel Lyon','Lyon',45.76,4.84,'published')
on conflict (id) do nothing;

select pg_temp.verifie(
  'la duplication recopie les 25 lieux publiés',
  dupliquer_curation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-0000000000aa') = 25
);

select pg_temp.verifie(
  'les notes de l''hôtelier ne sont pas recopiées par défaut',
  (select count(*) = 0 from hotel_places
    where hotel_id = 'a0000000-0000-4000-8000-0000000000aa' and hotel_note_fr is not null)
);

select pg_temp.verifie(
  'l''ordre et les mises en avant suivent',
  (select count(*) = 4 from hotel_places
    where hotel_id = 'a0000000-0000-4000-8000-0000000000aa' and is_featured)
);

select pg_temp.verifie(
  'une deuxième duplication n''ajoute aucun doublon',
  dupliquer_curation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-0000000000aa') = 0
);

do $$
begin
  begin
    perform dupliquer_curation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-0000000000bb');
    raise exception 'ECHEC la duplication a franchi les villes';
  exception when sqlstate '22023' then
    raise notice 'OK   la duplication refuse deux villes différentes';
  end;

  begin
    perform dupliquer_curation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
    raise exception 'ECHEC la duplication a accepté source = cible';
  exception when sqlstate '22023' then
    raise notice 'OK   la duplication refuse source = cible';
  end;
end
$$;

-- Avec notes, sur un hôtel neuf : la copie explicite fonctionne.
insert into hotels (id, slug, name, city, lat, lng, status)
values ('a0000000-0000-4000-8000-0000000000cc','hotel-avec-notes','Hôtel Notes','Paris',48.86,2.36,'draft')
on conflict (id) do nothing;

select pg_temp.verifie(
  'la copie des notes reste possible sur demande',
  (select dupliquer_curation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-0000000000cc', true) = 25)
);
select pg_temp.verifie(
  'les notes sont bien présentes quand on les demande',
  (select count(*) = 25 from hotel_places
    where hotel_id = 'a0000000-0000-4000-8000-0000000000cc' and hotel_note_fr is not null)
);

\echo ''
\echo '--- Toutes les vérifications RLS sont passées ---'
