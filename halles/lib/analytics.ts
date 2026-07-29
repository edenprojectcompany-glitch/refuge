'use client';

import type { Locale, SourceScan, TypeEvenement } from '@/lib/types';

/**
 * Mesure d'audience sans donnée personnelle.
 *
 * - identifiant de session en `sessionStorage`, jamais en cookie : il meurt
 *   avec l'onglet et ne permet aucun suivi d'une visite à l'autre ;
 * - aucune IP, aucun user-agent, aucune empreinte ;
 * - envoi en `sendBeacon`, c'est-à-dire sans attendre la réponse : la mesure ne
 *   doit jamais retarder l'ouverture d'un lien vers un restaurant.
 *
 * Voir docs/rgpd.md pour le raisonnement complet sur l'exemption de consentement.
 */

const CLE_SESSION = 'halles.session';
const CLE_SOURCE = 'halles.source';
const CLE_ECRANS = 'halles.ecrans';

export function identifiantSession(): string {
  try {
    const existant = window.sessionStorage.getItem(CLE_SESSION);
    if (existant) return existant;
    const nouveau = crypto.randomUUID();
    window.sessionStorage.setItem(CLE_SESSION, nouveau);
    return nouveau;
  } catch {
    // Stockage refusé : on émet quand même, sans continuité entre les écrans.
    return crypto.randomUUID();
  }
}

/** Vrai la première fois seulement : sert à n'émettre `session_start` qu'une fois. */
function premiereVisiteDeLaSession(): boolean {
  try {
    if (window.sessionStorage.getItem(CLE_SESSION)) return false;
  } catch {
    return true;
  }
  return true;
}

/**
 * Provenance du scan (`?source=chambre`), mémorisée pour la session : le
 * paramètre n'est présent que sur la première URL, alors que l'hôtelier veut
 * savoir quel support fonctionne sur l'ensemble de la visite.
 */
export function memoriserSource(parametre: string | null): SourceScan | null {
  const valides: SourceScan[] = ['chambre', 'reception', 'carte-cle', 'autre'];
  try {
    if (parametre && (valides as string[]).includes(parametre)) {
      window.sessionStorage.setItem(CLE_SOURCE, parametre);
      return parametre as SourceScan;
    }
    const memorise = window.sessionStorage.getItem(CLE_SOURCE);
    return (valides as string[]).includes(memorise ?? '') ? (memorise as SourceScan) : null;
  } catch {
    return null;
  }
}

export interface Evenement {
  hotelId: string;
  type: TypeEvenement;
  locale: Locale;
  placeId?: string | null;
  perkId?: string | null;
  meta?: Record<string, string | number | boolean>;
}

export function suivre(evenement: Evenement): void {
  if (typeof window === 'undefined') return;

  const corps = JSON.stringify({
    hotel_id: evenement.hotelId,
    session_id: identifiantSession(),
    type: evenement.type,
    place_id: evenement.placeId ?? null,
    perk_id: evenement.perkId ?? null,
    source: memoriserSource(null),
    locale: evenement.locale,
    meta: evenement.meta ?? {},
  });

  try {
    const paquet = new Blob([corps], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/track', paquet)) return;
  } catch {
    // sendBeacon indisponible : on retombe sur fetch, toujours sans attendre.
  }

  void fetch('/api/track', {
    method: 'POST',
    body: corps,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {});
}

/** Ouvre la session au premier écran vu, puis suit chaque écran. */
export function suivreEcran(evenement: Omit<Evenement, 'type'>): void {
  if (typeof window === 'undefined') return;

  if (premiereVisiteDeLaSession()) {
    memoriserSource(new URLSearchParams(window.location.search).get('source'));
    identifiantSession();
    suivre({ ...evenement, type: 'session_start' });
  }
  suivre({ ...evenement, type: 'page_view' });
}

/** Nombre d'écrans vus dans la session : sert au moment du prompt d'installation. */
export function compterEcran(): number {
  try {
    const total = Number(window.sessionStorage.getItem(CLE_ECRANS) ?? '0') + 1;
    window.sessionStorage.setItem(CLE_ECRANS, String(total));
    return total;
  } catch {
    return 1;
  }
}
