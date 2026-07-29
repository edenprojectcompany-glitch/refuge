'use client';

import { useState, useTransition } from 'react';
import { changerStatut } from '@/lib/admin/actions';
import { Selecteur } from '@/components/ui/Champ';
import type { StatutContenu } from '@/lib/types';

/**
 * Changement de statut directement dans la table.
 *
 * Publier ou dépublier est le geste le plus fréquent du back-office : l'imposer
 * par un aller-retour dans un formulaire coûterait deux clics et un
 * rechargement à chaque fois.
 */
export function StatutInline({
  table,
  id,
  statut,
}: {
  table: 'hotels' | 'places' | 'perks' | 'itineraries';
  id: string;
  statut: StatutContenu;
}) {
  const [enCours, demarrer] = useTransition();
  const [valeur, setValeur] = useState<StatutContenu>(statut);
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col gap-0.5">
      <Selecteur
        aria-label="Statut"
        value={valeur}
        disabled={enCours}
        className="h-7 w-auto py-0 text-[0.8rem]"
        onChange={(evenement) => {
          const suivant = evenement.target.value as StatutContenu;
          const precedent = valeur;
          setValeur(suivant);
          setErreur(null);

          demarrer(async () => {
            const donnees = new FormData();
            donnees.set('table', table);
            donnees.set('id', id);
            donnees.set('status', suivant);
            const retour = await changerStatut(donnees);
            if (!retour.ok) {
              // On remet la valeur affichée en cohérence avec la base.
              setValeur(precedent);
              setErreur(retour.message ?? 'Échec');
            }
          });
        }}
      >
        <option value="draft">Brouillon</option>
        <option value="published">Publié</option>
        <option value="archived">Archivé</option>
        <option value="closed">Fermé</option>
      </Selecteur>
      {erreur ? <span className="text-[0.72rem] text-[#8a3d2c]">{erreur}</span> : null}
    </span>
  );
}
