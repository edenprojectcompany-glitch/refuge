-- =============================================================================
-- Halles — duplication de curation
-- =============================================================================
-- C'est la fonction qui conditionne la rentabilité : reprendre la sélection d'un
-- hôtel voisin fait passer l'onboarding de dix heures à trois.
--
-- Deux garde-fous produit :
--   * même ville obligatoire — dupliquer Paris vers Lyon n'a aucun sens ;
--   * les notes de l'hôtelier ne sont PAS copiées par défaut. Ce sont ses mots :
--     recopiés tels quels, ils feraient dire à un hôtelier ce qu'un autre a
--     écrit, et deux guides identiques détruiraient précisément ce qui
--     distingue le produit d'une carte. L'appelant peut les demander
--     explicitement, pour repartir d'une base à réécrire.
--
-- Les lieux déjà présents dans la cible sont laissés intacts : la duplication
-- est un ajout, jamais un écrasement.
-- =============================================================================

create or replace function public.dupliquer_curation(
  p_source uuid,
  p_cible uuid,
  p_avec_notes boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ville_source text;
  v_ville_cible text;
  v_ajoutes int;
begin
  if p_source = p_cible then
    raise exception 'source_et_cible_identiques' using errcode = '22023';
  end if;

  select city into v_ville_source from hotels where id = p_source;
  select city into v_ville_cible from hotels where id = p_cible;

  if v_ville_source is null or v_ville_cible is null then
    raise exception 'hotel_introuvable' using errcode = 'P0002';
  end if;

  if v_ville_source is distinct from v_ville_cible then
    raise exception 'villes_differentes' using errcode = '22023';
  end if;

  insert into hotel_places (hotel_id, place_id, position, is_featured, hotel_note_fr, hotel_note_en)
  select p_cible,
         source.place_id,
         source.position,
         source.is_featured,
         case when p_avec_notes then source.hotel_note_fr end,
         case when p_avec_notes then source.hotel_note_en end
  from hotel_places source
  join places lieu on lieu.id = source.place_id
  where source.hotel_id = p_source
    -- Un lieu fermé ou archivé n'a pas à repartir dans un nouveau guide.
    and lieu.status = 'published'
  on conflict (hotel_id, place_id) do nothing;

  get diagnostics v_ajoutes = row_count;
  return v_ajoutes;
end;
$$;

revoke all on function public.dupliquer_curation(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.dupliquer_curation(uuid, uuid, boolean) to service_role;

comment on function public.dupliquer_curation(uuid, uuid, boolean) is
  'Recopie la sélection de lieux d''un hôtel vers un autre de la même ville. Sans les notes, sauf demande explicite.';
