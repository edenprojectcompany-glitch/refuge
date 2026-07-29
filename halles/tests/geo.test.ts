import { describe, expect, it } from 'vitest';
import { distanceHaversine, formaterDistance, minutesAPied } from '@/lib/geo';

const hotel = { lat: 48.85837, lng: 2.3552 }; // Hôtel Sainte-Croix, seed
const placeDesVosges = { lat: 48.8556, lng: 2.3655 };

describe('distanceHaversine', () => {
  it('mesure une distance connue du Marais à 5 % près', () => {
    // ~790 m à vol d'oiseau entre l'hôtel démo et la place des Vosges.
    const d = distanceHaversine(hotel, placeDesVosges);
    expect(d).toBeGreaterThan(750);
    expect(d).toBeLessThan(830);
  });

  it('renvoie zéro pour deux points confondus', () => {
    expect(distanceHaversine(hotel, hotel)).toBe(0);
  });
});

describe('minutesAPied', () => {
  it('applique le facteur de détour puis la vitesse de marche', () => {
    expect(minutesAPied(hotel, placeDesVosges)).toBe(14);
  });

  it('ne descend jamais sous une minute', () => {
    expect(minutesAPied(hotel, { lat: 48.85838, lng: 2.35521 })).toBe(1);
  });
});

describe('formaterDistance', () => {
  it('arrondit à 10 m sous le kilomètre', () => {
    expect(formaterDistance(783)).toBe('780 m');
  });

  it('passe au kilomètre au-delà, avec la virgule en français', () => {
    expect(formaterDistance(1540, 'fr')).toBe('1,5 km');
    expect(formaterDistance(1540, 'en')).toBe('1.5 km');
  });
});
