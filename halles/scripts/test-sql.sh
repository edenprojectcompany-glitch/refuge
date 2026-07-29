#!/usr/bin/env bash
# =============================================================================
# Halles — vérification du schéma, du seed et de la RLS sur un Postgres jetable
# =============================================================================
# Rejoue migrations + seed + tests RLS sur une base neuve, sans dépendre d'un
# projet Supabase. Utilise DATABASE_URL si défini, sinon une base locale.
#
#   ./scripts/test-sql.sh
#   DATABASE_URL=postgres://... ./scripts/test-sql.sh
# =============================================================================
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${DATABASE_URL:-postgres://postgres@/postgres?host=/tmp&port=55432}"
PSQL=(psql -v ON_ERROR_STOP=1 --quiet "$BASE")

echo "→ base de test : ${BASE%%\?*}"

"${PSQL[@]}" -c 'drop schema if exists public cascade;
                 drop schema if exists analytics cascade;
                 drop schema if exists auth cascade;
                 create schema public;' >/dev/null

echo "→ simulacre Supabase"
"${PSQL[@]}" -f "$RACINE/supabase/tests/00_shim_supabase.sql" >/dev/null

for migration in "$RACINE"/supabase/migrations/*.sql; do
  echo "→ migration $(basename "$migration")"
  "${PSQL[@]}" -f "$migration" >/dev/null
done

echo "→ seed"
"${PSQL[@]}" -f "$RACINE/supabase/seed.sql" >/dev/null

echo "→ tests RLS"
"${PSQL[@]}" -f "$RACINE/supabase/tests/01_rls_test.sql"

echo "→ rejeu du seed (idempotence)"
"${PSQL[@]}" -f "$RACINE/supabase/seed.sql" >/dev/null

echo "→ rollback"
for rollback in $(ls -r "$RACINE"/supabase/rollback/*.sql); do
  echo "  $(basename "$rollback")"
  "${PSQL[@]}" -f "$rollback" >/dev/null
done

echo "✓ schéma, seed, RLS et rollback vérifiés"
