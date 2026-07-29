import type { EtapeItineraire, Itineraire, LieuDuGuide, Locale } from '@/lib/types';
import { minutesAPied, type Point } from '@/lib/geo';
import { champBilingue } from '@/lib/i18n';

/**
 * Assemblage d'un itinéraire.
 *
 * `steps` est du JSON libre en base : il peut référencer un lieu retiré du guide
 * ou dépublié depuis. Une étape orpheline est ignorée plutôt que de faire
 * tomber la page — un parcours à cinq arrêts sur six reste utile.
 */

export interface EtapeResolue {
  ordre: number;
  lieu: LieuDuGuide;
  note: string | null;
  /** Marche depuis l'étape précédente, en minutes. Absent pour la première. */
  minutesDepuisPrecedente: number | null;
}

export function resoudreEtapes(
  itineraire: Pick<Itineraire, 'steps'>,
  lieuxDuGuide: LieuDuGuide[],
  locale: Locale,
  depart?: Point,
): EtapeResolue[] {
  const parIdentifiant = new Map(lieuxDuGuide.map((lieu) => [lieu.id, lieu]));

  const etapes = [...(itineraire.steps ?? [])]
    .filter((etape): etape is EtapeItineraire => Boolean(etape?.place_id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((etape) => ({ etape, lieu: parIdentifiant.get(etape.place_id) }))
    .filter((paire): paire is { etape: EtapeItineraire; lieu: LieuDuGuide } =>
      paire.lieu !== undefined,
    );

  return etapes.map(({ etape, lieu }, index) => {
    const precedent = index === 0 ? depart : etapes[index - 1].lieu;
    return {
      ordre: index + 1,
      lieu,
      note: champBilingue(etape as unknown as Record<string, unknown>, 'note', locale),
      minutesDepuisPrecedente: precedent ? minutesAPied(precedent, lieu) : null,
    };
  });
}

/** Durée totale annoncée, ou à défaut la somme des marches entre étapes. */
export function dureeItineraire(
  itineraire: Pick<Itineraire, 'duration_minutes'>,
  etapes: EtapeResolue[],
): number | null {
  if (itineraire.duration_minutes && itineraire.duration_minutes > 0) {
    return itineraire.duration_minutes;
  }
  const marche = etapes.reduce((total, etape) => total + (etape.minutesDepuisPrecedente ?? 0), 0);
  return marche > 0 ? marche : null;
}

/** « 1 h 30 » / « 45 min ». */
export function formaterDuree(minutes: number, locale: Locale): string {
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (locale === 'fr') return reste === 0 ? `${heures} h` : `${heures} h ${reste}`;
  return reste === 0 ? `${heures} h` : `${heures} h ${reste} min`;
}
