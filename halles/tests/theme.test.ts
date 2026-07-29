import { describe, expect, it } from 'vitest';
import {
  accentLisible,
  contraste,
  couleurTexteSur,
  fondEnTete,
  hexVersRvb,
  variablesTheme,
} from '@/lib/theme';

const CREME = '#faf7f2';

describe('hexVersRvb', () => {
  it('accepte les formes courte et longue', () => {
    expect(hexVersRvb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexVersRvb('2f4b3f')).toEqual({ r: 47, g: 75, b: 63 });
  });

  it('refuse une valeur invalide', () => {
    expect(hexVersRvb('bleu')).toBeNull();
  });
});

describe('couleurTexteSur', () => {
  it('pose du blanc sur une couleur sombre et de l encre sur une couleur claire', () => {
    expect(couleurTexteSur('#2f4b3f')).toBe('#ffffff');
    expect(couleurTexteSur('#ffe066')).toBe('#1a1714');
  });

});

describe('fondEnTete', () => {
  it('laisse intacte une couleur déjà contrastée', () => {
    expect(fondEnTete('#2f4b3f')).toBe('#2f4b3f');
  });

  it('ajuste un ton moyen, sur lequel aucune couleur de texte ne passerait', () => {
    // Le gris à 50 % plafonne à 4,46:1 avec le blanc comme avec l'encre.
    expect(contraste('#7f7f7f', couleurTexteSur('#7f7f7f'))).toBeLessThan(4.5);
    const ajuste = fondEnTete('#7f7f7f');
    expect(ajuste).not.toBe('#7f7f7f');
    expect(contraste(ajuste, couleurTexteSur(ajuste))).toBeGreaterThanOrEqual(4.5);
  });

  it('garantit le contraste AA de l en-tête pour toute couleur saisie', () => {
    for (const couleur of [
      '#2f4b3f', '#ffe066', '#8a3d2c', '#7f7f7f', '#000000', '#ffffff',
      '#a0a0a0', '#6b8e23', '#00bcd4', '#ff5722',
    ]) {
      const fond = fondEnTete(couleur);
      expect(contraste(fond, couleurTexteSur(fond))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('accentLisible', () => {
  it('laisse une couleur déjà contrastée intacte', () => {
    expect(accentLisible('#2f4b3f')).toBe('#2f4b3f');
  });

  it('assombrit une couleur illisible sur le fond crème', () => {
    const jaune = accentLisible('#ffe066');
    expect(jaune).not.toBe('#ffe066');
    expect(contraste(jaune, CREME)).toBeGreaterThanOrEqual(4.5);
  });

  it('rend lisible n importe quelle couleur saisie par un hôtelier', () => {
    for (const couleur of ['#ffe066', '#00ff00', '#ff00ff', '#ffffff', '#c0c0c0', '#1a1714']) {
      expect(contraste(accentLisible(couleur), CREME)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('retombe sur l encre si la couleur est invalide', () => {
    expect(accentLisible('pas-une-couleur')).toBe('#1a1714');
  });
});

describe('variablesTheme', () => {
  it('expose les trois variables attendues par le layout', () => {
    expect(variablesTheme('#2f4b3f')).toEqual({
      '--couleur-hotel': '#2f4b3f',
      '--couleur-hotel-texte': '#ffffff',
      '--couleur-hotel-accent': '#2f4b3f',
    });
  });

  it('neutralise une couleur invalide sans casser la page', () => {
    expect(variablesTheme('oups')['--couleur-hotel']).toBe('#1a1714');
  });
});
