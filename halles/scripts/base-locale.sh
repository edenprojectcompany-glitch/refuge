#!/usr/bin/env bash
# =============================================================================
# Halles — (re)construit la base de développement locale
# =============================================================================
# Applique le simulacre Supabase, les migrations et le seed sur la base locale.
# À lancer notamment après ./scripts/test-sql.sh, qui termine par les rollbacks
# et laisse donc la base vide.
# =============================================================================
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${DATABASE_URL:-postgres://postgres@/postgres?host=/tmp&port=55432}"
PSQL=(psql -v ON_ERROR_STOP=1 --quiet "$BASE")

"${PSQL[@]}" -c 'drop schema if exists public cascade;
                 drop schema if exists analytics cascade;
                 drop schema if exists auth cascade;
                 create schema public;' >/dev/null

"${PSQL[@]}" -f "$RACINE/supabase/tests/00_shim_supabase.sql" >/dev/null
for migration in "$RACINE"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$migration" >/dev/null
done
"${PSQL[@]}" -f "$RACINE/supabase/seed.sql" >/dev/null

# PostgREST met son cache de schéma en défaut après un DROP SCHEMA.
"${PSQL[@]}" -c "notify pgrst, 'reload schema'" >/dev/null 2>&1 || true

echo "✓ base locale prête : $("${PSQL[@]}" -tAc 'select count(*) from places') lieux, $("${PSQL[@]}" -tAc 'select count(*) from perks') avantages"
