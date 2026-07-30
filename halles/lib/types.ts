/**
 * Types du domaine, alignés sur les migrations SQL.
 *
 * Écrits à la main tant que le projet Supabase n'existe pas. Une fois celui-ci
 * créé, `supabase gen types typescript` peut les régénérer — garder alors les
 * types dérivés (Locale, CreneauxSemaine…) qui n'ont pas d'équivalent en base.
 */

export type CategorieLieu =
  | 'restaurant'
  | 'bar'
  | 'cafe'
  | 'boulangerie'
  | 'brunch'
  | 'culture'
  | 'shopping'
  | 'balade'
  | 'pratique'
  | 'nuit';

export type StatutContenu = 'draft' | 'published' | 'archived' | 'closed';

export type RoleUtilisateur = 'admin' | 'hotelier';

export type TypeEvenement =
  | 'session_start'
  | 'page_view'
  | 'place_view'
  | 'outbound_click'
  | 'perk_view'
  | 'perk_open'
  | 'itinerary_view'
  | 'contact_click'
  | 'map_interaction';

export type SourceScan = 'chambre' | 'reception' | 'carte-cle' | 'autre';

/** Langues servies en v1. L'architecture accepte l'ajout d'ES/DE/IT. */
export type Locale = 'fr' | 'en';

/** Jours tels que stockés dans `places.opening_hours`. */
export type JourSemaine = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Un créneau : ["12:00", "14:30"]. */
export type Creneau = [string, string];

/** Jour absent = horaires inconnus ; tableau vide = fermé ce jour-là. */
export type HorairesSemaine = Partial<Record<JourSemaine, Creneau[]>>;

export interface BlocPersonnalise {
  title: string;
  body: string;
  icon?: string;
}

export interface Hotel {
  id: string;
  slug: string;
  custom_domain: string | null;
  name: string;
  city: string;
  address: string | null;
  lat: number;
  lng: number;
  rooms_count: number | null;
  logo_url: string | null;
  primary_color: string;
  default_locale: Locale;
  wifi_name: string | null;
  wifi_password: string | null;
  breakfast_info: string | null;
  checkin_info: string | null;
  checkout_info: string | null;
  transport_info: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  custom_blocks: BlocPersonnalise[];
  status: StatutContenu;
  plan: string;
  /** Secret du lien /s/{jeton} remis à l'hôtelier. */
  stats_token?: string;
}

export interface Lieu {
  id: string;
  city: string;
  name: string;
  category: CategorieLieu;
  address: string;
  lat: number;
  lng: number;
  price_range: number | null;
  short_desc_fr: string | null;
  short_desc_en: string | null;
  long_desc_fr: string | null;
  long_desc_en: string | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  instagram: string | null;
  opening_hours: HorairesSemaine | null;
  photo_url: string | null;
  tags: string[];
  status: StatutContenu;
  verified_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Avantage {
  id: string;
  place_id: string;
  title_fr: string;
  title_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  conditions_fr: string | null;
  conditions_en: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: StatutContenu;
}

/** Ligne de curation : le rattachement d'un lieu à un hôtel. */
export interface Curation {
  hotel_id: string;
  place_id: string;
  position: number;
  is_featured: boolean;
  hotel_note_fr: string | null;
  hotel_note_en: string | null;
}

/** Un lieu tel que consommé par le guide : la fiche, la curation, l'avantage. */
export interface LieuDuGuide extends Lieu {
  position: number;
  is_featured: boolean;
  hotel_note_fr: string | null;
  hotel_note_en: string | null;
  avantages: Avantage[];
}

export interface EtapeItineraire {
  place_id: string;
  order: number;
  note_fr: string | null;
  note_en: string | null;
}

export interface Itineraire {
  id: string;
  city: string;
  hotel_id: string | null;
  title_fr: string;
  title_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  duration_minutes: number | null;
  tags: string[];
  steps: EtapeItineraire[];
  status: StatutContenu;
}
