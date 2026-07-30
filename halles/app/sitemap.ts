import type { MetadataRoute } from 'next';
import { urlCanonique } from '@/lib/env';

/**
 * Une seule page à indexer : la vitrine.
 *
 * Les guides d'hôtel en sont volontairement absents, pour la raison exposée
 * dans `robots.ts`. Un sitemap d'une entrée reste utile : il donne la version
 * canonique de l'URL et sa date de dernière modification.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: urlCanonique(),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
