import { describe, expect, it } from 'vitest';
import {
  avantageActif,
  avantagesBientotExpires,
  compterEtablissementsAvecAvantage,
  jourParis,
} from '@/lib/perks';
import type { Avantage, LieuDuGuide } from '@/lib/types';

function avantage(partiel: Partial<Avantage> = {}): Avantage {
  return {
    id: 'p1',
    place_id: 'l1',
    title_fr: 'Apéritif offert',
    title_en: null,
    description_fr: null,
    description_en: null,
    conditions_fr: null,
    conditions_en: null,
    valid_from: null,
    valid_until: null,
    status: 'published',
    ...partiel,
  };
}

function lieu(id: string, avantages: Avantage[]): LieuDuGuide {
  return {
    id,
    city: 'Paris',
    name: `Lieu ${id}`,
    category: 'restaurant',
    address: '1 rue de Rivoli',
    lat: 48.86,
    lng: 2.35,
    price_range: 2,
    short_desc_fr: null,
    short_desc_en: null,
    long_desc_fr: null,
    long_desc_en: null,
    phone: null,
    website: null,
    booking_url: null,
    instagram: null,
    opening_hours: null,
    photo_url: null,
    tags: [],
    status: 'published',
    verified_at: null,
    position: 10,
    is_featured: false,
    hotel_note_fr: null,
    hotel_note_en: null,
    avantages,
  };
}

describe('jourParis', () => {
  it('donne la date parisienne, pas celle du serveur', () => {
    // 22 h UTC le 30 juin = déjà le 1er juillet à Paris (UTC+2 en été).
    expect(jourParis(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01');
  });
});

describe('avantageActif', () => {
  const maintenant = new Date('2026-07-15T12:00:00Z');

  it('accepte un avantage sans borne', () => {
    expect(avantageActif(avantage(), maintenant)).toBe(true);
  });

  it('accepte un avantage dans sa fenêtre', () => {
    expect(
      avantageActif(avantage({ valid_from: '2026-01-01', valid_until: '2026-12-31' }), maintenant),
    ).toBe(true);
  });

  it('refuse un avantage pas encore commencé', () => {
    expect(avantageActif(avantage({ valid_from: '2026-08-01' }), maintenant)).toBe(false);
  });

  it('refuse un avantage expiré', () => {
    expect(avantageActif(avantage({ valid_until: '2026-07-14' }), maintenant)).toBe(false);
  });

  it('reste valable le dernier jour, jusqu au bout de la soirée parisienne', () => {
    const soir = new Date('2026-07-15T21:00:00Z'); // 23 h à Paris
    expect(avantageActif(avantage({ valid_until: '2026-07-15' }), soir)).toBe(true);
  });
});

describe('compterEtablissementsAvecAvantage', () => {
  const maintenant = new Date('2026-07-15T12:00:00Z');

  it('compte des établissements, pas des avantages', () => {
    const lieux = [
      lieu('a', [avantage({ id: '1' }), avantage({ id: '2' })]),
      lieu('b', [avantage({ id: '3' })]),
      lieu('c', []),
    ];
    expect(compterEtablissementsAvecAvantage(lieux, maintenant)).toBe(2);
  });

  it('ignore les établissements dont le seul avantage est expiré', () => {
    const lieux = [lieu('a', [avantage({ valid_until: '2026-01-01' })])];
    expect(compterEtablissementsAvecAvantage(lieux, maintenant)).toBe(0);
  });
});

describe('avantagesBientotExpires', () => {
  const maintenant = new Date('2026-07-15T12:00:00Z');

  it('signale ce qui expire dans les 30 jours', () => {
    const liste = [
      avantage({ id: 'bientot', valid_until: '2026-08-01' }),
      avantage({ id: 'plus-tard', valid_until: '2026-12-31' }),
      avantage({ id: 'sans-fin' }),
      avantage({ id: 'deja-expire', valid_until: '2026-07-01' }),
    ];
    expect(avantagesBientotExpires(liste, 30, maintenant).map((a) => a.id)).toEqual(['bientot']);
  });
});
