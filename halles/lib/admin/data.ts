import 'server-only';
import { creerClientAdmin } from '@/lib/supabase/admin';
import type { Avantage, CategorieLieu, Hotel, Lieu, StatutContenu } from '@/lib/types';
import type { JourStats } from '@/lib/stats';

/**
 * Lectures du back-office, par le service role.
 *
 * L'admin voit tout, brouillons compris : la RLS le laisserait passer pour les
 * lectures publiques mais masquerait précisément ce qu'il vient corriger.
 */

export async function listerHotels(): Promise<Hotel[]> {
  const supabase = creerClientAdmin();
  const { data } = await supabase.from('hotels').select('*').order('name');
  return (data ?? []) as Hotel[];
}

export async function chargerHotelAdmin(id: string): Promise<Hotel | null> {
  const supabase = creerClientAdmin();
  const { data } = await supabase.from('hotels').select('*').eq('id', id).maybeSingle();
  return (data as Hotel) ?? null;
}

/**
 * Le jeton du lien de statistiques, lu à part.
 *
 * Il n'est pas dans `hotels` — cette table est lisible par le rôle anonyme, un
 * `select` suffirait à moissonner tous les jetons. Il vit dans une table sans
 * grant public, d'où cette seconde requête.
 */
export async function chargerJetonStats(hotelId: string): Promise<string | null> {
  const supabase = creerClientAdmin();
  const { data } = await supabase
    .from('hotel_stats_tokens')
    .select('token')
    .eq('hotel_id', hotelId)
    .maybeSingle();
  return (data?.token as string) ?? null;
}

export interface FiltresLieux {
  ville?: string;
  categorie?: CategorieLieu;
  statut?: StatutContenu;
  recherche?: string;
  /** Lieux non vérifiés depuis plus de six mois : la to-do de maintenance. */
  aVerifier?: boolean;
}

export interface LieuAdmin extends Lieu {
  /** Nombre d'hôtels qui proposent ce lieu, pour mesurer sa réutilisation. */
  guides: number;
  avantages: number;
}

export async function listerLieux(filtres: FiltresLieux = {}): Promise<LieuAdmin[]> {
  const supabase = creerClientAdmin();

  let requete = supabase
    .from('places')
    .select('*, hotel_places(hotel_id), perks(id)')
    .order('name');

  if (filtres.ville) requete = requete.eq('city', filtres.ville);
  if (filtres.categorie) requete = requete.eq('category', filtres.categorie);
  if (filtres.statut) requete = requete.eq('status', filtres.statut);
  if (filtres.recherche) {
    // `or` accepte une liste de conditions PostgREST ; les virgules du terme
    // recherché doivent disparaître sous peine de casser la syntaxe.
    const terme = filtres.recherche.replace(/[,()]/g, ' ').trim();
    if (terme) requete = requete.or(`name.ilike.%${terme}%,address.ilike.%${terme}%`);
  }
  if (filtres.aVerifier) {
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 6);
    const jour = limite.toISOString().slice(0, 10);
    requete = requete.or(`verified_at.is.null,verified_at.lt.${jour}`);
  }

  const { data, error } = await requete;
  if (error) {
    console.error('[admin] lecture des lieux impossible', error.message);
    return [];
  }

  return ((data ?? []) as unknown as Array<
    Lieu & { hotel_places: unknown[] | null; perks: unknown[] | null }
  >).map(({ hotel_places, perks, ...lieu }) => ({
    ...lieu,
    guides: hotel_places?.length ?? 0,
    avantages: perks?.length ?? 0,
  }));
}

export async function chargerLieuAdmin(id: string): Promise<Lieu | null> {
  const supabase = creerClientAdmin();
  const { data } = await supabase.from('places').select('*').eq('id', id).maybeSingle();
  return (data as Lieu) ?? null;
}

export interface AvantageAdmin extends Avantage {
  lieu: { id: string; name: string; city: string } | null;
}

export async function listerAvantages(): Promise<AvantageAdmin[]> {
  const supabase = creerClientAdmin();
  const { data, error } = await supabase
    .from('perks')
    .select('*, places(id, name, city)')
    .order('valid_until', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[admin] lecture des avantages impossible', error.message);
    return [];
  }

  return ((data ?? []) as unknown as Array<
    Avantage & { places: { id: string; name: string; city: string } | null }
  >).map(({ places, ...avantage }) => ({ ...avantage, lieu: places }));
}

export async function chargerAvantageAdmin(id: string): Promise<Avantage | null> {
  const supabase = creerClientAdmin();
  const { data } = await supabase.from('perks').select('*').eq('id', id).maybeSingle();
  return (data as Avantage) ?? null;
}

/** Villes présentes en base : alimente les filtres sans les coder en dur. */
export async function listerVilles(): Promise<string[]> {
  const supabase = creerClientAdmin();
  const { data } = await supabase.from('places').select('city');
  const villes = new Set((data ?? []).map((ligne) => ligne.city as string));
  return [...villes].sort((a, b) => a.localeCompare(b, 'fr'));
}

export interface StatsGlobales {
  hotelsPublies: number;
  hotelsBrouillon: number;
  lieuxPublies: number;
  avantagesActifs: number;
  /** Agrégats des trente derniers jours, tous hôtels confondus. */
  jours: JourStats[];
  /** Vue matérialisée absente ou jamais rafraîchie. */
  agregationIndisponible: boolean;
}

export async function chargerStatsGlobales(): Promise<StatsGlobales> {
  const supabase = creerClientAdmin();

  const [hotels, lieux, avantages] = await Promise.all([
    supabase.from('hotels').select('status'),
    supabase.from('places').select('status'),
    supabase.from('perks').select('status, valid_until'),
  ]);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const statutsHotels = (hotels.data ?? []).map((l) => l.status as StatutContenu);

  // La vue vit dans le schéma privé `analytics`, que PostgREST n'expose pas :
  // on passe par une fonction dédiée, et on tolère son absence (base pas encore
  // migrée, ou cron jamais passé).
  const { data: agregats, error: erreurAgregats } = await supabase.rpc('stats_globales', {
    p_jours: 30,
  });

  return {
    hotelsPublies: statutsHotels.filter((s) => s === 'published').length,
    hotelsBrouillon: statutsHotels.filter((s) => s === 'draft').length,
    lieuxPublies: (lieux.data ?? []).filter((l) => l.status === 'published').length,
    avantagesActifs: (avantages.data ?? []).filter(
      (a) => a.status === 'published' && (!a.valid_until || (a.valid_until as string) >= aujourdhui),
    ).length,
    jours: (agregats ?? []) as JourStats[],
    agregationIndisponible: Boolean(erreurAgregats),
  };
}

export interface CurationAdmin {
  place_id: string;
  nom: string;
  categorie: string;
  position: number;
  is_featured: boolean;
  hotel_note_fr: string | null;
  hotel_note_en: string | null;
}

/** Curation d'un hôtel, dans l'ordre du guide. */
export async function chargerCuration(hotelId: string): Promise<CurationAdmin[]> {
  const supabase = creerClientAdmin();
  const { data, error } = await supabase
    .from('hotel_places')
    .select('place_id, position, is_featured, hotel_note_fr, hotel_note_en, places(name, category)')
    .eq('hotel_id', hotelId)
    .order('position');

  if (error) {
    console.error('[admin] lecture de la curation impossible', error.message);
    return [];
  }

  return ((data ?? []) as unknown as Array<{
    place_id: string;
    position: number;
    is_featured: boolean;
    hotel_note_fr: string | null;
    hotel_note_en: string | null;
    places: { name: string; category: string } | null;
  }>).map((ligne) => ({
    place_id: ligne.place_id,
    nom: ligne.places?.name ?? '(lieu supprimé)',
    categorie: ligne.places?.category ?? '—',
    position: ligne.position,
    is_featured: ligne.is_featured,
    hotel_note_fr: ligne.hotel_note_fr,
    hotel_note_en: ligne.hotel_note_en,
  }));
}

/** Lieux publiés de la ville qui ne sont pas encore dans ce guide. */
export async function lieuxDisponibles(
  hotelId: string,
  ville: string,
): Promise<Array<{ id: string; name: string; category: string }>> {
  const supabase = creerClientAdmin();

  const [tous, deja] = await Promise.all([
    supabase
      .from('places')
      .select('id, name, category')
      .eq('city', ville)
      .eq('status', 'published')
      .order('name'),
    supabase.from('hotel_places').select('place_id').eq('hotel_id', hotelId),
  ]);

  const presents = new Set((deja.data ?? []).map((ligne) => ligne.place_id as string));
  return ((tous.data ?? []) as Array<{ id: string; name: string; category: string }>).filter(
    (lieu) => !presents.has(lieu.id),
  );
}

/** Autres hôtels de la même ville : sources possibles d'une duplication. */
export async function hotelsVoisins(
  hotelId: string,
  ville: string,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = creerClientAdmin();
  const { data } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('city', ville)
    .neq('id', hotelId)
    .order('name');
  return (data ?? []) as Array<{ id: string; name: string }>;
}
