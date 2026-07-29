import { describe, expect, it } from 'vitest';
import { analyserUrlGoogleMaps } from '@/lib/admin/import-maps';

describe('analyserUrlGoogleMaps', () => {
  it('lit le nom et les coordonnées précises d une fiche', () => {
    const r = analyserUrlGoogleMaps(
      'https://www.google.com/maps/place/Le+Comptoir+des+Archives/@48.8571,2.3559,17z/data=!4m6!3m5!1s0x0!8m2!3d48.858021!4d2.355903!16s',
    );
    expect(r.nom).toBe('Le Comptoir des Archives');
    // La position de l'établissement (!3d!4d) prime sur le centre de la vue (@).
    expect(r.lat).toBeCloseTo(48.858021, 5);
    expect(r.lng).toBeCloseTo(2.355903, 5);
    expect(r.manquant).toEqual([]);
    expect(r.probleme).toBeNull();
  });

  it('retombe sur le centre de la vue quand la position exacte manque', () => {
    const r = analyserUrlGoogleMaps('https://www.google.com/maps/place/Kubo/@48.8612,2.3578,17z');
    expect(r.nom).toBe('Kubo');
    expect(r.lat).toBeCloseTo(48.8612, 4);
  });

  it('accepte un lien de recherche par coordonnées', () => {
    const r = analyserUrlGoogleMaps('https://maps.google.com/?q=48.8556,2.3655');
    expect(r.lat).toBeCloseTo(48.8556, 4);
    expect(r.lng).toBeCloseTo(2.3655, 4);
    expect(r.manquant).toEqual(['nom']);
  });

  it('signale un lien raccourci, qu il faut ouvrir avant', () => {
    expect(analyserUrlGoogleMaps('https://maps.app.goo.gl/AbCdEf').probleme).toBe('lien-court');
  });

  it('refuse ce qui n est pas une URL', () => {
    expect(analyserUrlGoogleMaps('12 rue des Archives').probleme).toBe('url-invalide');
  });

  it('refuse un domaine qui n est pas Google Maps', () => {
    expect(analyserUrlGoogleMaps('https://openstreetmap.org/#map=17/48.85/2.35').probleme).toBe(
      'domaine-inconnu',
    );
  });

  it('ne prend pas des coordonnées pour un nom', () => {
    const r = analyserUrlGoogleMaps('https://www.google.com/maps/place/48.8584,2.3552/@48.8584,2.3552,17z');
    expect(r.nom).toBeNull();
    expect(r.manquant).toContain('nom');
  });

  it('rejette des coordonnées hors bornes ou nulles', () => {
    expect(analyserUrlGoogleMaps('https://maps.google.com/?q=0.0,0.0').lat).toBeNull();
    expect(analyserUrlGoogleMaps('https://www.google.com/maps/@120.5,2.35,17z').lat).toBeNull();
  });

  it('décode les caractères accentués du nom', () => {
    const r = analyserUrlGoogleMaps(
      'https://www.google.com/maps/place/Torr%C3%A9faction+Barbette/@48.8593,2.3601,17z',
    );
    expect(r.nom).toBe('Torréfaction Barbette');
  });
});
