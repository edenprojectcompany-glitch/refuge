'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { exigerAdmin } from '@/lib/auth';
import { creerClientAdmin } from '@/lib/supabase/admin';
import { baliseGuide } from '@/lib/supabase/public';
import { importerPhoto } from './photos';

/**
 * Écritures du back-office.
 *
 * Toutes passent par le service role, après vérification du rôle admin : la RLS
 * n'ouvre aucune écriture publique, l'autorisation est donc ici et nulle part
 * ailleurs. Chaque action revalide le cache des guides concernés, sans quoi une
 * publication mettrait cinq minutes à se voir.
 */

export interface Retour {
  ok: boolean;
  message?: string;
  /** Renseigné à la création, pour rediriger vers la fiche. */
  id?: string;
}

const STATUTS = ['draft', 'published', 'archived', 'closed'] as const;
const CATEGORIES = [
  'restaurant', 'bar', 'cafe', 'boulangerie', 'brunch',
  'culture', 'shopping', 'balade', 'pratique', 'nuit',
] as const;

/** Chaîne vide d'un formulaire = champ non renseigné, pas chaîne vide en base. */
const texte = z.string().trim().transform((v) => (v === '' ? null : v)).nullable();
const nombre = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), 'Nombre invalide');

function lire(donnees: FormData) {
  return Object.fromEntries(
    [...donnees.entries()].map(([cle, valeur]) => [cle, typeof valeur === 'string' ? valeur : '']),
  );
}

async function revaliderGuides(slugs: string[]) {
  revalidateTag('guide');
  slugs.forEach((slug) => revalidateTag(baliseGuide(slug)));
  revalidatePath('/admin', 'layout');
}

/** Slugs des hôtels dont le guide contient ce lieu. */
async function slugsPourLieu(placeId: string): Promise<string[]> {
  const supabase = creerClientAdmin();
  const { data } = await supabase
    .from('hotel_places')
    .select('hotels(slug)')
    .eq('place_id', placeId);
  return ((data ?? []) as unknown as Array<{ hotels: { slug: string } | null }>)
    .map((ligne) => ligne.hotels?.slug)
    .filter((slug): slug is string => Boolean(slug));
}

// -----------------------------------------------------------------------------
// HÔTELS
// -----------------------------------------------------------------------------
const schemaHotel = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/, 'Slug invalide : minuscules, chiffres et tirets.'),
  name: z.string().trim().min(1, 'Nom obligatoire.'),
  city: z.string().trim().min(1, 'Ville obligatoire.'),
  address: texte,
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  rooms_count: nombre,
  primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur attendue au format #1a2b3c.'),
  default_locale: z.enum(['fr', 'en']),
  status: z.enum(STATUTS),
  plan: z.string().trim().min(1),

  /*
   * Infos pratiques. Le brief les confiait à l'hôtelier via une RPC à liste
   * blanche ; il n'a finalement ni compte ni surface d'édition — il donne le QR
   * code, c'est tout. C'est donc le back-office qui les saisit, à
   * l'installation puis au téléphone quand le mot de passe wifi change.
   * La fonction update_hotel_info() reste en base, inutilisée mais prête si un
   * jour l'hôtelier reprend la main.
   */
  wifi_name: texte,
  wifi_password: texte,
  breakfast_info: texte,
  checkin_info: texte,
  checkout_info: texte,
  transport_info: texte,
  contact_whatsapp: texte,
  contact_phone: texte,
  logo_url: texte,
});

export async function enregistrerHotel(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaHotel.safeParse(lire(donnees));
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? 'Saisie invalide.' };
  }

  const { id, ...champs } = analyse.data;
  const supabase = creerClientAdmin();

  if (id) {
    const { error } = await supabase.from('hotels').update(champs).eq('id', id);
    if (error) return { ok: false, message: messageErreur(error.message) };
    await revaliderGuides([champs.slug]);
    return { ok: true, id };
  }

  const { data, error } = await supabase.from('hotels').insert(champs).select('id').single();
  if (error) return { ok: false, message: messageErreur(error.message) };
  await revaliderGuides([champs.slug]);
  return { ok: true, id: data.id as string };
}

// -----------------------------------------------------------------------------
// LIEUX
// -----------------------------------------------------------------------------
const schemaLieu = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Ville obligatoire.'),
  name: z.string().trim().min(1, 'Nom obligatoire.'),
  category: z.enum(CATEGORIES),
  address: z.string().trim().min(1, 'Adresse obligatoire.'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  price_range: nombre.refine(
    (v) => v === null || (v >= 1 && v <= 4),
    'Gamme de prix entre 1 et 4, ou vide.',
  ),
  short_desc_fr: texte,
  short_desc_en: texte,
  long_desc_fr: texte,
  long_desc_en: texte,
  phone: texte,
  website: texte,
  booking_url: texte,
  instagram: texte,
  status: z.enum(STATUTS),
  verified_at: texte,
  tags: z
    .string()
    .trim()
    .transform((v) => (v === '' ? [] : v.split(',').map((t) => t.trim()).filter(Boolean))),
  opening_hours: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') return null;
      try {
        const valeur = JSON.parse(v);
        if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
          throw new Error('forme');
        }
        return valeur as Record<string, unknown>;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Horaires : JSON invalide.' });
        return null;
      }
    }),
  /** URL de la photo sur le site du commerçant, rapatriée à l'enregistrement. */
  photo_source: texte,
});

export async function enregistrerLieu(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaLieu.safeParse(lire(donnees));
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? 'Saisie invalide.' };
  }

  const { id, photo_source, ...champs } = analyse.data;
  const supabase = creerClientAdmin();

  let identifiant: string;
  if (id) {
    const { error } = await supabase.from('places').update(champs).eq('id', id);
    if (error) return { ok: false, message: messageErreur(error.message) };
    identifiant = id;
  } else {
    const { data, error } = await supabase.from('places').insert(champs).select('id').single();
    if (error) return { ok: false, message: messageErreur(error.message) };
    identifiant = data.id as string;
  }

  // La photo n'est rapatriée qu'après avoir un identifiant : il sert de nom de
  // fichier, ce qui rend l'opération rejouable sans accumuler de doublons.
  let avertissement: string | undefined;
  if (photo_source) {
    const resultat = await importerPhoto(photo_source, `lieux/${identifiant}`);
    if (resultat.url) {
      await supabase.from('places').update({ photo_url: resultat.url }).eq('id', identifiant);
    } else {
      avertissement = `Lieu enregistré, mais la photo n'a pas pu être récupérée : ${resultat.erreur}`;
    }
  }

  await revaliderGuides(await slugsPourLieu(identifiant));
  return { ok: true, id: identifiant, message: avertissement };
}

// -----------------------------------------------------------------------------
// AVANTAGES
// -----------------------------------------------------------------------------
const schemaAvantage = z
  .object({
    id: z.string().uuid().optional().or(z.literal('')),
    place_id: z.string().uuid('Lieu obligatoire.'),
    title_fr: z.string().trim().min(1, 'Libellé français obligatoire.'),
    title_en: texte,
    description_fr: texte,
    description_en: texte,
    conditions_fr: texte,
    conditions_en: texte,
    valid_from: texte,
    valid_until: texte,
    status: z.enum(STATUTS),
  })
  .refine((v) => !v.valid_from || !v.valid_until || v.valid_until >= v.valid_from, {
    message: 'La date de fin précède la date de début.',
    path: ['valid_until'],
  });

export async function enregistrerAvantage(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaAvantage.safeParse(lire(donnees));
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? 'Saisie invalide.' };
  }

  const { id, ...champs } = analyse.data;
  const supabase = creerClientAdmin();

  if (id) {
    const { error } = await supabase.from('perks').update(champs).eq('id', id);
    if (error) return { ok: false, message: messageErreur(error.message) };
    await revaliderGuides(await slugsPourLieu(champs.place_id));
    return { ok: true, id };
  }

  const { data, error } = await supabase.from('perks').insert(champs).select('id').single();
  if (error) return { ok: false, message: messageErreur(error.message) };
  await revaliderGuides(await slugsPourLieu(champs.place_id));
  return { ok: true, id: data.id as string };
}

// -----------------------------------------------------------------------------
// Actions courtes
// -----------------------------------------------------------------------------
const schemaStatut = z.object({
  table: z.enum(['hotels', 'places', 'perks', 'itineraries']),
  id: z.string().uuid(),
  status: z.enum(STATUTS),
});

export async function changerStatut(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaStatut.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const { table, id, status } = analyse.data;
  const supabase = creerClientAdmin();
  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) return { ok: false, message: messageErreur(error.message) };

  await revaliderGuides(table === 'places' ? await slugsPourLieu(id) : []);
  return { ok: true };
}

/** Marque un lieu comme vérifié aujourd'hui : alimente la to-do de maintenance. */
export async function marquerVerifie(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const id = z.string().uuid().safeParse(donnees.get('id'));
  if (!id.success) return { ok: false, message: 'Requête invalide.' };

  const supabase = creerClientAdmin();
  const { error } = await supabase
    .from('places')
    .update({ verified_at: new Date().toISOString().slice(0, 10) })
    .eq('id', id.data);

  if (error) return { ok: false, message: messageErreur(error.message) };
  revalidatePath('/admin/lieux');
  return { ok: true };
}

/** Traduit les erreurs Postgres en phrases utilisables par un humain. */
function messageErreur(brut: string): string {
  if (brut.includes('hotels_slug_key')) return 'Ce slug est déjà pris par un autre hôtel.';
  if (brut.includes('hotels_slug_format')) return 'Slug invalide : minuscules, chiffres et tirets.';
  if (brut.includes('custom_domain')) return 'Ce domaine est déjà attribué.';
  if (brut.includes('primary_color')) return 'Couleur attendue au format #1a2b3c.';
  if (brut.includes('price_range')) return 'Gamme de prix entre 1 et 4.';
  return `Enregistrement refusé par la base : ${brut}`;
}

// -----------------------------------------------------------------------------
// CURATION
// -----------------------------------------------------------------------------
// Quels lieux, dans quel ordre, avec quel mot. C'est ici que se fabrique la
// valeur perçue du guide, et le seul endroit où l'hôtelier n'écrit jamais.

const schemaCuration = z.object({
  hotel_id: z.string().uuid(),
  place_id: z.string().uuid(),
});

async function slugDeLHotel(hotelId: string): Promise<string[]> {
  const supabase = creerClientAdmin();
  const { data } = await supabase.from('hotels').select('slug').eq('id', hotelId).maybeSingle();
  return data?.slug ? [data.slug as string] : [];
}

export async function attacherLieu(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaCuration.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const supabase = creerClientAdmin();
  // Position volontairement haute : le lieu arrive en fin de liste, à l'admin
  // de le remonter s'il compte.
  const { error } = await supabase
    .from('hotel_places')
    .insert({ ...analyse.data, position: 900 });

  if (error) {
    if (error.message.includes('duplicate key')) {
      return { ok: false, message: 'Ce lieu est déjà dans le guide.' };
    }
    return { ok: false, message: messageErreur(error.message) };
  }

  await revaliderGuides(await slugDeLHotel(analyse.data.hotel_id));
  return { ok: true };
}

export async function detacherLieu(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaCuration.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const supabase = creerClientAdmin();
  const { error } = await supabase
    .from('hotel_places')
    .delete()
    .eq('hotel_id', analyse.data.hotel_id)
    .eq('place_id', analyse.data.place_id);

  if (error) return { ok: false, message: messageErreur(error.message) };

  await revaliderGuides(await slugDeLHotel(analyse.data.hotel_id));
  return { ok: true };
}

const schemaOrdre = z.object({
  hotel_id: z.string().uuid(),
  /** Identifiants de lieux dans l'ordre voulu, séparés par des virgules. */
  ordre: z.string().transform((v) => v.split(',').filter(Boolean)),
});

export async function reordonnerCuration(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaOrdre.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const { hotel_id, ordre } = analyse.data;
  if (ordre.some((id) => !z.string().uuid().safeParse(id).success)) {
    return { ok: false, message: 'Requête invalide.' };
  }

  const supabase = creerClientAdmin();

  /*
   * Positions espacées de dix : une insertion manuelle ultérieure peut se
   * glisser entre deux lieux sans avoir à tout renuméroter.
   */
  const resultats = await Promise.all(
    ordre.map((placeId, index) =>
      supabase
        .from('hotel_places')
        .update({ position: (index + 1) * 10 })
        .eq('hotel_id', hotel_id)
        .eq('place_id', placeId),
    ),
  );

  const echec = resultats.find((resultat) => resultat.error);
  if (echec?.error) return { ok: false, message: messageErreur(echec.error.message) };

  await revaliderGuides(await slugDeLHotel(hotel_id));
  return { ok: true };
}

const schemaFeatured = schemaCuration.extend({ is_featured: z.enum(['0', '1']) });

export async function basculerFeatured(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaFeatured.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const { hotel_id, place_id, is_featured } = analyse.data;
  const supabase = creerClientAdmin();

  // L'accueil n'affiche que quatre incontournables : au-delà, on prévient
  // plutôt que de laisser l'admin croire que le cinquième apparaîtra.
  if (is_featured === '1') {
    const { count } = await supabase
      .from('hotel_places')
      .select('place_id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id)
      .eq('is_featured', true);

    if ((count ?? 0) >= 4) {
      return {
        ok: false,
        message: "Quatre incontournables au maximum : l'accueil n'en affiche pas plus.",
      };
    }
  }

  const { error } = await supabase
    .from('hotel_places')
    .update({ is_featured: is_featured === '1' })
    .eq('hotel_id', hotel_id)
    .eq('place_id', place_id);

  if (error) return { ok: false, message: messageErreur(error.message) };

  await revaliderGuides(await slugDeLHotel(hotel_id));
  return { ok: true };
}

const schemaNote = schemaCuration.extend({
  hotel_note_fr: texte,
  hotel_note_en: texte,
});

export async function enregistrerNote(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaNote.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const { hotel_id, place_id, ...notes } = analyse.data;
  const supabase = creerClientAdmin();

  const { error } = await supabase
    .from('hotel_places')
    .update(notes)
    .eq('hotel_id', hotel_id)
    .eq('place_id', place_id);

  if (error) return { ok: false, message: messageErreur(error.message) };

  await revaliderGuides(await slugDeLHotel(hotel_id));
  return { ok: true };
}

const schemaDuplication = z.object({
  source: z.string().uuid(),
  cible: z.string().uuid(),
  avec_notes: z.enum(['0', '1']).default('0'),
});

export async function dupliquerCuration(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const analyse = schemaDuplication.safeParse(lire(donnees));
  if (!analyse.success) return { ok: false, message: 'Requête invalide.' };

  const supabase = creerClientAdmin();
  const { data, error } = await supabase.rpc('dupliquer_curation', {
    p_source: analyse.data.source,
    p_cible: analyse.data.cible,
    p_avec_notes: analyse.data.avec_notes === '1',
  });

  if (error) {
    if (error.message.includes('villes_differentes')) {
      return { ok: false, message: 'Les deux hôtels ne sont pas dans la même ville.' };
    }
    if (error.message.includes('source_et_cible_identiques')) {
      return { ok: false, message: 'Choisissez un autre hôtel que celui-ci.' };
    }
    return { ok: false, message: messageErreur(error.message) };
  }

  const ajoutes = Number(data ?? 0);
  await revaliderGuides(await slugDeLHotel(analyse.data.cible));

  return {
    ok: true,
    message:
      ajoutes === 0
        ? 'Aucun lieu ajouté : ils étaient déjà tous dans ce guide.'
        : `${ajoutes} lieu${ajoutes > 1 ? 'x' : ''} ajouté${ajoutes > 1 ? 's' : ''}. À réordonner, et à commenter.`,
  };
}


/**
 * Régénère le lien de statistiques d'un hôtel.
 *
 * Le lien est la seule clé : un employé qui part avec, un lien collé dans un
 * groupe de messagerie, et n'importe qui voit les chiffres. Régénérer coupe
 * l'ancien immédiatement — au prix de devoir retransmettre le nouveau.
 */
export async function regenererJetonStats(donnees: FormData): Promise<Retour> {
  await exigerAdmin();

  const id = z.string().uuid().safeParse(donnees.get('id'));
  if (!id.success) return { ok: false, message: 'Requête invalide.' };

  const supabase = creerClientAdmin();
  // `upsert` plutôt qu'`update` : un hôtel créé avant la migration, ou par un
  // chemin qui aurait contourné le trigger, n'a pas de ligne à mettre à jour.
  const { data, error } = await supabase
    .from('hotel_stats_tokens')
    .upsert({ hotel_id: id.data, token: crypto.randomUUID() }, { onConflict: 'hotel_id' })
    .select('token')
    .single();

  if (error) return { ok: false, message: messageErreur(error.message) };

  revalidatePath('/admin', 'layout');
  return {
    ok: true,
    message: `Nouveau lien généré. L'ancien ne fonctionne plus : pensez à transmettre le nouveau.`,
    id: data.token as string,
  };
}
