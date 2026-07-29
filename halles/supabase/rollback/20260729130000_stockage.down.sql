-- Rollback de 20260729130000_stockage.sql
-- Ne supprime pas les fichiers déjà déposés : les retirer manuellement si besoin.

do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;
  drop policy if exists photos_lecture_publique on storage.objects;
  delete from storage.buckets where id = 'photos';
end
$$;
