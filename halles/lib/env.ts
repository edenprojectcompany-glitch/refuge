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
