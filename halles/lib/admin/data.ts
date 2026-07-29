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
