import { Check, Plus } from 'lucide-react';
import { listerLieux, listerVilles, type FiltresLieux } from '@/lib/admin/data';
import { estCategorie, ORDRE_CATEGORIES } from '@/lib/categories';
import { LienBouton } from '@/components/ui/Bouton';
import { StatutInline } from '@/components/admin/StatutInline';
import { FiltresLieuxFormulaire } from '@/components/admin/FiltresLieux';
import { BoutonAction } from '@/components/admin/BoutonAction';
import { marquerVerifie } from '@/lib/admin/actions';
import { RaccourcisListe } from '@/components/admin/RaccourcisListe';

export const dynamic = 'force-dynamic';

const STATUTS = ['draft', 'published', 'archived', 'closed'] as const;

/** Table dense, filtrable par ville, catégorie et statut. */
export default async function PageLieux({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requete = await searchParams;
  const valeur = (cle: string) => {
    const v = requete[cle];
    return (Array.isArray(v) ? v[0] : v) ?? '';
  };

  const filtres: FiltresLieux = {
    ville: valeur('ville') || undefined,
    categorie: estCategorie(valeur('categorie')) ? valeur('categorie') as never : undefined,
    statut: (STATUTS as readonly string[]).includes(valeur('statut'))
      ? (valeur('statut') as never)
      : undefined,
    recherche: valeur('q') || undefined,
    aVerifier: valeur('verifier') === '1',
  };

  const [lieux, villes] = await Promise.all([listerLieux(filtres), listerVilles()]);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[1.6rem]">
          Lieux <span className="text-[1rem] text-encre-tres-doux tabular-nums">{lieux.length}</span>
        </h1>
        <LienBouton href="/admin/lieux/nouveau" variante="primaire" id="action-nouveau">
          <Plus aria-hidden size={15} strokeWidth={2} />
          Nouveau lieu
        </LienBouton>
      </div>

      <FiltresLieuxFormulaire
        villes={villes}
        categories={[...ORDRE_CATEGORIES]}
        valeurs={{
          ville: valeur('ville'),
          categorie: valeur('categorie'),
          statut: valeur('statut'),
          q: valeur('q'),
          verifier: valeur('verifier'),
        }}
      />

      <div className="overflow-x-auto border border-trait bg-papier rounded-[3px]">
        <table className="w-full min-w-[860px] text-[0.88rem]">
          <thead>
            <tr className="border-b border-trait text-left text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Catégorie</th>
              <th className="px-3 py-2 font-medium">Ville</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 text-right font-medium">Guides</th>
              <th className="px-3 py-2 text-right font-medium">Avantages</th>
              <th className="px-3 py-2 font-medium">Vérifié</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lieux.map((lieu) => {
              const vieux =
                !lieu.verified_at ||
                lieu.verified_at < new Date(Date.now() - 182 * 86400000).toISOString().slice(0, 10);

              return (
                <tr key={lieu.id} className="border-b border-trait/60 last:border-0 hover:bg-creme">
                  <td className="px-3 py-2">
                    <a href={`/admin/lieux/${lieu.id}`} className="font-medium hover:underline">
                      {lieu.name}
                    </a>
                    <span className="block text-[0.78rem] text-encre-tres-doux">{lieu.address}</span>
                  </td>
                  <td className="px-3 py-2 text-encre-doux">{lieu.category}</td>
                  <td className="px-3 py-2 text-encre-doux">{lieu.city}</td>
                  <td className="px-3 py-2">
                    <StatutInline table="places" id={lieu.id} statut={lieu.status} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-encre-doux">{lieu.guides}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-encre-doux">
                    {lieu.avantages}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    <span className={vieux ? 'text-[#8a6318]' : 'text-encre-doux'}>
                      {lieu.verified_at ?? 'jamais'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {lieu.verified_at !== aujourdhui ? (
                      <BoutonAction
                        action={marquerVerifie}
                        champs={{ id: lieu.id }}
                        libelle="Vérifié"
                        libelleEnCours="…"
                        taille="petit"
                        icone="check"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.8rem] text-encre-tres-doux">
                        <Check aria-hidden size={13} strokeWidth={2} />
                        aujourd&apos;hui
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {lieux.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-encre-doux">
                  Aucun lieu ne correspond à ces filtres.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <RaccourcisListe hrefNouveau="/admin/lieux/nouveau" />
    </div>
  );
}
