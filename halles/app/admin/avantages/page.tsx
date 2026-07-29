import { AlertTriangle, Plus } from 'lucide-react';
import { listerAvantages } from '@/lib/admin/data';
import { avantagesBientotExpires, jourParis } from '@/lib/perks';
import { LienBouton } from '@/components/ui/Bouton';
import { StatutInline } from '@/components/admin/StatutInline';
import { RaccourcisListe } from '@/components/admin/RaccourcisListe';

export const dynamic = 'force-dynamic';

/** Table des avantages, triée par échéance : ce qui expire remonte. */
export default async function PageAvantages() {
  const avantages = await listerAvantages();
  const bientot = new Set(avantagesBientotExpires(avantages, 30).map((a) => a.id));
  const aujourdhui = jourParis();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[1.6rem]">
          Avantages{' '}
          <span className="text-[1rem] text-encre-tres-doux tabular-nums">{avantages.length}</span>
        </h1>
        <LienBouton href="/admin/avantages/nouveau" variante="primaire">
          <Plus aria-hidden size={15} strokeWidth={2} />
          Nouvel avantage
        </LienBouton>
      </div>

      {bientot.size > 0 ? (
        <p className="flex items-center gap-2.5 border border-[#b07d20] bg-[#b07d20]/[0.06] px-4 py-2.5 text-[0.88rem] text-[#8a6318] rounded-[3px]">
          <AlertTriangle aria-hidden size={16} strokeWidth={1.75} />
          {bientot.size} avantage{bientot.size > 1 ? 's expirent' : ' expire'} dans les 30 jours : à
          renégocier avant qu&apos;un client se présente avec une offre morte.
        </p>
      ) : null}

      <div className="overflow-x-auto border border-trait bg-papier rounded-[3px]">
        <table className="w-full min-w-[820px] text-[0.88rem]">
          <thead>
            <tr className="border-b border-trait text-left text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
              <th className="px-3 py-2 font-medium">Avantage</th>
              <th className="px-3 py-2 font-medium">Lieu</th>
              <th className="px-3 py-2 font-medium">Début</th>
              <th className="px-3 py-2 font-medium">Fin</th>
              <th className="px-3 py-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {avantages.map((avantage) => {
              const expire = avantage.valid_until !== null && avantage.valid_until < aujourdhui;

              return (
                <tr
                  key={avantage.id}
                  className="border-b border-trait/60 last:border-0 hover:bg-creme"
                >
                  <td className="px-3 py-2">
                    <a href={`/admin/avantages/${avantage.id}`} className="font-medium hover:underline">
                      {avantage.title_fr}
                    </a>
                    {avantage.conditions_fr ? (
                      <span className="block max-w-[38ch] truncate text-[0.78rem] text-encre-tres-doux">
                        {avantage.conditions_fr}
                      </span>
                    ) : (
                      <span className="block text-[0.78rem] text-[#8a6318]">
                        conditions non renseignées
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-encre-doux">
                    {avantage.lieu ? (
                      <a href={`/admin/lieux/${avantage.lieu.id}`} className="hover:underline">
                        {avantage.lieu.name}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-encre-doux">
                    {avantage.valid_from ?? '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    <span
                      className={
                        expire ? 'text-[#8a3d2c]' : bientot.has(avantage.id) ? 'text-[#8a6318]' : 'text-encre-doux'
                      }
                    >
                      {avantage.valid_until ?? 'sans fin'}
                      {expire ? ' · expiré' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <StatutInline table="perks" id={avantage.id} statut={avantage.status} />
                  </td>
                </tr>
              );
            })}

            {avantages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-encre-doux">
                  Aucun avantage négocié pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <RaccourcisListe hrefNouveau="/admin/avantages/nouveau" />
    </div>
  );
}
