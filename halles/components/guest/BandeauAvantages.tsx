import { ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { avecLangue, cleAvecPluriel, creerTraducteur } from '@/lib/i18n';

/**
 * Premier élément visible du guide, avant la carte et avant les catégories.
 *
 * C'est la promesse commerciale du produit : ce que le voyageur obtient ici et
 * nulle part ailleurs. Il ne descend jamais dans la page.
 */
export function BandeauAvantages({
  nombreEtablissements,
  locale,
  base,
}: {
  nombreEtablissements: number;
  locale: Locale;
  base: string;
}) {
  const t = creerTraducteur(locale);

  return (
    <section className="px-5 pt-6">
      <a
        href={avecLangue(`${base}/avantages`, locale)}
        className="block border border-trait-fort bg-papier px-5 py-5 rounded-[4px]"
      >
        <p className="font-titre text-[1.55rem] leading-[1.15]">{t('accueil.bandeauTitre')}</p>
        <p className="mt-1.5 text-[0.95rem] text-encre-doux">
          {t(cleAvecPluriel('accueil.bandeauSousTitre', nombreEtablissements), {
            n: nombreEtablissements,
          })}
        </p>
        <span
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-medium"
          style={{ color: 'var(--couleur-hotel-accent)' }}
        >
          {t('accueil.voirLesAvantages')}
          <ArrowRight aria-hidden size={17} strokeWidth={1.75} />
        </span>
      </a>
    </section>
  );
}
