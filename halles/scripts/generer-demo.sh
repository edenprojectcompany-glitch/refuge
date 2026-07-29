#!/usr/bin/env bash
# =============================================================================
# Halles — génère le jeu de démonstration embarqué
# =============================================================================
# Extrait de la base l'hôtel de démonstration et sa curation, au format exact
# que consomme lib/data/guide.ts, et l'écrit dans lib/data/demo.json.
#
# La source de vérité reste supabase/seed.sql : ce fichier est un artefact
# régénérable, jamais à éditer à la main.
#
#   ./scripts/generer-demo.sh              # base locale
#   DATABASE_URL=postgres://... ./scripts/generer-demo.sh
# =============================================================================
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${DATABASE_URL:-postgres://postgres@/postgres?host=/tmp&port=55432}"
SLUG="${SLUG_DEMO:-lemarais}"

psql -v ON_ERROR_STOP=1 -tA "$BASE" -v slug="$SLUG" <<'SQL' > "$RACINE/lib/data/demo.json"
select jsonb_pretty(jsonb_build_object(
  'hotel', (select to_jsonb(h) from hotels h where h.slug = :'slug'),
  'lieux', (
    select coalesce(jsonb_agg(ligne order by ligne->>'position'), '[]'::jsonb)
    from (
      select to_jsonb(p)
             || jsonb_build_object(
                  'position', hp.position,
                  'is_featured', hp.is_featured,
                  'hotel_note_fr', hp.hotel_note_fr,
                  'hotel_note_en', hp.hotel_note_en,
                  'avantages', (
                    select coalesce(jsonb_agg(to_jsonb(pk)), '[]'::jsonb)
                    from perks pk
                    where pk.place_id = p.id and pk.status = 'published'
                  )
                ) as ligne
      from hotel_places hp
      join places p on p.id = hp.place_id
      join hotels h on h.id = hp.hotel_id
      where h.slug = :'slug' and p.status = 'published'
      order by hp.position
    ) as lignes
  ),
  'itineraires', (
    select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
    from itineraries i, hotels h
    where h.slug = :'slug'
      and i.city = h.city
      and i.status = 'published'
      and (i.hotel_id = h.id or i.hotel_id is null)
  )
));
SQL

echo "→ lib/data/demo.json régénéré ($(wc -c < "$RACINE/lib/data/demo.json") octets)"
