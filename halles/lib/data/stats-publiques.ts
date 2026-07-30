import { creerClientPublic } from '@/lib/supabase/public';
import { modeDemo } from '@/lib/env';
import { decalerJour, serieComplete, totaliser, type JourStats } from '@/lib/stats';
import { hotelDemo } from './demo';

/**
 * Statistiques d'un hôtel, ouvertes par un jeton secret.
 *
 * Aucune authentification : l'hôtelier n'a pas de compte, c'est le lien qui
 * fait office de clé. Les fonctions SQL appelées ici ne renvoient que des
 * agrégats d'un seul hôtel — jamais un événement, jamais une session, jamais
 * les chiffres d'un autre.
 */

export interface StatsHotel {
  nom: string;
  ville: string;
  couleur: string;
  chambres: number | null;
  /** Trente jours, trous comblés. */
  serie: JourStats[];
  /** Les trente jours précédents, pour la comparaison. */
  precedents: JourStats[];
  lieux: Array<{ libelle: string; total: number }>;
  avantages: Array<{ libelle: string; total: number }>;
  /** Vrai quand la base n'est pas branchée : chiffres à zéro assumés. */
  demonstration: boolean;
}

const FENETRE = 30;

export async function chargerStatsParJeton(jeton: string): Promise<StatsHotel | null> {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const debut = decalerJour(aujourdhui, -(FENETRE - 1));

  // Sans base, on montre la page avec l'hôtel de démonstration et des compteurs
  // à zéro plutôt qu'une erreur : la mise en page reste vérifiable.
  if (modeDemo()) {
    const hotel = hotelDemo('lemarais');
    if (!hotel) return null;
    return {
      nom: hotel.name,
      ville: hotel.city,
      couleur: hotel.primary_color,
      chambres: hotel.rooms_count,
      serie: serieComplete([], debut, aujourdhui),
      precedents: [],
      lieux: [],
      avantages: [],
      demonstration: true,
    };
  }

  const supabase = creerClientPublic();

  const [brut, classements] = await Promise.all([
    supabase.rpc('stats_par_jeton', { p_jeton: jeton, p_jours: FENETRE * 2 }),
    supabase.rpc('classements_par_jeton', { p_jeton: jeton, p_jours: FENETRE, p_limite: 10 }),
  ]);

  if (brut.error || !brut.data || brut.data.length === 0) return null;

  const lignes = brut.data as Array<{
    hotel_nom: string;
    hotel_ville: string;
    hotel_couleur: string;
    chambres: number | null;
    day: string | null;
    sessions: number | null;
    outbound_clicks: number | null;
    perk_opens: number | null;
  }>;

  const entete = lignes[0];
  const jours: JourStats[] = lignes
    .filter((ligne) => ligne.day !== null)
    .map((ligne) => ({
      day: ligne.day as string,
      sessions: Number(ligne.sessions ?? 0),
      outbound_clicks: Number(ligne.outbound_clicks ?? 0),
      perk_opens: Number(ligne.perk_opens ?? 0),
      total_events: 0,
    }));

  const debutPrecedent = decalerJour(debut, -FENETRE);
  const finPrecedent = decalerJour(debut, -1);

  const rangs = (classements.data ?? []) as Array<{
    genre: string;
    libelle: string;
    total: number;
  }>;

  return {
    nom: entete.hotel_nom,
    ville: entete.hotel_ville,
    couleur: entete.hotel_couleur,
    chambres: entete.chambres,
    serie: serieComplete(
      jours.filter((jour) => jour.day >= debut),
      debut,
      aujourdhui,
    ),
    precedents: jours.filter((jour) => jour.day >= debutPrecedent && jour.day <= finPrecedent),
    lieux: rangs.filter((r) => r.genre === 'lieu').map(({ libelle, total }) => ({ libelle, total: Number(total) })),
    avantages: rangs
      .filter((r) => r.genre === 'avantage')
      .map(({ libelle, total }) => ({ libelle, total: Number(total) })),
    demonstration: false,
  };
}

/** Totaux de la période et de la précédente, prêts à comparer. */
export function totauxComparés(stats: StatsHotel) {
  return {
    courant: totaliser(stats.serie),
    precedent: totaliser(stats.precedents),
  };
}
