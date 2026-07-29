/**
 * Distances et temps de marche.
 *
 * Aucune API de calcul d'itinéraire : c'est un poste de coût récurrent pour un
 * gain nul à cette échelle. Une distance à vol d'oiseau majorée d'un facteur de
 * détour donne une estimation honnête sur quelques centaines de mètres, ce qui
 * est exactement l'usage (« c'est loin ou pas ? »).
 */

const RAYON_TERRE_M = 6_371_000;

/** Détour moyen constaté d'un trajet piéton urbain par rapport au vol d'oiseau. */
export const FACTEUR_DETOUR = 1.3;

/** Vitesse de marche retenue : 4,5 km/h, soit 75 m/min. */
export const VITESSE_MARCHE_M_PAR_MIN = 75;

export interface Point {
  lat: number;
  lng: number;
}

function radians(degres: number): number {
  return (degres * Math.PI) / 180;
}

/** Distance orthodromique en mètres. */
export function distanceHaversine(a: Point, b: Point): number {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * RAYON_TERRE_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance à pied estimée, en mètres. */
export function distanceAPied(a: Point, b: Point): number {
  return distanceHaversine(a, b) * FACTEUR_DETOUR;
}

/**
 * Temps de marche en minutes, arrondi vers le haut et plancher à 1 :
 * afficher « 0 min à pied » n'aiderait personne.
 */
export function minutesAPied(a: Point, b: Point): number {
  return Math.max(1, Math.round(distanceAPied(a, b) / VITESSE_MARCHE_M_PAR_MIN));
}

/**
 * Distance lisible : en mètres arrondis à 10 m sous le kilomètre, en kilomètres
 * à une décimale au-delà.
 */
export function formaterDistance(metres: number, locale: 'fr' | 'en' = 'fr'): string {
  if (metres < 1000) {
    const arrondi = Math.round(metres / 10) * 10;
    return `${arrondi} m`;
  }
  const km = metres / 1000;
  const texte = km.toFixed(1);
  return locale === 'fr' ? `${texte.replace('.', ',')} km` : `${texte} km`;
}
