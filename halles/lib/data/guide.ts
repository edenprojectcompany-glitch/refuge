import { cache } from 'react';
import { baliseGuide, creerClientPublic } from '@/lib/supabase/public';
import { hotelDemo, itinerairesDemo, lieuxDemo, modeDemo } from './demo';
import type { Avantage, Hotel, Itineraire, Lieu, LieuDuGuide } from '@/lib/types';

/**
 * Accès aux données du guide.
 *
 * Un seul aller-retour ramène l'hôtel, sa curation, les fiches et les avantages :
 * un guide compte quelques dizaines d'adresses, pas des milliers. Paginer ici
 * coûterait plus de latence que de mémoire.
 *
 * `cache()` déduplique les appels au sein d'un même rendu (layout + page).
 */

export interface Guide {
  hotel: Hotel;
  lieux: LieuDuGuide[];
}

/** Forme retournée par la jointure Supabase avant remise à plat. */
interface LigneCuration {
  position: number;
  is_featured: boolean;
  hotel_note_fr: string | null;
  hotel_note_en: string | null;
  places: (Lieu & { perks: Avantage[] }) | null;
}

export const chargerHotel = cache(async (slug: string): Promise<Hotel | null> => {
  if (modeDemo()) return hotelDemo(slug);

  const supabase = creerClientPublic(baliseGuide(slug));
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // La RLS garantit déjà que seul un hôtel publié remonte.
  if (error || !data) return null;
  return data as Hotel;
});

export const chargerGuide = cache(async (slug: string): Promise<Guide | null> => {
  const hotel = await chargerHotel(slug);
  if (!hotel) return null;

  if (modeDemo()) return { hotel, lieux: lieuxDemo(slug) };

  const supabase = creerClientPublic(baliseGuide(slug));
  const { data, error } = await supabase
    .from('hotel_places')
    .select(
      `position, is_featured, hotel_note_fr, hotel_note_en,
       places!inner (*, perks (*))`,
    )
    .eq('hotel_id', hotel.id)
    .eq('places.status', 'published')
    .order('position', { ascending: true });

  if (error) {
    // Une erreur de lecture ne doit pas faire tomber la page d'accueil : le
    // guide reste consultable, seules les adresses manquent.
    console.error('[guide] lecture de la curation impossible', error.message);
    return { hotel, lieux: [] };
  }

  const lieux = ((data ?? []) as unknown as LigneCuration[])
    .filter((ligne): ligne is LigneCuration & { places: Lieu & { perks: Avantage[] } } =>
      ligne.places !== null,
    )
    .map(({ places, ...curation }) => {
      const { perks, ...lieu } = places;
      return {
        ...lieu,
        position: curation.position,
        is_featured: curation.is_featured,
        hotel_note_fr: curation.hotel_note_fr,
        hotel_note_en: curation.hotel_note_en,
        avantages: perks ?? [],
      } satisfies LieuDuGuide;
    });

  return { hotel, lieux };
});

/**
 * Itinéraires proposés dans un guide : ceux de l'hôtel et ceux ouverts à toute
 * la ville. La RLS filtre déjà les brouillons et les hôtels dépubliés.
 */
export const chargerItineraires = cache(async (slug: string): Promise<Itineraire[]> => {
  const hotel = await chargerHotel(slug);
  if (!hotel) return [];

  if (modeDemo()) return itinerairesDemo(slug);

  const supabase = creerClientPublic(baliseGuide(slug));
  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .eq('city', hotel.city)
    .or(`hotel_id.eq.${hotel.id},hotel_id.is.null`)
    .order('duration_minutes', { ascending: true });

  if (error) {
    console.error('[guide] lecture des itinéraires impossible', error.message);
    return [];
  }
  return (data ?? []) as Itineraire[];
});

/** Un itinéraire précis, à condition qu'il appartienne bien à ce guide. */
export const chargerItineraire = cache(
  async (slug: string, id: string): Promise<Itineraire | null> => {
    const itineraires = await chargerItineraires(slug);
    return itineraires.find((itineraire) => itineraire.id === id) ?? null;
  },
);
