'use client';

import { Search, X } from 'lucide-react';
import { Bouton } from '@/components/ui/Bouton';
import { Champ, Selecteur } from '@/components/ui/Champ';

/**
 * Filtres de la table des lieux.
 *
 * Formulaire GET plutôt que state client : l'URL décrit la vue, donc un filtre
 * se partage, se met en favori et survit à un rechargement.
 */
export function FiltresLieuxFormulaire({
  villes,
  categories,
  valeurs,
}: {
  villes: string[];
  categories: string[];
  valeurs: Record<'ville' | 'categorie' | 'statut' | 'q' | 'verifier', string>;
}) {
  const filtre = Object.values(valeurs).some((v) => v !== '');

  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <div className="min-w-[180px] flex-1">
        <Champ
          type="search"
          name="q"
          id="recherche"
          defaultValue={valeurs.q}
          placeholder="Nom ou adresse…"
          aria-label="Rechercher"
        />
      </div>

      <Selecteur name="ville" defaultValue={valeurs.ville} aria-label="Ville" className="w-auto">
        <option value="">Toutes les villes</option>
        {villes.map((ville) => (
          <option key={ville} value={ville}>
            {ville}
          </option>
        ))}
      </Selecteur>

      <Selecteur
        name="categorie"
        defaultValue={valeurs.categorie}
        aria-label="Catégorie"
        className="w-auto"
      >
        <option value="">Toutes catégories</option>
        {categories.map((categorie) => (
          <option key={categorie} value={categorie}>
            {categorie}
          </option>
        ))}
      </Selecteur>

      <Selecteur name="statut" defaultValue={valeurs.statut} aria-label="Statut" className="w-auto">
        <option value="">Tous statuts</option>
        <option value="published">Publié</option>
        <option value="draft">Brouillon</option>
        <option value="archived">Archivé</option>
        <option value="closed">Fermé</option>
      </Selecteur>

      <label className="flex h-9 items-center gap-2 px-1 text-[0.85rem] text-encre-doux">
        <input
          type="checkbox"
          name="verifier"
          value="1"
          defaultChecked={valeurs.verifier === '1'}
          className="h-4 w-4"
        />
        À vérifier
      </label>

      <Bouton type="submit" variante="secondaire">
        <Search aria-hidden size={15} strokeWidth={1.75} />
        Filtrer
      </Bouton>

      {filtre ? (
        <Bouton type="button" variante="discret" onClick={() => { window.location.href = '/admin/lieux'; }}>
          <X aria-hidden size={15} strokeWidth={1.75} />
          Réinitialiser
        </Bouton>
      ) : null}
    </form>
  );
}
