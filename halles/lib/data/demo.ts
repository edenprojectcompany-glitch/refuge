import donnees from './demo.json';
import type { Hotel, Itineraire, LieuDuGuide } from '@/lib/types';

export { modeDemo } from '@/lib/env';

/**
 * Jeu de démonstration embarqué.
 *
 * Sert de source de données quand Supabase n'est pas configuré : l'application
 * reste entièrement navigable sans base, ce qui permet de la montrer avant
 * d'avoir un projet Supabase, et de développer les écrans sans dépendre du
 * réseau.
 *
 * `demo.json` est un artefact régénéré depuis supabase/seed.sql par
 * `scripts/generer-demo.sh` : ne pas l'éditer à la main, la source de vérité
 * reste le seed.
 */

interface JeuDemo {
  hotel: Hotel;
  lieux: LieuDuGuide[];
  itineraires: Itineraire[];
}

const jeu = donnees as unknown as JeuDemo;

export function slugDemo(): string {
  return jeu.hotel.slug;
}

export function hotelDemo(slug: string): Hotel | null {
  return slug === jeu.hotel.slug ? jeu.hotel : null;
}

export function lieuxDemo(slug: string): LieuDuGuide[] {
  return slug === jeu.hotel.slug ? jeu.lieux : [];
}

export function itinerairesDemo(slug: string): Itineraire[] {
  return slug === jeu.hotel.slug ? jeu.itineraires : [];
}
