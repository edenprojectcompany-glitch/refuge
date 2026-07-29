import { notFound } from 'next/navigation';
import { chargerAvantageAdmin, listerLieux } from '@/lib/admin/data';
import { FormulaireAvantage } from '@/components/admin/FormulaireAvantage';

export const dynamic = 'force-dynamic';

export default async function PageAvantageAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creation = id === 'nouveau';

  const [avantage, lieux] = await Promise.all([
    creation ? Promise.resolve(null) : chargerAvantageAdmin(id),
    listerLieux(),
  ]);

  if (!creation && !avantage) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-[1.6rem]">{creation ? 'Nouvel avantage' : avantage!.title_fr}</h1>
      <FormulaireAvantage
        avantage={avantage}
        lieux={lieux.map(({ id: lieuId, name, city }) => ({ id: lieuId, name, city }))}
      />
    </div>
  );
}
