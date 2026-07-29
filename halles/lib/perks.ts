import type { Avantage, LieuDuGuide, Locale } from '@/lib/types';
import { champBilingue } from '@/lib/i18n';

/**
 * Validité des avantages.
 *
 * La RLS filtre déjà sur le statut ; ici on filtre sur les dates. Le calcul est
 * fait en heure de Paris : un avantage qui expire le 31 août doit rester valable
 * jusqu'au bout de la soirée du 31, y compris pour un voyageur dont le
 * téléphone est resté sur un autre fuseau.
 */

export const FUSEAU_PARIS = 'Europe/Paris';

/** Date du jour à Paris, au format ISO `AAAA-MM-JJ`. */
export function jourParis(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU_PARIS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(maintenant);
}

/**
 * Un avantage est actif si la date du jour est dans sa fenêtre de validité.
 * Les bornes absentes signifient « depuis toujours » et « sans fin ».
 */
export function avantageActif(avantage: Avantage, maintenant: Date = new Date()): boolean {
  const aujourdhui = jourParis(maintenant);
  if (avantage.valid_from && aujourdhui < avantage.valid_from) return false;
  if (avantage.valid_until && aujourdhui > avantage.valid_until) return false;
  return true;
}

/** Avantages actifs d'un lieu, dans l'ordre de la base. */
export function avantagesActifs(lieu: LieuDuGuide, maintenant: Date = new Date()): Avantage[] {
  return lieu.avantages.filter((avantage) => avantageActif(avantage, maintenant));
}

/**
 * Nombre d'établissements offrant au moins un avantage actif.
 *
 * C'est le chiffre du bandeau d'accueil : il compte des ÉTABLISSEMENTS, pas des
 * avantages. Deux offres dans le même restaurant ne font pas deux adresses.
 */
export function compterEtablissementsAvecAvantage(
  lieux: LieuDuGuide[],
  maintenant: Date = new Date(),
): number {
  return lieux.filter((lieu) => avantagesActifs(lieu, maintenant).length > 0).length;
}

/** Avantages expirant dans les `jours` prochains : alerte du back-office. */
export function avantagesBientotExpires(
  avantages: Avantage[],
  jours = 30,
  maintenant: Date = new Date(),
): Avantage[] {
  const limite = new Date(maintenant.getTime() + jours * 86_400_000);
  const jourLimite = jourParis(limite);
  const aujourdhui = jourParis(maintenant);

  return avantages.filter(
    (avantage) =>
      avantage.valid_until !== null &&
      avantage.valid_until >= aujourdhui &&
      avantage.valid_until <= jourLimite,
  );
}

/** Titre de l'avantage dans la langue demandée, avec repli sur le français. */
export function titreAvantage(avantage: Avantage, locale: Locale): string {
  return champBilingue(avantage as unknown as Record<string, unknown>, 'title', locale) ?? '';
}
