import { NextResponse } from 'next/server';
import { chargerHotel } from '@/lib/data/guide';
import { fondEnTete } from '@/lib/theme';

/**
 * Manifeste d'installation, généré par tenant.
 *
 * Un guide installé doit porter le nom et les couleurs de SON hôtel : sur
 * l'écran d'accueil du téléphone, « Halles » ne dirait rien au voyageur, alors
 * que le nom de l'hôtel où il dort lui parle immédiatement.
 */
export const revalidate = 300;

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const hotel = await chargerHotel(slug);
  if (!hotel) return new NextResponse(null, { status: 404 });

  const icones = hotel.logo_url
    ? [{ src: hotel.logo_url, sizes: '512x512', type: 'image/png', purpose: 'any' }]
    : [{ src: '/icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];

  return NextResponse.json(
    {
      name: `${hotel.name} — ${hotel.city}`,
      short_name: hotel.name,
      description: `Les adresses choisies par ${hotel.name} et vos avantages dans le quartier.`,
      start_url: `/h/${slug}`,
      scope: `/h/${slug}`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#faf7f2',
      theme_color: fondEnTete(hotel.primary_color),
      lang: hotel.default_locale,
      icons: icones,
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
