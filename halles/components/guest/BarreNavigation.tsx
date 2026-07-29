import { Gift, Home, Info, Map } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { avecLangue, creerTraducteur } from '@/lib/i18n';

/**
 * Navigation basse, fixée sous le pouce.
 *
 * Quatre entrées, pas cinq : au-delà, les cibles passent sous 44 px sur un
 * écran de 360 px. Les itinéraires restent accessibles depuis l'accueil.
 */
export function BarreNavigation({
  base,
  locale,
  actif,
}: {
  base: string;
  locale: Locale;
  actif: 'accueil' | 'carte' | 'avantages' | 'infos';
}) {
  const t = creerTraducteur(locale);

  const entrees = [
    { cle: 'accueil' as const, href: base, Icone: Home, libelle: t('commun.accueil') },
    { cle: 'carte' as const, href: `${base}/carte`, Icone: Map, libelle: t('commun.carte') },
    { cle: 'avantages' as const, href: `${base}/avantages`, Icone: Gift, libelle: t('commun.avantages') },
    { cle: 'infos' as const, href: `${base}/infos`, Icone: Info, libelle: t('commun.infos') },
  ];

  return (
    <nav
      aria-label={t('commun.accueil')}
      className="sticky bottom-0 z-30 border-t border-trait bg-creme/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {entrees.map(({ cle, href, Icone, libelle }) => {
          const estActif = cle === actif;
          return (
            <li key={cle}>
              <a
                href={avecLangue(href, locale)}
                aria-current={estActif ? 'page' : undefined}
                className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 py-2"
                style={{ color: estActif ? 'var(--couleur-hotel-accent)' : undefined }}
              >
                <Icone aria-hidden size={19} strokeWidth={estActif ? 2 : 1.5} />
                <span className="text-[0.68rem] tracking-wide">{libelle}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
