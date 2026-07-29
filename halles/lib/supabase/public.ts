import { createClient } from '@supabase/supabase-js';
import { envPublic, verifierEnvPublic } from '@/lib/env';

/** Durée de cache des lectures guest, alignée sur le `revalidate` des pages. */
export const REVALIDATION_GUEST = 300;

/**
 * Client de lecture publique, sans session ni cookie.
 *
 * Ne JAMAIS lui ajouter de lecture de cookies : une page qui lit les cookies
 * bascule en rendu dynamique et perd son cache, ce qui coûterait directement le
 * budget LCP des pages guest.
 *
 * Les requêtes passent par un `fetch` balisé : le contenu d'un guide est mis en
 * cache cinq minutes et pourra être invalidé à la publication depuis le
 * back-office (`revalidateTag`), sans attendre l'expiration.
 */
export function creerClientPublic(baliseCache?: string) {
  verifierEnvPublic();

  return createClient(envPublic.supabaseUrl, envPublic.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { 'x-application-name': 'halles-guest' },
      fetch: (entree, options) =>
        fetch(entree as RequestInfo, {
          ...options,
          next: {
            revalidate: REVALIDATION_GUEST,
            tags: baliseCache ? ['guide', baliseCache] : ['guide'],
          },
        } as RequestInit),
    },
  });
}

/** Balise de cache d'un guide, à invalider quand son contenu change. */
export function baliseGuide(slug: string): string {
  return `guide:${slug}`;
}

/**
 * Client d'écriture publique, sans cache.
 *
 * Réservé à l'ingestion des événements : y appliquer le `fetch` balisé du
 * client de lecture n'aurait aucun sens sur une requête POST.
 */
export function creerClientEcriture() {
  verifierEnvPublic();
  return createClient(envPublic.supabaseUrl, envPublic.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'halles-track' } },
  });
}
