import type { Creneau, HorairesSemaine, JourSemaine, Locale } from '@/lib/types';
import { FUSEAU_PARIS } from '@/lib/perks';

/**
 * État d'ouverture d'un lieu.
 *
 * Le calcul se fait toujours en heure de Paris, jamais dans le fuseau du
 * téléphone : un voyageur qui arrive de New York a son appareil à l'heure locale
 * pendant les premières minutes, et « fermé » affiché à tort ferait rater une
 * table.
 *
 * Les créneaux qui franchissent minuit sont notés `["20:00","01:00"]` : la
 * seconde borne appartient au lendemain. Un bar ouvert jusqu'à 2 h doit
 * s'afficher ouvert à 0 h 30, sans quoi la moitié des adresses de la catégorie
 * « Sorties » paraîtraient fermées au moment précis où l'on s'y rend.
 */

export const JOURS: JourSemaine[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface EtatOuverture {
  /** `null` quand les horaires sont inconnus : on n'affiche alors rien. */
  ouvert: boolean | null;
  /** Heure de fermeture (si ouvert) ou d'ouverture (si fermé), format `HH:MM`. */
  prochainHoraire: string | null;
  /** Vrai quand la réouverture n'est pas aujourd'hui. */
  reouvrePlusTard: boolean;
}

/** Minutes depuis minuit pour un `HH:MM`. */
export function enMinutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.NaN;
  return h * 60 + m;
}

/** Position dans la semaine parisienne : jour et minutes depuis minuit. */
export function instantParis(maintenant: Date = new Date()): {
  jour: JourSemaine;
  minutes: number;
} {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_PARIS,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(maintenant);

  const lire = (type: string) => parties.find((p) => p.type === type)?.value ?? '';
  const abreviations: Record<string, JourSemaine> = {
    Sun: 'sun',
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat',
  };

  // À minuit pile, Intl renvoie « 24 » sur certaines plateformes.
  const heures = Number(lire('hour')) % 24;

  return {
    jour: abreviations[lire('weekday')] ?? 'mon',
    minutes: heures * 60 + Number(lire('minute')),
  };
}

function jourPrecedent(jour: JourSemaine): JourSemaine {
  return JOURS[(JOURS.indexOf(jour) + 6) % 7];
}

function jourSuivant(jour: JourSemaine): JourSemaine {
  return JOURS[(JOURS.indexOf(jour) + 1) % 7];
}

function creneauxDu(horaires: HorairesSemaine, jour: JourSemaine): Creneau[] | undefined {
  const valeur = horaires[jour];
  return Array.isArray(valeur) ? valeur : undefined;
}

export function etatOuverture(
  horaires: HorairesSemaine | null | undefined,
  maintenant: Date = new Date(),
): EtatOuverture {
  const inconnu: EtatOuverture = { ouvert: null, prochainHoraire: null, reouvrePlusTard: false };
  if (!horaires || Object.keys(horaires).length === 0) return inconnu;

  const { jour, minutes } = instantParis(maintenant);
  const aujourdhui = creneauxDu(horaires, jour);
  const hier = creneauxDu(horaires, jourPrecedent(jour));

  // Un créneau d'hier qui franchit minuit peut couvrir l'instant présent.
  for (const [debut, fin] of hier ?? []) {
    if (enMinutes(fin) < enMinutes(debut) && minutes < enMinutes(fin)) {
      return { ouvert: true, prochainHoraire: fin, reouvrePlusTard: false };
    }
  }

  for (const [debut, fin] of aujourdhui ?? []) {
    const d = enMinutes(debut);
    const f = enMinutes(fin);
    const franchitMinuit = f < d;
    if (minutes >= d && (franchitMinuit || minutes < f)) {
      return { ouvert: true, prochainHoraire: fin, reouvrePlusTard: false };
    }
  }

  // Fermé : on cherche la prochaine ouverture, aujourd'hui puis dans la semaine.
  const prochainAujourdhui = (aujourdhui ?? [])
    .map(([debut]) => debut)
    .filter((debut) => enMinutes(debut) > minutes)
    .sort()[0];

  if (prochainAujourdhui) {
    return { ouvert: false, prochainHoraire: prochainAujourdhui, reouvrePlusTard: false };
  }

  let candidat = jourSuivant(jour);
  for (let i = 0; i < 7; i += 1) {
    const creneaux = creneauxDu(horaires, candidat);
    if (creneaux && creneaux.length > 0) {
      return { ouvert: false, prochainHoraire: creneaux[0][0], reouvrePlusTard: true };
    }
    candidat = jourSuivant(candidat);
  }

  // Aucun créneau de la semaine : la fiche a des horaires vides partout.
  return { ouvert: false, prochainHoraire: null, reouvrePlusTard: false };
}

/** Horaires de la semaine mis en forme pour l'affichage, à partir de lundi. */
export function semaineLisible(
  horaires: HorairesSemaine | null | undefined,
  locale: Locale,
): Array<{ jour: JourSemaine; libelle: string; creneaux: string | null }> {
  if (!horaires) return [];

  const nomsJours: Record<Locale, Record<JourSemaine, string>> = {
    fr: {
      mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi',
      fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche',
    },
    en: {
      mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
      fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
    },
  };

  const ordre: JourSemaine[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const separateur = locale === 'fr' ? ' à ' : '–';

  return ordre.map((jour) => {
    const creneaux = creneauxDu(horaires, jour);
    return {
      jour,
      libelle: nomsJours[locale][jour],
      creneaux:
        creneaux === undefined
          ? null
          : creneaux.length === 0
            ? ''
            : creneaux.map(([d, f]) => `${d}${separateur}${f}`).join(', '),
    };
  });
}
