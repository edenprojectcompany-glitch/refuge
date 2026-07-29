'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Copie du mot de passe wifi.
 *
 * Seul composant client de la page d'accueil, et volontairement placé sous la
 * ligne de flottaison : taper à la main une clé WPA sur un téléphone est la
 * première friction d'un séjour.
 */
export function BoutonCopier({
  valeur,
  libelle,
  libelleCopie,
}: {
  valeur: string;
  libelle: string;
  libelleCopie: string;
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(valeur);
    } catch {
      // Navigateur sans presse-papiers (ou permission refusée) : on ne casse
      // rien, le mot de passe reste affiché en clair juste à côté.
      return;
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copier}
      className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[0.85rem] font-medium"
      style={{ color: 'var(--couleur-hotel-accent)' }}
    >
      {copie ? <Check aria-hidden size={15} strokeWidth={2} /> : <Copy aria-hidden size={15} strokeWidth={1.75} />}
      {copie ? libelleCopie : libelle}
    </button>
  );
}
