import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
import { urlCanonique } from '@/lib/env';
import './globals.css';

/*
 * Deux polices, pas une de plus : une serif de caractère pour les titres,
 * une sans neutre pour le texte. `display: swap` pour ne jamais bloquer le
 * premier rendu sur un wifi d'hôtel lent.
 */
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--police-titre',
});

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--police-texte',
});

export const metadata: Metadata = {
  /*
   * Sans base, Next émet des URL relatives dans les balises Open Graph et
   * canoniques, que les robots et les aperçus de messagerie ignorent.
   */
  metadataBase: new URL(urlCanonique()),
  title: 'Halles',
  description:
    'Le guide de quartier de votre hôtel : adresses choisies et avantages négociés.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // La carte plein écran a besoin de la hauteur réelle du viewport mobile.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
