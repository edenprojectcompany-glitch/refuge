#!/usr/bin/env bash
# =============================================================================
# Halles — assemble le fichier d'installation à coller dans Supabase
# =============================================================================
# Concatène les migrations et le seed dans supabase/installation.sql, pour
# n'avoir qu'un seul copier-coller à faire dans l'éditeur SQL de Supabase.
#
# Fichier généré : ne pas l'éditer à la main, la source reste supabase/migrations/.
# =============================================================================
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIBLE="$RACINE/supabase/installation.sql"

{
  echo "-- ============================================================================="
  echo "-- Halles — installation complète"
  echo "-- ============================================================================="
  echo "-- Fichier ASSEMBLÉ par scripts/generer-installation.sh : ne pas l'éditer."
  echo "-- Source : supabase/migrations/*.sql puis supabase/seed.sql"
  echo "--"
  echo "-- À coller en une fois dans l'éditeur SQL d'un projet Supabase NEUF, puis"
  echo "-- exécuter. À ne lancer qu'une seule fois : les migrations créent des types"
  echo "-- et des tables, un second passage échouerait sur « already exists »."
  echo "--"
  echo "-- Le jeu de démonstration en fin de fichier (1 hôtel, 25 lieux, 8 avantages)"
  echo "-- est supprimable : voir la section « NETTOYAGE » du README."
  echo "-- ============================================================================="
  echo

  for fichier in "$RACINE"/supabase/migrations/*.sql "$RACINE/supabase/seed.sql"; do
    echo
    echo "-- ═══════════════════════════════════════════════════════════════════════════"
    echo "-- $(basename "$fichier")"
    echo "-- ═══════════════════════════════════════════════════════════════════════════"
    echo
    cat "$fichier"
  done
} > "$CIBLE"

echo "✓ $CIBLE ($(wc -l < "$CIBLE") lignes)"
