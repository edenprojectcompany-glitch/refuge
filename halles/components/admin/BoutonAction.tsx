'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { Bouton, type ProprietesBouton } from '@/components/ui/Bouton';
import type { Retour } from '@/lib/admin/actions';

/**
 * Bouton qui appelle une action serveur avec des champs figés.
 *
 * Sert aux gestes unitaires des tables (marquer vérifié, publier). L'erreur
 * s'affiche à côté du bouton : dans une table dense, une alerte globale ne dit
 * pas quelle ligne a échoué.
 */
export function BoutonAction({
  action,
  champs,
  libelle,
  libelleEnCours,
  icone,
  ...reste
}: {
  action: (donnees: FormData) => Promise<Retour>;
  champs: Record<string, string>;
  libelle: string;
  libelleEnCours?: string;
  icone?: 'check';
} & Omit<ProprietesBouton, 'onClick' | 'children'>) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {erreur ? <span className="text-[0.78rem] text-[#8a3d2c]">{erreur}</span> : null}
      <Bouton
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            const donnees = new FormData();
            Object.entries(champs).forEach(([cle, valeur]) => donnees.set(cle, valeur));
            const retour = await action(donnees);
            if (!retour.ok) setErreur(retour.message ?? 'Échec');
          })
        }
        {...reste}
      >
        {icone === 'check' ? <Check aria-hidden size={13} strokeWidth={2} /> : null}
        {enCours ? (libelleEnCours ?? libelle) : libelle}
      </Bouton>
    </span>
  );
}
