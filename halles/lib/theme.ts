/**
 * Thème par tenant.
 *
 * L'hôtelier choisit une couleur ; le design ne doit jamais en pâtir. On calcule
 * donc, à partir de son code hexadécimal :
 *   - la couleur de texte à poser dessus (blanc ou encre) ;
 *   - une variante assombrie si nécessaire pour rester lisible sur le fond crème.
 * Les seuils suivent le WCAG AA (4,5:1 pour le texte courant, 3:1 pour les gros
 * titres et les éléments d'interface).
 */

const CREME = '#faf7f2';
const ENCRE = '#1a1714';
const BLANC = '#ffffff';

export interface Rvb {
  r: number;
  g: number;
  b: number;
}

export function hexVersRvb(hex: string): Rvb | null {
  const nettoye = hex.trim().replace('#', '');
  const complet =
    nettoye.length === 3
      ? nettoye
          .split('')
          .map((c) => c + c)
          .join('')
      : nettoye;

  if (!/^[0-9a-fA-F]{6}$/.test(complet)) return null;

  return {
    r: parseInt(complet.slice(0, 2), 16),
    g: parseInt(complet.slice(2, 4), 16),
    b: parseInt(complet.slice(4, 6), 16),
  };
}

export function rvbVersHex({ r, g, b }: Rvb): string {
  const composante = (valeur: number) =>
    Math.max(0, Math.min(255, Math.round(valeur))).toString(16).padStart(2, '0');
  return `#${composante(r)}${composante(g)}${composante(b)}`;
}

/** Luminance relative WCAG. */
export function luminance(couleur: Rvb): number {
  const canal = (valeur: number) => {
    const v = valeur / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(couleur.r) + 0.7152 * canal(couleur.g) + 0.0722 * canal(couleur.b);
}

/** Rapport de contraste entre deux couleurs, de 1:1 à 21:1. */
export function contraste(a: string, b: string): number {
  const rvbA = hexVersRvb(a);
  const rvbB = hexVersRvb(b);
  if (!rvbA || !rvbB) return 1;

  const lA = luminance(rvbA);
  const lB = luminance(rvbB);
  const clair = Math.max(lA, lB);
  const sombre = Math.min(lA, lB);
  return (clair + 0.05) / (sombre + 0.05);
}

/** Texte à poser sur une couleur de fond : celui qui contraste le mieux. */
export function couleurTexteSur(fond: string): string {
  return contraste(fond, BLANC) >= contraste(fond, ENCRE) ? BLANC : ENCRE;
}

/**
 * Fond de l'en-tête, dérivé de la couleur de l'hôtel.
 *
 * Sur un ton moyen — un gris à 50 %, typiquement — aucune couleur de texte
 * n'atteint 4,5:1 : ni le blanc, ni l'encre. Choisir le « moins pire » ferait
 * passer l'en-tête sous le seuil AA. On ajuste donc le FOND, dans le sens qui
 * l'éloigne du texte retenu, jusqu'à obtenir le contraste requis. Un vert
 * profond ou un bordeaux ressortent inchangés ; seuls les tons moyens bougent,
 * de quelques crans.
 */
export function fondEnTete(couleur: string, cible = 4.5): string {
  const rvb = hexVersRvb(couleur);
  if (!rvb) return ENCRE;

  const texteBlanc = contraste(couleur, BLANC) >= contraste(couleur, ENCRE);
  const texte = texteBlanc ? BLANC : ENCRE;

  let courant = rvb;
  for (let i = 0; i < 24; i += 1) {
    const hex = rvbVersHex(courant);
    if (contraste(hex, texte) >= cible) return hex;
    courant = texteBlanc
      ? { r: courant.r * 0.9, g: courant.g * 0.9, b: courant.b * 0.9 }
      : {
          r: courant.r + (255 - courant.r) * 0.1,
          g: courant.g + (255 - courant.g) * 0.1,
          b: courant.b + (255 - courant.b) * 0.1,
        };
  }
  return texteBlanc ? ENCRE : BLANC;
}

/**
 * Variante de la couleur de l'hôtel utilisable en accent sur fond crème.
 * On assombrit par paliers jusqu'à atteindre 4,5:1 — un jaune vif reste
 * reconnaissable en ocre foncé, alors qu'illisible il ruinerait la page.
 */
export function accentLisible(couleur: string, fond = CREME): string {
  const rvb = hexVersRvb(couleur);
  if (!rvb) return ENCRE;

  let courant = rvb;
  for (let i = 0; i < 20; i += 1) {
    if (contraste(rvbVersHex(courant), fond) >= 4.5) return rvbVersHex(courant);
    courant = { r: courant.r * 0.85, g: courant.g * 0.85, b: courant.b * 0.85 };
  }
  return ENCRE;
}

/** Variables CSS injectées par le layout du tenant. */
export function variablesTheme(couleurHotel: string): Record<string, string> {
  const fond = fondEnTete(couleurHotel);
  return {
    '--couleur-hotel': fond,
    '--couleur-hotel-texte': couleurTexteSur(fond),
    '--couleur-hotel-accent': accentLisible(couleurHotel),
  };
}
