import { describe, expect, it } from 'vitest';
import {
  classer,
  decalerJour,
  evolution,
  serieComplete,
  tauxDeScan,
  totaliser,
  type JourStats,
} from '@/lib/stats';

const jour = (day: string, sessions: number, clics = 0, perks = 0): JourStats => ({
  day,
  sessions,
  outbound_clicks: clics,
  perk_opens: perks,
  total_events: sessions + clics + perks,
});

describe('totaliser', () => {
  it('additionne les colonnes', () => {
    expect(totaliser([jour('2026-07-01', 10, 4, 2), jour('2026-07-02', 5, 1, 3)])).toEqual({
      sessions: 15,
      clicsSortants: 5,
      avantagesOuverts: 5,
    });
  });

  it('renvoie des zéros sur une période vide', () => {
    expect(totaliser([])).toEqual({ sessions: 0, clicsSortants: 0, avantagesOuverts: 0 });
  });
});

describe('evolution', () => {
  it('calcule une hausse et une baisse', () => {
    expect(evolution(120, 100)).toBe(20);
    expect(evolution(80, 100)).toBe(-20);
  });

  it('ne se prononce pas quand la période précédente est vide', () => {
    // Afficher « +100 % » à un hôtelier qui vient d'installer son QR code
    // serait une information fausse.
    expect(evolution(50, 0)).toBeNull();
  });
});

describe('tauxDeScan', () => {
  it('rapporte les sessions aux nuitées vendues', () => {
    // 34 chambres, 30 jours, 70 % d'occupation = 714 nuitées ; 214 sessions ≈ 30 %.
    expect(tauxDeScan(214, 34, 30, 0.7)).toBe(30);
  });

  it('plafonne à 100 %', () => {
    expect(tauxDeScan(5000, 10, 30, 0.5)).toBe(100);
  });

  it('ne calcule rien sans nombre de chambres', () => {
    expect(tauxDeScan(100, null, 30, 0.7)).toBeNull();
    expect(tauxDeScan(100, 0, 30, 0.7)).toBeNull();
  });

  it('refuse un taux d occupation absurde', () => {
    expect(tauxDeScan(100, 34, 30, 0)).toBeNull();
    expect(tauxDeScan(100, 34, 30, 1.4)).toBeNull();
  });
});

describe('serieComplete', () => {
  it('comble les jours sans événement', () => {
    const serie = serieComplete([jour('2026-07-02', 4)], '2026-07-01', '2026-07-03');
    expect(serie.map((j) => j.day)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    expect(serie.map((j) => j.sessions)).toEqual([0, 4, 0]);
  });

  it('traverse un changement de mois', () => {
    const serie = serieComplete([], '2026-06-29', '2026-07-02');
    expect(serie.map((j) => j.day)).toEqual([
      '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02',
    ]);
  });
});

describe('decalerJour', () => {
  it('décale sans se tromper de mois', () => {
    expect(decalerJour('2026-07-01', -1)).toBe('2026-06-30');
    expect(decalerJour('2026-07-01', -30)).toBe('2026-06-01');
  });
});

describe('classer', () => {
  it('trie par total décroissant et départage par ordre alphabétique', () => {
    const r = classer([
      { id: 'b', libelle: 'Bar', total: 5 },
      { id: 'a', libelle: 'Arcade', total: 5 },
      { id: 'c', libelle: 'Café', total: 9 },
    ]);
    expect(r.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('respecte la limite', () => {
    const entrees = Array.from({ length: 20 }, (_, i) => ({
      id: String(i), libelle: `L${i}`, total: i,
    }));
    expect(classer(entrees, 10)).toHaveLength(10);
  });
});
