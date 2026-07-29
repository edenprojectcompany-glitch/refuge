/**
 * Lecture des statistiques agrégées.
 *
 * Ces chiffres sont l'argument de renouvellement de l'abonnement : ils doivent
 * être justes et comparables d'un mois sur l'autre. Toutes les fonctions ici
 * sont pures et testées — une erreur de calcul se verrait en clientèle, pas
 * dans les logs.
 */

export interface JourStats {
  day: string; // AAAA-MM-JJ
  sessions: number;
  outbound_clicks: number;
  perk_opens: number;
  total_events: number;
}

export interface Totaux {
  sessions: number;
  clicsSortants: number;
  avantagesOuverts: number;
}

export function totaliser(jours: JourStats[]): Totaux {
  return jours.reduce<Totaux>(
    (total, jour) => ({
      sessions: total.sessions + jour.sessions,
      clicsSortants: total.clicsSortants + jour.outbound_clicks,
      avantagesOuverts: total.avantagesOuverts + jour.perk_opens,
    }),
    { sessions: 0, clicsSortants: 0, avantagesOuverts: 0 },
  );
}

/**
 * Évolution en pourcentage entre deux périodes.
 *
 * `null` quand la période précédente est à zéro : « +∞ % » ou « +100 % » à
 * partir de rien induirait en erreur un hôtelier qui vient d'installer le QR
 * code.
 */
export function evolution(courant: number, precedent: number): number | null {
  if (precedent === 0) return null;
  return Math.round(((courant - precedent) / precedent) * 100);
}

/**
 * Taux de scan estimé : sessions rapportées au nombre de nuitées vendues.
 *
 * Le taux d'occupation est saisi à la main par l'hôtelier — il le connaît, nous
 * non, et aucune API ne nous le donnera. Le résultat est plafonné à 100 % :
 * au-delà, c'est qu'un client a scanné plusieurs fois, pas que tout le monde a
 * scanné deux fois.
 */
export function tauxDeScan(
  sessions: number,
  chambres: number | null,
  jours: number,
  tauxOccupation: number,
): number | null {
  if (!chambres || chambres <= 0 || jours <= 0) return null;
  if (tauxOccupation <= 0 || tauxOccupation > 1) return null;

  const nuiteesVendues = chambres * jours * tauxOccupation;
  if (nuiteesVendues <= 0) return null;

  return Math.min(100, Math.round((sessions / nuiteesVendues) * 100));
}

/**
 * Complète les jours sans événement.
 *
 * La vue agrégée n'a de ligne que les jours où il s'est passé quelque chose ;
 * un graphe qui saute ces jours-là déforme la tendance.
 */
export function serieComplete(jours: JourStats[], debut: string, fin: string): JourStats[] {
  const connus = new Map(jours.map((jour) => [jour.day, jour]));
  const serie: JourStats[] = [];

  const curseur = new Date(`${debut}T12:00:00Z`);
  const borne = new Date(`${fin}T12:00:00Z`);

  while (curseur <= borne) {
    const jour = curseur.toISOString().slice(0, 10);
    serie.push(
      connus.get(jour) ?? {
        day: jour,
        sessions: 0,
        outbound_clicks: 0,
        perk_opens: 0,
        total_events: 0,
      },
    );
    curseur.setUTCDate(curseur.getUTCDate() + 1);
  }

  return serie;
}

/** Décale une date ISO de `jours` jours. */
export function decalerJour(jour: string, jours: number): string {
  const date = new Date(`${jour}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + jours);
  return date.toISOString().slice(0, 10);
}

export interface Classement {
  id: string;
  libelle: string;
  total: number;
}

/** Classement décroissant, à égalité départagée par ordre alphabétique. */
export function classer(entrees: Classement[], limite = 10): Classement[] {
  return [...entrees]
    .sort((a, b) => b.total - a.total || a.libelle.localeCompare(b.libelle, 'fr'))
    .slice(0, limite);
}
