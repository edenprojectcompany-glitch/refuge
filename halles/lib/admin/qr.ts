import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Hotel } from '@/lib/types';
import { EMPLACEMENTS, estEmplacement, matriceQr, urlDuGuide, type Emplacement } from './qr-modele';

export { EMPLACEMENTS, estEmplacement, urlDuGuide };
export type { Emplacement };

/**
 * Chevalets A5 à imprimer, un par emplacement.
 *
 * Le QR est tracé en vectoriel (chemin SVG converti en dessin PDF) et non en
 * image : le fichier reste net à n'importe quelle taille d'impression, y
 * compris agrandi en affiche, et pèse quelques kilo-octets.
 *
 * Chaque emplacement porte son propre `?source=` : c'est ce qui permettra à
 * l'hôtelier de savoir lequel de ses supports fonctionne, et donc de décider
 * s'il en imprime d'autres.
 */

/** A5 portrait en points PostScript (1 pt = 1/72 pouce). */
const LARGEUR = 419.53;
const HAUTEUR = 595.28;

const ENCRE = rgb(0.102, 0.09, 0.078);
const CREME = rgb(0.98, 0.969, 0.949);
const DOUX = rgb(0.361, 0.333, 0.298);

export async function genererChevalet(
  hotel: Hotel,
  emplacement: Emplacement,
  domaineRacine: string,
): Promise<Uint8Array> {
  const url = urlDuGuide(hotel, emplacement.source, domaineRacine);

  const document = await PDFDocument.create();
  document.setTitle(`${hotel.name} — QR ${emplacement.source}`);
  document.setCreator('Halles');
  document.setSubject(url);

  const page = document.addPage([LARGEUR, HAUTEUR]);
  const serif = await document.embedFont(StandardFonts.TimesRoman);
  const sans = await document.embedFont(StandardFonts.Helvetica);
  const sansGras = await document.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: LARGEUR, height: HAUTEUR, color: CREME });

  // Bandeau supérieur à la couleur de l'hôtel, comme l'en-tête du guide.
  const bandeau = 96;
  page.drawRectangle({
    x: 0,
    y: HAUTEUR - bandeau,
    width: LARGEUR,
    height: bandeau,
    color: couleurPdf(hotel.primary_color),
  });

  const texteBandeau = contrasteBlanc(hotel.primary_color) ? rgb(1, 1, 1) : ENCRE;
  centrer(page, hotel.city.toUpperCase(), sans, 8.5, HAUTEUR - 38, texteBandeau, 2.2);
  centrer(page, hotel.name, serif, 22, HAUTEUR - 66, texteBandeau);

  // Titre
  centrer(page, emplacement.titreFr, serif, 19, HAUTEUR - 148, ENCRE);
  centrer(page, emplacement.titreEn, serif, 13, HAUTEUR - 170, DOUX);

  // QR : dessiné en carrés vectoriels, sans image bitmap.
  const cote = 208;
  const x = (LARGEUR - cote) / 2;
  const y = HAUTEUR - 200 - cote;
  dessinerQr(page, await matriceQr(url), x, y, cote);

  // Consignes
  centrer(page, emplacement.consigneFr, sansGras, 11, y - 34, ENCRE);
  centrer(page, emplacement.consigneEn, sans, 10, y - 50, DOUX);

  // Repli manuel : un QR abîmé ou un appareil récalcitrant ne doit pas
  // condamner le guide.
  centrer(page, url.replace(/^https?:\/\//, ''), sans, 8, 54, DOUX, 0.6);
  centrer(page, `Halles · ${emplacement.source}`, sans, 6.5, 34, DOUX, 1.4);

  return document.save();
}

function dessinerQr(
  page: ReturnType<PDFDocument['addPage']>,
  matrice: boolean[][],
  x: number,
  y: number,
  cote: number,
) {
  const modules = matrice.length;
  const pas = cote / modules;

  // Fond blanc franc sous le code, avec une marge tranquille de quatre modules :
  // sans elle, les lecteurs peinent sur fond coloré.
  const marge = pas * 2;
  page.drawRectangle({
    x: x - marge,
    y: y - marge,
    width: cote + marge * 2,
    height: cote + marge * 2,
    color: rgb(1, 1, 1),
  });

  for (let ligne = 0; ligne < modules; ligne += 1) {
    for (let colonne = 0; colonne < modules; colonne += 1) {
      if (!matrice[ligne][colonne]) continue;
      page.drawRectangle({
        x: x + colonne * pas,
        // Les matrices se lisent de haut en bas, le PDF de bas en haut.
        y: y + cote - (ligne + 1) * pas,
        width: pas,
        height: pas,
        color: ENCRE,
      });
    }
  }
}

function centrer(
  page: ReturnType<PDFDocument['addPage']>,
  texte: string,
  police: Awaited<ReturnType<PDFDocument['embedFont']>>,
  taille: number,
  y: number,
  couleur: ReturnType<typeof rgb>,
  interlettrage = 0,
) {
  // Les polices standard du PDF sont en Latin-1 : on remplace ce qu'elles ne
  // savent pas dessiner plutôt que de faire échouer la génération.
  const propre = texte.normalize('NFC').replace(/[’]/g, "'").replace(/[–—]/g, '-');
  const largeur = police.widthOfTextAtSize(propre, taille) + interlettrage * (propre.length - 1);

  page.drawText(propre, {
    x: (LARGEUR - largeur) / 2,
    y,
    size: taille,
    font: police,
    color: couleur,
    ...(interlettrage ? { characterSpacing: interlettrage } : {}),
  });
}

function couleurPdf(hex: string) {
  const valeur = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#1a1714';
  return rgb(
    parseInt(valeur.slice(1, 3), 16) / 255,
    parseInt(valeur.slice(3, 5), 16) / 255,
    parseInt(valeur.slice(5, 7), 16) / 255,
  );
}

/** Luminance approchée : suffisante pour choisir entre blanc et encre. */
function contrasteBlanc(hex: string): boolean {
  const valeur = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#1a1714';
  const [r, v, b] = [1, 3, 5].map((i) => parseInt(valeur.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * v + 0.0722 * b < 0.55;
}
