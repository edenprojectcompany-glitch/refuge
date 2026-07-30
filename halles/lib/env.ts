/**
 * Lecture centralisée et validée des variables d'environnement.
 *
 * Une variable manquante doit faire échouer le démarrage avec un message clair,
 * pas produire un `undefined` qui se transforme en 401 illisible trois couches
 * plus bas.
 */

function requise(nom: string, valeur: string | undefined): string {
  if (!valeur || valeur.trim() === '') {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. Voir .env.example et le README.`,
    );
  }
  return valeur;
}

/** Variables exposées au navigateur : lues statiquement, jamais dynamiquement. */
export const envPublic = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Domaine racine, sans protocole ni port : `halles.app`, `localhost` en dev. */
  rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost',
  pmtilesUrl: process.env.NEXT_PUBLIC_PMTILES_URL ?? '',
  /*
   * Glyphes des libellés de la carte. Fichiers statiques servis par Protomaps,
   * sans facturation à la vue ; la variable existe pour pouvoir les héberger
   * soi-même sans toucher au code.
   */
  glyphsUrl:
    process.env.NEXT_PUBLIC_GLYPHS_URL ??
    'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
};

/**
 * Mode démonstration : aucune instance Supabase configurée.
 *
 * L'application sert alors le jeu de démonstration embarqué. Permet de montrer
 * le produit et de développer les écrans sans base — et évite qu'un
 * déploiement mal configuré affiche une erreur brute au visiteur.
 *
 * Défini ici, et non dans lib/data/demo.ts : le middleware tourne sur le
 * runtime edge et ne doit pas embarquer le jeu de données pour savoir dans quel
 * mode il est.
 */
export function modeDemo(): boolean {
  return envPublic.supabaseUrl === '' || envPublic.supabaseAnonKey === '';
}

/** Slug servi en mode démonstration. */
export const SLUG_DEMO = 'lemarais';

/**
 * Domaine à écrire dans les URL canoniques, le sitemap et Open Graph.
 *
 * Distinct de `envPublic.rootDomain`, qui sert à découper les sous-domaines et
 * ne doit rien inventer. Ici on cherche seulement une adresse absolue correcte :
 * si le domaine n'est pas encore renseigné, celui du déploiement Vercel vaut
 * infiniment mieux qu'un sitemap en ligne qui annonce `https://localhost`.
 */
export function domaineCanonique(): string {
  const explicite = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (explicite) return explicite;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return vercel;

  return 'localhost';
}

/** URL absolue de la racine publique, protocole compris. */
export function urlCanonique(): string {
  const domaine = domaineCanonique();
  // En développement, le port compte : sans lui, `metadataBase` fabrique des
  // URL absolues qui ne mènent nulle part.
  if (domaine === 'localhost') return 'http://localhost:3000';
  return `https://${domaine}`;
}

export function verifierEnvPublic() {
  requise('NEXT_PUBLIC_SUPABASE_URL', envPublic.supabaseUrl);
  requise('NEXT_PUBLIC_SUPABASE_ANON_KEY', envPublic.supabaseAnonKey);
  return envPublic;
}

/** Clé de service : côté serveur uniquement, elle contourne la RLS. */
export function serviceRoleKey(): string {
  return requise('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function cronSecret(): string {
  return requise('CRON_SECRET', process.env.CRON_SECRET);
}
