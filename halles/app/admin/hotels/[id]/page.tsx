import { notFound } from 'next/navigation';
import { chargerHotelAdmin } from '@/lib/admin/data';
import { FormulaireHotel } from '@/components/admin/FormulaireHotel';

export const dynamic = 'force-dynamic';

export default async function PageHotelAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creation = id === 'nouveau';
  const hotel = creation ? null : await chargerHotelAdmin(id);

  if (!creation && !hotel) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-[1.6rem]">{creation ? 'Nouvel hôtel' : hotel!.name}</h1>
      <FormulaireHotel hotel={hotel} />
    </div>
  );
}
