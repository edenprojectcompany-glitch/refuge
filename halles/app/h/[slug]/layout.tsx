import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { chargerHotel } from '@/lib/data/guide';
import { variablesTheme } from '@/lib/theme';
import type { CSSProperties } from 'react';

/**
 * Layout du tenant : charge l'hôtel une fois, injecte son thème.
 *
 * Le rendu est statique et revalidé toutes les 5 minutes. La publication depuis
 * le back-office déclenchera une revalidation à la demande (phase 3).
 */
export const revalidate = 300;

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await chargerHotel(slug);
  if (!hotel) return { title: 'Guide introuvable' };

  return {
    title: `${hotel.name} — le quartier`,
    description: `Les adresses choisies par ${hotel.name} et vos avantages dans le quartier.`,
    // Le guide n'a rien à faire dans un moteur de recherche : il s'adresse aux
    // clients de l'hôtel, et son contenu (mot de passe wifi compris) est privé.
    robots: { index: false, follow: false },
  };
}

export default async function LayoutTenant({ children, params }: Props) {
  const { slug } = await params;
  const hotel = await chargerHotel(slug);
  if (!hotel) notFound();

  return (
    <div style={variablesTheme(hotel.primary_color) as CSSProperties} className="min-h-dvh">
      {children}
    </div>
  );
}
