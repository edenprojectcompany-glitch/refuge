import { describe, expect, it } from 'vitest';
import { EMPLACEMENTS, estEmplacement, matriceQr, urlDuGuide } from '@/lib/admin/qr-modele';
import type { Hotel } from '@/lib/types';

const hotel = { slug: 'lemarais', primary_color: '#2f4b3f' } as Hotel;

describe('urlDuGuide', () => {
  it('encode le sous-domaine et la provenance en production', () => {
    expect(urlDuGuide(hotel, 'chambre', 'halles.app')).toBe(
      'https://lemarais.halles.app?source=chambre',
    );
  });

  it('retombe sur le mode chemin en développement', () => {
    // Un téléphone ne résout pas lemarais.localhost : le QR imprimé en dev
    // doit rester scannable.
    expect(urlDuGuide(hotel, 'reception', 'localhost:3000')).toBe(
      'http://localhost:3000/h/lemarais?source=reception',
    );
  });

  it('ignore un port collé au domaine de production', () => {
    expect(urlDuGuide(hotel, 'carte-cle', 'halles.app:443')).toBe(
      'https://lemarais.halles.app?source=carte-cle',
    );
  });
});

describe('estEmplacement', () => {
  it('reconnaît les trois supports imprimés', () => {
    expect(estEmplacement('chambre')).toBe(true);
    expect(estEmplacement('reception')).toBe(true);
    expect(estEmplacement('carte-cle')).toBe(true);
  });

  it('refuse le reste', () => {
    expect(estEmplacement('autre')).toBe(false);
    expect(estEmplacement('../../etc/passwd')).toBe(false);
  });
});

describe('EMPLACEMENTS', () => {
  it('porte un texte bilingue pour chaque support', () => {
    for (const emplacement of Object.values(EMPLACEMENTS)) {
      expect(emplacement.titreFr.length).toBeGreaterThan(0);
      expect(emplacement.titreEn.length).toBeGreaterThan(0);
      expect(emplacement.consigneFr.length).toBeGreaterThan(0);
      expect(emplacement.consigneEn.length).toBeGreaterThan(0);
    }
  });

  it('a une provenance distincte par support', () => {
    const sources = Object.values(EMPLACEMENTS).map((e) => e.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe('matriceQr', () => {
  it('produit une matrice carrée de version impaire ≥ 21', async () => {
    const matrice = await matriceQr('https://lemarais.halles.app?source=chambre');
    expect(matrice.length).toBeGreaterThanOrEqual(21);
    expect(matrice.every((ligne) => ligne.length === matrice.length)).toBe(true);
    // Toute version de QR fait 21 + 4n modules.
    expect((matrice.length - 21) % 4).toBe(0);
  });

  it('place les trois motifs de repérage aux bons coins', async () => {
    // C'est ce qui détecte une inversion lignes/colonnes : un QR retourné
    // resterait carré mais deviendrait illisible.
    const m = await matriceQr('https://lemarais.halles.app?source=chambre');
    const n = m.length;

    const motif = (l0: number, c0: number) =>
      // Anneau plein de 7x7 : bord noir, deuxième anneau blanc, cœur noir.
      m[l0][c0] && m[l0][c0 + 6] && m[l0 + 6][c0] &&
      !m[l0 + 1][c0 + 1] && m[l0 + 3][c0 + 3];

    expect(motif(0, 0)).toBe(true);          // haut gauche
    expect(motif(0, n - 7)).toBe(true);      // haut droit
    expect(motif(n - 7, 0)).toBe(true);      // bas gauche
    // Le coin bas droit n'a jamais de motif de repérage.
    expect(m[n - 1][n - 1] && m[n - 4][n - 4] && !m[n - 6][n - 6]).toBe(false);
  });
});
