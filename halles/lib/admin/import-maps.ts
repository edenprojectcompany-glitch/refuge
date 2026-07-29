/**
 * Pré-remplissage d'une fiche depuis une URL Google Maps.
 *
 * On ne parle jamais à l'API Google : on lit ce que l'URL contient déjà. C'est
 * gratuit, sans clé, et sans dépendance à un service dont la tarification peut
 * changer. En contrepartie c'est faillible — d'où un retour explicite sur ce
 * qui a été trouvé et ce qui manque, plutôt qu'un formulaire silencieusement
 * à moitié rempli. L'import CSV reste le repli pour les saisies en masse.
 */

export interface LieuImporte {
  nom: string | null;
  lat: number | null;
  lng: number | null;
  /** Ce qui a manqué, pour le dire à l'écran. */
  manquant: Array<'nom' | 'coordonnees'>;
  /** Renseigné quand l'URL n'est pas exploitable du tout. */
  probleme: 'lien-court' | 'url-invalide' | 'domaine-inconnu' | null;
}

const DOMAINES = [
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.fr',
  'www.google.fr',
  'maps.google.fr',
];

function nettoyerNom(brut: string): string | null {
  const nom = decodeURIComponent(brut.replace(/\+/g, ' ')).trim();
  if (nom === '' || nom.startsWith('@')) return null;
  // Google glisse parfois l'adresse ou des coordonnées dans le segment /place/.
  if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(nom)) return null;
  return nom;
}

function coordonneesValides(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    // 0,0 est presque toujours un artefact de parsing, pas un lieu.
    !(lat === 0 && lng === 0)
  );
}

export function analyserUrlGoogleMaps(entree: string): LieuImporte {
  const vide: LieuImporte = { nom: null, lat: null, lng: null, manquant: ['nom', 'coordonnees'], probleme: null };

  let url: URL;
  try {
    url = new URL(entree.trim());
  } catch {
    return { ...vide, probleme: 'url-invalide' };
  }

  // Les liens raccourcis ne contiennent aucune donnée : il faut les ouvrir
  // d'abord. On le dit plutôt que de renvoyer un formulaire vide.
  if (url.hostname === 'maps.app.goo.gl' || url.hostname === 'goo.gl') {
    return { ...vide, probleme: 'lien-court' };
  }

  if (!DOMAINES.includes(url.hostname)) {
    return { ...vide, probleme: 'domaine-inconnu' };
  }

  const chemin = decodeURIComponent(url.pathname);
  let nom: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  const place = url.pathname.match(/\/place\/([^/@]+)/);
  if (place) nom = nettoyerNom(place[1]);

  /*
   * Trois sources de coordonnées, par ordre de fiabilité décroissante :
   *   !3d…!4d…  position exacte de l'établissement
   *   ?q=lat,lng  point demandé
   *   @lat,lng    centre de la vue, qui peut être décalé du lieu
   */
  const precises = (url.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? []).slice(1);
  const parametre = url.searchParams.get('q') ?? url.searchParams.get('query');
  const surParametre = parametre?.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
  const vue = chemin.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  const paire = precises.length === 2 ? precises : surParametre ? surParametre.slice(1) : vue?.slice(1);

  if (paire) {
    const [a, b] = paire.map(Number);
    if (coordonneesValides(a, b)) {
      lat = a;
      lng = b;
    }
  }

  const manquant: LieuImporte['manquant'] = [];
  if (!nom) manquant.push('nom');
  if (lat === null || lng === null) manquant.push('coordonnees');

  return { nom, lat, lng, manquant, probleme: null };
}
