/*
 * Service worker du guide.
 *
 * Deux stratégies, pas une de plus :
 *   - les fichiers versionnés de Next (/_next/static) ne changent jamais à URL
 *     constante : cache d'abord, réseau jamais ;
 *   - les pages : on sert le cache immédiatement et on rafraîchit derrière, pour
 *     qu'un écran déjà vu reste lisible dans un restaurant sans réseau.
 *
 * Pas de mode hors ligne complet en v1 : rien n'est pré-chargé, seul ce que le
 * voyageur a réellement ouvert est conservé.
 */
const CACHE_STATIQUE = 'halles-statique-v1';
const CACHE_PAGES = 'halles-pages-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(
        cles
          .filter((cle) => cle !== CACHE_STATIQUE && cle !== CACHE_PAGES)
          .map((cle) => caches.delete(cle)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  // La mesure d'audience ne doit jamais être servie depuis un cache.
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    evenement.respondWith(
      caches.open(CACHE_STATIQUE).then(async (cache) => {
        const enCache = await cache.match(requete);
        if (enCache) return enCache;
        const reponse = await fetch(requete);
        if (reponse.ok) cache.put(requete, reponse.clone());
        return reponse;
      }),
    );
    return;
  }

  if (requete.mode === 'navigate') {
    evenement.respondWith(
      caches.open(CACHE_PAGES).then(async (cache) => {
        const enCache = await cache.match(requete);
        const reseau = fetch(requete)
          .then((reponse) => {
            if (reponse.ok) cache.put(requete, reponse.clone());
            return reponse;
          })
          .catch(() => enCache);
        return enCache || reseau;
      }),
    );
  }
});
