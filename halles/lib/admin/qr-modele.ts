import QRCode from 'qrcode';
import type { Hotel, SourceScan } from '@/lib/types';

/**
 * Contenu des chevalets, séparé du dessin PDF.
 *
 * Ce module ne dépend ni de pdf-lib ni de `server-only` : il est donc testable
 * unitairement, ce qui compte pour l'URL encodée dans le QR — une erreur là
 * s'imprimerait sur des centaines de chevalets avant d'être vue.
 */

export interface Emplacement {
  source: SourceScan;
  titreFr: string;
  titreEn: string;
  consigneFr: string;
  consigneEn: string;
}

export const EMPLACEMENTS: Record<Exclude<SourceScan, 'autre'>, Emplacement> = {
  chambre: {
    source: 'chambre',
    titreFr: 'Le quartier, par nos soins',
    titreEn: 'The neighbourhood, hand-picked',
    consigneFr: 'Scannez pour découvrir nos adresses et vos avantages',
    consigneEn: 'Scan to see our addresses and your perks',
  },
  reception: {
    source: 'reception',
    titreFr: 'Où aller ce soir ?',
    titreEn: 'Where to go tonight?',
    consigneFr: 'Nos adresses et vos avantages, en un scan',
    consigneEn: 'Our addresses and your perks, one scan away',
  },
  'carte-cle': {
    source: 'carte-cle',
    titreFr: 'Vos avantages dans le quartier',
    titreEn: 'Your perks nearby',
    consigneFr: 'Scannez ce code',
    consigneEn: 'Scan this code',
  },
};

export function estEmplacement(valeur: string): valeur is keyof typeof EMPLACEMENTS {
  return valeur in EMPLACEMENTS;
}

/** URL encodée dans le QR, avec la provenance du support. */
export function urlDuGuide(hotel: Hotel, source: SourceScan, domaineRacine: string): string {
  const racine = domaineRacine.split(':')[0];
  // En développement le sous-domaine n'est pas joignable depuis un téléphone :
  // on retombe sur le mode chemin, qui fonctionne partout.
  const base =
    racine === 'localhost' || racine === ''
      ? `http://${domaineRacine || 'localhost:3000'}/h/${hotel.slug}`
      : `https://${hotel.slug}.${racine}`;
  return `${base}?source=${source}`;
}

/** Matrice booléenne du QR : true = module noir. */
export async function matriceQr(url: string): Promise<boolean[][]> {
  // Correction d'erreur au niveau Q : un chevalet posé sur une table de nuit
  // prend des traces de doigts et des rayures.
  const donnees = QRCode.create(url, { errorCorrectionLevel: 'Q' });
  const taille = donnees.modules.size;
  const bits = donnees.modules.data;

  return Array.from({ length: taille }, (_, ligne) =>
    Array.from({ length: taille }, (_, colonne) => Boolean(bits[ligne * taille + colonne])),
  );
}

