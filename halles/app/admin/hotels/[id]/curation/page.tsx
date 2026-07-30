import { notFound } from 'next/navigation';
import { chargerCuration, chargerHotelAdmin, hotelsVoisins, lieuxDisponibles } from '@/lib/admin/data';
import { EcranCuration } from '@/components/admin/EcranCuration';

export const dynamic = 'force-dynamic';

export default async function PageCuration({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = await chargerHotelAdmin(id);
  if (!hotel) notFound();

  const [lignes, disponibles, voisins] = await Promise.all([
    chargerCuration(hotel.id),
    lieuxDisponibles(hotel.id, hotel.city),
    hotelsVoisins(hotel.id, hotel.city),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem]">Curation — {hotel.name}</h1>
          <p className="mt-0.5 text-[0.85rem] text-encre-tres-doux">
            {hotel.city} · <a href={`/h/${hotel.slug}`} className="hover:underline">voir le guide</a>
          </p>
        </div>
        <a href={`/admin/hotels/${hotel.id}`} className="text-[0.85rem] text-encre-doux hover:underline">
          Fiche de l&apos;hôtel
        </a>
      </div>

      <EcranCuration hotel={hotel} lignes={lignes} disponibles={disponibles} voisins={voisins} />
    </div>
  );
}
