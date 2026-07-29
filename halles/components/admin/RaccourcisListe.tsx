'use client';

import { useEffect } from 'react';

/**
 * Raccourcis clavier des écrans de liste.
 *
 *   /  place le curseur dans la recherche
 *   n  ouvre le formulaire de création
 *
 * Inactifs dès qu'un champ a le focus : sinon taper « n » dans un formulaire
 * ferait quitter la page.
 */
export function RaccourcisListe({ hrefNouveau }: { hrefNouveau: string }) {
  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      const cible = evenement.target as HTMLElement | null;
      const dansUnChamp =
        cible instanceof HTMLInputElement ||
        cible instanceof HTMLTextAreaElement ||
        cible instanceof HTMLSelectElement ||
        cible?.isContentEditable;

      if (dansUnChamp || evenement.metaKey || evenement.ctrlKey || evenement.altKey) return;

      if (evenement.key === '/') {
        const recherche = document.getElementById('recherche');
        if (recherche instanceof HTMLInputElement) {
          evenement.preventDefault();
          recherche.focus();
          recherche.select();
        }
        return;
      }

      if (evenement.key === 'n') {
        evenement.preventDefault();
        window.location.href = hrefNouveau;
      }
    }

    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [hrefNouveau]);

  return (
    <p className="text-[0.78rem] text-encre-tres-doux">
      Raccourcis : <kbd className="font-mono">/</kbd> rechercher · <kbd className="font-mono">n</kbd>{' '}
      nouveau
    </p>
  );
}
