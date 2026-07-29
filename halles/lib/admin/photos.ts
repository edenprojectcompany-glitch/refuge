import 'server-only';
import { creerClientAdmin } from '@/lib/supabase/admin';

/**
 * Rapatriement d'une photo depuis le site du commerçant.
 *
 * La source est son site, mais le fichier est recopié une fois dans notre
 * bucket : le lien ne casse plus quand il refait son site, l'image est servie
 * au bon format sur le wifi d'un hôtel, et l'optimiseur d'images de Next n'a
 * qu'un seul domaine à autoriser.
 *
 * À n'utiliser que pour des commerçants déjà partenaires.
 */

const TAILLE_MAX = 3 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface ResultatImport {
  url: string | null;
  erreur: string | null;
}

export async function importerPhoto(source: string, cle: string): Promise<ResultatImport> {
  let cible: URL;
  try {
    cible = new URL(source.trim());
  } catch {
    return { url: null, erreur: 'URL de photo invalide.' };
  }

  // Seul le web public : sans ce filtre, un collage malheureux ferait requêter
  // le réseau interne de l'hébergeur depuis notre serveur.
  if (cible.protocol !== 'https:' && cible.protocol !== 'http:') {
    return { url: null, erreur: 'Seules les adresses http et https sont acceptées.' };
  }
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/.test(cible.hostname)) {
    return { url: null, erreur: 'Adresse interne refusée.' };
  }

  let reponse: Response;
  try {
    reponse = await fetch(cible, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'image/*' },
    });
  } catch {
    return { url: null, erreur: 'Photo injoignable (délai dépassé ou serveur indisponible).' };
  }

  if (!reponse.ok) {
    return { url: null, erreur: `Le serveur du commerçant a répondu ${reponse.status}.` };
  }

  const type = (reponse.headers.get('content-type') ?? '').split(';')[0].trim();
  if (!TYPES.includes(type)) {
    return { url: null, erreur: `Format non accepté (${type || 'inconnu'}).` };
  }

  const donnees = new Uint8Array(await reponse.arrayBuffer());
  if (donnees.byteLength === 0) return { url: null, erreur: 'Fichier vide.' };
  if (donnees.byteLength > TAILLE_MAX) {
    return { url: null, erreur: 'Photo trop lourde (plus de 3 Mo).' };
  }

  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[type]!;
  const chemin = `${cle}.${extension}`;

  const supabase = creerClientAdmin();
  const { error } = await supabase.storage.from('photos').upload(chemin, donnees, {
    contentType: type,
    upsert: true,
  });

  if (error) return { url: null, erreur: `Dépôt impossible : ${error.message}` };

  const { data } = supabase.storage.from('photos').getPublicUrl(chemin);
  return { url: data.publicUrl, erreur: null };
}
