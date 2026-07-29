import { notFound } from 'next/navigation';
import { chargerHotel } from '@/lib/data/guide';

/**
 * Marque-page des écrans du guide livrés en phase 2 (carte, fiches, avantages,
 * itinéraires, infos). Les liens de l'accueil pointent déjà vers leurs URL
 * définitives : cette page évite qu'ils tombent sur une erreur pendant la
 * phase 1, et disparaîtra dès que les écrans réels seront en place.
 */
export const revalidate = 300;

export default async function PageAConstruire({
  params,
}: {
  params: Promise<{ slug: string; reste: string[] }>;
}) {
  const { slug, reste } = await params;
  const hotel = await chargerHotel(slug);
  if (!hotel) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="text-[0.78rem] uppercase tracking-[0.14em] text-encre-tres-doux">
        /{reste.join('/')}
      </p>
      <h1 className="mt-3 text-[1.9rem]">Écran en préparation</h1>
      <p className="mt-4 text-[0.98rem] leading-relaxed text-encre-doux">
        Cette page fait partie de la phase 2 du guide de {hotel.name}.
      </p>
      <a
        href={`/h/${slug}`}
        className="mt-8 inline-flex min-h-11 items-center text-[0.95rem] font-medium"
        style={{ color: 'var(--couleur-hotel-accent)' }}
      >
        Retour à l&apos;accueil
      </a>
    </main>
  );
}
