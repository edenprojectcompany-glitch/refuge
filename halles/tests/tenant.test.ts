import { describe, expect, it } from 'vitest';
import { analyserHote, slugValide } from '@/lib/tenant';

const RACINE = 'halles.app';

describe('analyserHote', () => {
  it('reconnaît un sous-domaine de tenant', () => {
    expect(analyserHote('lemarais.halles.app', RACINE)).toEqual({ type: 'guide', slug: 'lemarais' });
  });

  it('tolère le port et la casse', () => {
    expect(analyserHote('LeMarais.Halles.App:3000', RACINE)).toEqual({
      type: 'guide',
      slug: 'lemarais',
    });
  });

  it('renvoie la racine pour le domaine nu et pour www', () => {
    expect(analyserHote('halles.app', RACINE)).toEqual({ type: 'racine' });
    expect(analyserHote('www.halles.app', RACINE)).toEqual({ type: 'racine' });
  });

  it('ne prend pas un sous-domaine technique pour un hôtel', () => {
    for (const reserve of ['admin', 'api', 'app', 'cdn', 'static']) {
      expect(analyserHote(`${reserve}.halles.app`, RACINE)).toEqual({ type: 'racine' });
    }
  });

  it('refuse un sous-domaine à deux niveaux', () => {
    expect(analyserHote('a.b.halles.app', RACINE)).toEqual({ type: 'racine' });
  });

  it('ignore les domaines de prévisualisation Vercel', () => {
    expect(analyserHote('halles-git-main-x.vercel.app', RACINE)).toEqual({ type: 'racine' });
  });

  it('ignore un domaine étranger', () => {
    expect(analyserHote('lemarais.autrechose.app', RACINE)).toEqual({ type: 'racine' });
  });

  it('refuse un slug mal formé plutôt que de le transmettre à la base', () => {
    expect(analyserHote('LE_MARAIS.halles.app', RACINE)).toEqual({ type: 'racine' });
    expect(analyserHote('-marais.halles.app', RACINE)).toEqual({ type: 'racine' });
    expect(analyserHote('a.halles.app', RACINE)).toEqual({ type: 'racine' });
  });

  it('fonctionne en développement sur localhost', () => {
    expect(analyserHote('lemarais.localhost:3000', 'localhost')).toEqual({
      type: 'guide',
      slug: 'lemarais',
    });
    expect(analyserHote('localhost:3000', 'localhost')).toEqual({ type: 'racine' });
  });

  it('renvoie la racine sans en-tête Host', () => {
    expect(analyserHote(null, RACINE)).toEqual({ type: 'racine' });
  });
});

describe('slugValide', () => {
  it('accepte les slugs conformes à la contrainte SQL', () => {
    expect(slugValide('lemarais')).toBe(true);
    expect(slugValide('hotel-sainte-croix-2')).toBe(true);
  });

  it('refuse ce que la base refuserait', () => {
    expect(slugValide('Le-Marais')).toBe(false);
    expect(slugValide('marais-')).toBe(false);
    expect(slugValide('a')).toBe(false);
    expect(slugValide('a'.repeat(70))).toBe(false);
  });
});
