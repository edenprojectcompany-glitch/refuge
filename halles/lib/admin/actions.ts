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
