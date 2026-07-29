import { describe, expect, it } from 'vitest';
import { dureeItineraire, formaterDuree, resoudreEtapes } from '@/lib/itineraires';
import type { Itineraire, LieuDuGuide } from '@/lib/types';

function lieu(id: string, lat: number, lng: number): LieuDuGuide {
  return {
    id, city: 'Paris', name: `Lieu ${id}`, category: 'restaurant',
    address: '1 rue X', lat, lng, price_range: null,
    short_desc_fr: null, short_desc_en: null, long_desc_fr: null, long_desc_en: null,
    phone: null, website: null, booking_url: null, instagram: null,
    opening_hours: null, photo_url: null, tags: [], status: 'published', verified_at: null,
    position: 10, is_featured: false, hotel_note_fr: null, hotel_note_en: null, avantages: [],
  };
}

const lieux = [
  lieu('a', 48.8584, 2.3552),
  lieu('b', 48.8600, 2.3600),
  lieu('c', 48.8556, 2.3655),
];

const itineraire = {
  steps: [
    { place_id: 'c', order: 3, note_fr: 'Troisième', note_en: 'Third' },
    { place_id: 'a', order: 1, note_fr: 'Première', note_en: 'First' },
    { place_id: 'b', order: 2, note_fr: 'Deuxième', note_en: null },
  ],
} as Pick<Itineraire, 'steps'>;

describe('resoudreEtapes', () => {
  it('remet les étapes dans l ordre', () => {
    const etapes = resoudreEtapes(itineraire, lieux, 'fr');
    expect(etapes.map((e) => e.lieu.id)).toEqual(['a', 'b', 'c']);
    expect(etapes.map((e) => e.ordre)).toEqual([1, 2, 3]);
  });

  it('ignore une étape dont le lieu a quitté le guide', () => {
    const avecOrphelin = {
      steps: [...itineraire.steps, { place_id: 'inconnu', order: 4, note_fr: null, note_en: null }],
    };
    expect(resoudreEtapes(avecOrphelin, lieux, 'fr')).toHaveLength(3);
  });

  it('calcule la marche entre étapes, et depuis l hôtel pour la première', () => {
    const depart = { lat: 48.8570, lng: 2.3540 };
    const etapes = resoudreEtapes(itineraire, lieux, 'fr', depart);
    expect(etapes[0].minutesDepuisPrecedente).toBeGreaterThan(0);
    expect(etapes[1].minutesDepuisPrecedente).toBeGreaterThan(0);
  });

  it('n annonce pas de marche pour la première étape sans point de départ', () => {
    expect(resoudreEtapes(itineraire, lieux, 'fr')[0].minutesDepuisPrecedente).toBeNull();
  });

  it('retombe sur le français quand la note anglaise manque', () => {
    const etapes = resoudreEtapes(itineraire, lieux, 'en');
    expect(etapes[0].note).toBe('First');
    expect(etapes[1].note).toBe('Deuxième');
  });
});

describe('dureeItineraire', () => {
  it('préfère la durée annoncée', () => {
    const etapes = resoudreEtapes(itineraire, lieux, 'fr', { lat: 48.857, lng: 2.354 });
    expect(dureeItineraire({ duration_minutes: 240 }, etapes)).toBe(240);
  });

  it('somme les marches à défaut', () => {
    const etapes = resoudreEtapes(itineraire, lieux, 'fr', { lat: 48.857, lng: 2.354 });
    const somme = etapes.reduce((t, e) => t + (e.minutesDepuisPrecedente ?? 0), 0);
    expect(dureeItineraire({ duration_minutes: null }, etapes)).toBe(somme);
  });
});

describe('formaterDuree', () => {
  it('écrit les durées à la française', () => {
    expect(formaterDuree(45, 'fr')).toBe('45 min');
    expect(formaterDuree(120, 'fr')).toBe('2 h');
    expect(formaterDuree(210, 'fr')).toBe('3 h 30');
  });

  it('écrit les durées à l anglaise', () => {
    expect(formaterDuree(210, 'en')).toBe('3 h 30 min');
  });
});
