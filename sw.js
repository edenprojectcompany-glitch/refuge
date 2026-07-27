/* Refuge — service worker.
   But : l'app doit rester ouvrable sans réseau. Quelqu'un qui a besoin d'une
   parole à 3 h du matin dans le métro ne doit pas tomber sur un écran d'erreur. */

const CACHE = "refuge-v1";
const COQUILLE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(COQUILLE))
      .then(() => self.skipWaiting())
      .catch(() => {})            // une ressource manquante ne doit pas bloquer l'installation
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navigation : le réseau d'abord (pour récupérer les mises à jour),
  // la copie en cache si le réseau manque.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => {
          const copie = r.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copie)).catch(() => {});
          return r;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Le reste (icônes, polices Google) : cache d'abord, réseau ensuite.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r && r.status === 200 && (r.type === "basic" || r.type === "cors")) {
          const copie = r.clone();
          caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {});
        }
        return r;
      });
      // pas de repli ici : si la ressource n'est ni en cache ni en ligne,
      // l'échec doit remonter au navigateur (les polices ont déjà un repli CSS)
    })
  );
});
