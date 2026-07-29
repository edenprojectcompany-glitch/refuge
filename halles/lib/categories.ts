import {
  Croissant,
  Coffee,
  EggFried,
  Footprints,
  Landmark,
  LifeBuoy,
  Moon,
  ShoppingBag,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import type { CategorieLieu } from '@/lib/types';

/**
 * Identité visuelle des catégories, partagée par la grille d'accueil, les
 * pastilles de la carte et les filtres. Une seule source pour que la couleur
 * d'un marqueur soit celle de sa puce de filtre.
 *
 * Toutes ces teintes sont assez sombres pour porter du texte blanc et pour
 * contraster avec le fond crème de la carte.
 */
export const COULEURS_CATEGORIES: Record<CategorieLieu, string> = {
  restaurant: '#a2472f',
  bar: '#6d4370',
  cafe: '#7d5a33',
  boulangerie: '#b07d20',
  brunch: '#4f7a4a',
  culture: '#2f5d8a',
  shopping: '#96547a',
  balade: '#3f7a6b',
  pratique: '#5c6670',
  nuit: '#3b4a86',
};

export const ICONES_CATEGORIES: Record<CategorieLieu, typeof Coffee> = {
  restaurant: UtensilsCrossed,
  bar: Wine,
  cafe: Coffee,
  boulangerie: Croissant,
  brunch: EggFried,
  culture: Landmark,
  shopping: ShoppingBag,
  balade: Footprints,
  pratique: LifeBuoy,
  nuit: Moon,
};

/** Ordre d'affichage : ce qu'on cherche en premier en arrivant à l'hôtel. */
export const ORDRE_CATEGORIES: CategorieLieu[] = [
  'restaurant',
  'bar',
  'cafe',
  'boulangerie',
  'brunch',
  'culture',
  'shopping',
  'balade',
  'nuit',
  'pratique',
];

export function estCategorie(valeur: unknown): valeur is CategorieLieu {
  return typeof valeur === 'string' && valeur in COULEURS_CATEGORIES;
}

/** Gamme de prix en euros : 2 → « €€ ». */
export function gammePrix(niveau: number | null): string | null {
  if (!niveau || niveau < 1 || niveau > 4) return null;
  return '€'.repeat(niveau);
}
