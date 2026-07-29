import { envPublic } from '@/lib/env';

/**
 * Résolution du tenant à partir de l'hôte de la requête.
 *
 * Trois surfaces cohabitent sur le même déploiement :
 *   lemarais.halles.app  → le guide de l'hôtel « lemarais »
 *   halles.app/admin     → le back-office
 *   halles.app           → le site vitrine
 */

export type Surface =
  | { type: 'guide'; slug: string }
  | { type: 'racine' };

/** Un slug valide côté application doit l'être aussi côté base (contrainte SQL). */
const FORMAT_SLUG = /^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/;

/** Sous-domaines techniques qui ne désignent jamais un hôtel. */
const SOUS_DOMAINES_RESERVES = new Set(['www', 'admin', 'api', 'app', 'static', 'cdn']);

export function slugValide(slug: string): boolean {
  return FORMAT_SLUG.test(slug);
}

/**
 * Extrait le slug du tenant depuis un en-tête Host.
 *
 * Tolère le port, la casse, et les domaines de prévisualisation Vercel
 * (`*.vercel.app`), qui ne portent jamais de sous-domaine de tenant.
 */
export function analyserHote(hote: string | null, domaineRacine = envPublic.rootDomain): Surface {
  if (!hote) return { type: 'racine' };

  const nu = hote.toLowerCase().split(':')[0].trim();
  const racine = domaineRacine.toLowerCase().split(':')[0].trim();

  if (nu === '' || nu === racine) return { type: 'racine' };

  // Déploiements de prévisualisation : halles-git-xxx.vercel.app. Pas de tenant.
  if (nu.endsWith('.vercel.app')) return { type: 'racine' };

  if (!nu.endsWith(`.${racine}`)) return { type: 'racine' };

  const prefixe = nu.slice(0, -(racine.length + 1));

  // Un seul niveau de sous-domaine : « a.b.halles.app » n'est pas un tenant.
  if (prefixe.includes('.')) return { type: 'racine' };
  if (SOUS_DOMAINES_RESERVES.has(prefixe)) return { type: 'racine' };
  if (!slugValide(prefixe)) return { type: 'racine' };

  return { type: 'guide', slug: prefixe };
}

/**
 * Cache mémoire de l'existence des slugs.
 *
 * Le middleware s'exécute à chaque requête : sans cache, chaque chargement de
 * page paierait un aller-retour réseau avant même de commencer à rendre.
 * 60 secondes : un hôtel publié est visible en moins d'une minute, un hôtel
 * dépublié disparaît aussi vite.
 */
const DUREE_CACHE_MS = 60_000;
const cacheSlugs = new Map<string, { existe: boolean; expiration: number }>();

export function viderCacheSlugs() {
  cacheSlugs.clear();
}

export async function slugExiste(slug: string): Promise<boolean> {
  if (!slugValide(slug)) return false;

  const maintenant = Date.now();
  const enCache = cacheSlugs.get(slug);
  if (enCache && enCache.expiration > maintenant) return enCache.existe;

  let existe = false;
  try {
    // Appel REST direct plutôt que supabase-js : le middleware tourne sur le
    // runtime edge, où l'on veut le minimum de code embarqué.
    const url = new URL(`${envPublic.supabaseUrl}/rest/v1/hotels`);
    url.searchParams.set('select', 'slug');
    url.searchParams.set('slug', `eq.${slug}`);
    url.searchParams.set('status', 'eq.published');
    url.searchParams.set('limit', '1');

    const reponse = await fetch(url, {
      headers: {
        apikey: envPublic.supabaseAnonKey,
        Authorization: `Bearer ${envPublic.supabaseAnonKey}`,
        Accept: 'application/json',
      },
      // Le cache applicatif ci-dessous suffit ; celui de fetch ferait doublon.
      cache: 'no-store',
    });

    if (reponse.ok) {
      const lignes = (await reponse.json()) as unknown[];
      existe = Array.isArray(lignes) && lignes.length > 0;
    } else {
      // Supabase indisponible : on ne met pas en cache un faux négatif, sinon
      // une panne d'une seconde couperait tous les guides pendant une minute.
      return false;
    }
  } catch {
    return false;
  }

  cacheSlugs.set(slug, { existe, expiration: maintenant + DUREE_CACHE_MS });
  return existe;
}
