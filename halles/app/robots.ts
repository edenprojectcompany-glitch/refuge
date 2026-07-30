import type { MetadataRoute } from 'next';
import { urlCanonique } from '@/lib/env';

/**
 * Ce qui doit être exploré, et ce qui n'a aucune raison de l'être.
 *
 * Les guides `/h/*` et les liens de statistiques `/s/*` ne doivent pas être
 * indexés : les avantages ont été négociés pour les clients d'un hôtel, et les
 * voir remonter sur « apéritif offert Marais » en ferait une promotion ouverte
 * à tous — le commerçant aurait raison de les retirer.
 *
 * Mais on ne les interdit pas ici : une URL interdite d'exploration peut
 * quand même être indexée « à l'aveugle », et surtout le robot ne verra jamais
 * le `noindex` de la page s'il n'a pas le droit de la lire. Le `noindex` est
 * posé dans les métadonnées de `/h/[slug]` et de `/s/[jeton]` ; robots.txt se
 * contente d'écarter ce qui n'a rien à donner à un moteur.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/connexion', '/auth/'],
    },
    sitemap: `${urlCanonique()}/sitemap.xml`,
  };
}
