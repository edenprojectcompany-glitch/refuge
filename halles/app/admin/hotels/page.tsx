import { ExternalLink, Plus } from 'lucide-react';
import { listerHotels } from '@/lib/admin/data';
import { LienBouton } from '@/components/ui/Bouton';
import { StatutInline } from '@/components/admin/StatutInline';
import { RaccourcisListe } from '@/components/admin/RaccourcisListe';

export const dynamic = 'force-dynamic';

export default async function PageHotels() {
  const hotels = await listerHotels();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[1.6rem]">
          Hôtels{' '}
          <span className="text-[1rem] text-encre-tres-doux tabular-nums">{hotels.length}</span>
        </h1>
        <LienBouton href="/admin/hotels/nouveau" variante="primaire">
          <Plus aria-hidden size={15} strokeWidth={2} />
          Nouvel hôtel
        </LienBouton>
      </div>

      <div className="overflow-x-auto border border-trait bg-papier rounded-[3px]">
        <table className="w-full min-w-[720px] text-[0.88rem]">
          <thead>
            <tr className="border-b border-trait text-left text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Ville</th>
              <th className="px-3 py-2 text-right font-medium">Chambres</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Formule</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {hotels.map((hotel) => (
              <tr key={hotel.id} className="border-b border-trait/60 last:border-0 hover:bg-creme">
                <td className="px-3 py-2">
                  <a href={`/admin/hotels/${hotel.id}`} className="font-medium hover:underline">
                    {hotel.name}
                  </a>
                </td>
                <td className="px-3 py-2 font-mono text-[0.82rem] text-encre-doux">{hotel.slug}</td>
                <td className="px-3 py-2 text-encre-doux">{hotel.city}</td>
                <td className="px-3 py-2 text-right tabular-nums text-encre-doux">
                  {hotel.rooms_count ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <StatutInline table="hotels" id={hotel.id} statut={hotel.status} />
                </td>
                <td className="px-3 py-2 text-encre-doux">{hotel.plan}</td>
                <td className="px-3 py-2 text-right">
                  <a
                    href={`/h/${hotel.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 px-2 text-[0.82rem] text-encre-doux hover:underline"
                  >
                    Voir le guide
                    <ExternalLink aria-hidden size={13} strokeWidth={1.75} />
                  </a>
                </td>
              </tr>
            ))}

            {hotels.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-encre-doux">
                  Aucun hôtel. Commencez par en créer un.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <RaccourcisListe hrefNouveau="/admin/hotels/nouveau" />
    </div>
  );
}
