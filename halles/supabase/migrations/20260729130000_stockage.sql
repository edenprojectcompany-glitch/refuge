-- =============================================================================
-- Halles — bucket de stockage des photos
-- =============================================================================
-- Les photos des lieux viennent du site du commerçant, mais sont recopiées une
-- fois ici par le back-office. Un lien direct vers son serveur casserait à
-- chaque refonte de son site, subirait sa protection anti-hotlink, et
-- obligerait à autoriser tous les domaines dans l'optimiseur d'images de
-- Next — ce qui en ferait un proxy d'images public.
--
-- Ne rapatrier que des photos de commerçants déjà partenaires.
-- =============================================================================

-- Le schéma `storage` n'existe que sur un projet Supabase. Sur un Postgres nu
-- (tests locaux), on ne fait rien plutôt que d'échouer.
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'schéma storage absent : bucket photos non créé (attendu hors Supabase)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'photos', 'photos', true,
    3 * 1024 * 1024,                                    -- 3 Mo : une photo de fiche, pas un original d'appareil
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
  on conflict (id) do nothing;

  -- Lecture publique : les photos s'affichent dans un guide sans compte.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'photos_lecture_publique'
  ) then
    create policy photos_lecture_publique on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'photos');
  end if;

  -- Aucune policy d'écriture : seul le service role dépose des fichiers, depuis
  -- le back-office. Un visiteur ne doit jamais pouvoir écrire dans le bucket.
end
$$;
