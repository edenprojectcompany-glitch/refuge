import { notFound } from 'next/navigation';
import { chargerLieuAdmin, listerVilles } from '@/lib/admin/data';
import { FormulaireLieu } from '@/components/admin/FormulaireLieu';

export const dynamic = 'force-dynamic';

export default async function PageLieuAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creation = id === 'nouveau';

  const [lieu, villes] = await Promise.all([
    creation ? Promise.resolve(null) : chargerLieuAdmin(id),
    listerVilles(),
  ]);

  if (!creation && !lieu) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[1.6rem]">{creation ? 'Nouveau lieu' : lieu!.name}</h1>
        {!creation ? (
          <p className="text-[0.8rem] text-encre-tres-doux">
            Ajouté le {new Date(lieu!.created_at ?? Date.now()).toLocaleDateString('fr-FR')}
          </p>
        ) : null}
      </div>

      <FormulaireLieu lieu={lieu} villes={villes} />
    </div>
  );
}
