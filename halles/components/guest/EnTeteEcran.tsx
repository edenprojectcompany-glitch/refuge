import { ChevronLeft } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { avecLangue } from '@/lib/i18n';

/**
 * En-tête des écrans internes : retour et titre, sur la couleur de l'hôtel.
 * Le retour est un lien et non `history.back()` — un guide s'ouvre souvent
 * directement sur une fiche, depuis un lien partagé, sans historique derrière.
 */
export function EnTeteEcran({
  titre,
  retourHref,
  locale,
  compact = false,
}: {
  titre: string;
  retourHref: string;
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <header
      className={`px-3 pt-[max(0.5rem,env(safe-area-inset-top))] ${compact ? 'pb-2' : 'pb-4'}`}
      style={{ backgroundColor: 'var(--couleur-hotel)', color: 'var(--couleur-hotel-texte)' }}
    >
      <div className="flex items-center gap-1">
        <a
          href={avecLangue(retourHref, locale)}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label={locale === 'fr' ? 'Retour' : 'Back'}
        >
          <ChevronLeft aria-hidden size={22} strokeWidth={1.75} />
        </a>
        <h1 className={`min-w-0 truncate ${compact ? 'text-[1.15rem]' : 'text-[1.4rem]'}`}>
          {titre}
        </h1>
      </div>
    </header>
  );
}
