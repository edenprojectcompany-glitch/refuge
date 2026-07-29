import fr from './fr.json';
import en from './en.json';
import type { Locale } from '@/lib/types';

/**
 * i18n minimale : deux dictionnaires JSON, une fonction de traduction.
 *
 * Pas de librairie : le besoin est un lookup par clé pointée et une
 * interpolation. Le FR fait référence — toute clé manquante en EN retombe
 * dessus plutôt que d'afficher la clé brute au voyageur.
 */

export const LOCALES: readonly Locale[] = ['fr', 'en'] as const;
export const LOCALE_PAR_DEFAUT: Locale = 'fr';

const dictionnaires: Record<Locale, unknown> = { fr, en };

export function estLocale(valeur: unknown): valeur is Locale {
  return typeof valeur === 'string' && (LOCALES as readonly string[]).includes(valeur);
}

/**
 * Résout la langue à servir : le paramètre d'URL prime, sinon la langue par
 * défaut de l'hôtel, sinon le français.
 */
export function resoudreLocale(
  parametre: string | string[] | undefined,
  localeHotel: Locale | undefined = LOCALE_PAR_DEFAUT,
): Locale {
  const valeur = Array.isArray(parametre) ? parametre[0] : parametre;
  if (estLocale(valeur)) return valeur;
  if (estLocale(localeHotel)) return localeHotel;
  return LOCALE_PAR_DEFAUT;
}

function lire(source: unknown, chemin: string): string | undefined {
  const valeur = chemin.split('.').reduce<unknown>((courant, segment) => {
    if (courant && typeof courant === 'object' && segment in courant) {
      return (courant as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
  return typeof valeur === 'string' ? valeur : undefined;
}

export type Traducteur = (cle: string, variables?: Record<string, string | number>) => string;

/**
 * Fabrique le traducteur d'une langue.
 *
 * Les variables s'écrivent `{n}` dans le dictionnaire. Une clé introuvable est
 * renvoyée telle quelle : visible en développement, inoffensive en production.
 */
export function creerTraducteur(locale: Locale): Traducteur {
  return (cle, variables) => {
    const modele =
      lire(dictionnaires[locale], cle) ?? lire(dictionnaires[LOCALE_PAR_DEFAUT], cle) ?? cle;

    if (!variables) return modele;

    return Object.entries(variables).reduce(
      (texte, [nom, valeur]) => texte.split(`{${nom}}`).join(String(valeur)),
      modele,
    );
  };
}

/**
 * Pluriel : le français et l'anglais partagent la même règle simple (1 / autre).
 * Les clés suivent la convention `racine_un` / `racine_autre`.
 */
export function cleAvecPluriel(racine: string, nombre: number): string {
  return `${racine}_${nombre === 1 ? 'un' : 'autre'}`;
}

/**
 * Choisit le champ bilingue d'un contenu, avec repli sur le français.
 * Un `short_desc_en` vide ne doit jamais produire un trou dans la page.
 */
export function champBilingue<T extends Record<string, unknown>>(
  contenu: T,
  racine: string,
  locale: Locale,
): string | null {
  const valeurLocale = contenu[`${racine}_${locale}`];
  if (typeof valeurLocale === 'string' && valeurLocale.trim() !== '') return valeurLocale;

  const valeurFr = contenu[`${racine}_fr`];
  if (typeof valeurFr === 'string' && valeurFr.trim() !== '') return valeurFr;

  return null;
}

/** Ajoute `?lang=` à un lien interne, sauf quand la langue est celle par défaut. */
export function avecLangue(href: string, locale: Locale): string {
  if (locale === LOCALE_PAR_DEFAUT) return href;
  const separateur = href.includes('?') ? '&' : '?';
  return `${href}${separateur}lang=${locale}`;
}
