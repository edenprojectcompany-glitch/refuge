-- Rollback de 20260729140000_duplication_curation.sql
drop function if exists public.dupliquer_curation(uuid, uuid, boolean);
