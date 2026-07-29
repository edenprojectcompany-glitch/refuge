import { Gift } from 'lucide-react';
import type { Hotel, LieuDuGuide, Locale } from '@/lib/types';
import { avecLangue, champBilingue, creerTraducteur } from '@/lib/i18n';
import { minutesAPied } from '@/lib/geo';
import { avantagesActifs } from '@/lib/perks';
import { COULEURS_CATEGORIES, gammePrix } from '@/lib/categories';

/**
 * Liste des adresses, rendue côté serveur.
 *
 * `data-lieu-categorie` permet à l'écran carte de filtrer en CSS sans
 * reconstruire la liste côté client.
 */
export function ListeLieux({
  lieux,
  hotel,
  locale,
  base,
}: {
  lieux: LieuDuGuide[];
  hotel: Hotel;
  locale: Locale;
  base: string;
}) {
  const t = creerTraducteur(locale);

  return (
    <ul className="divide-y divide-trait">
      {lieux.map((lieu) => {
        const avantage = avantagesActifs(lieu)[0];
        const resume = champBilingue(lieu as unknown as Record<string, unknown>, 'short_desc', locale);
        const prix = gammePrix(lieu.price_range);

        return (
          <li key={lieu.id} data-lieu-categorie={lieu.category}>
            <a
              href={avecLangue(`${base}/lieux/${lieu.id}`, locale)}
              className="flex gap-3 bg-papier px-5 py-4"
            >
              <span
                aria-hidden
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COULEURS_CATEGORIES[lieu.category] }}
              />

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[1.05rem] font-medium">{lieu.name}</span>
                  <span className="shrink-0 text-[0.8rem] text-encre-tres-doux tabular-nums">
                    {t('lieu.minutesAPied', { n: minutesAPied(hotel, lieu) })}
                  </span>
                </span>

                <span className="mt-0.5 block text-[0.75rem] uppercase tracking-[0.1em] text-encre-tres-doux">
                  {t(`categories.${lieu.category}`)}
                  {prix ? ` · ${prix}` : ''}
                </span>

                {resume ? (
                  <span className="mt-1.5 block text-[0.9rem] leading-snug text-encre-doux">
                    {resume}
                  </span>
                ) : null}

                {avantage ? (
                  <span
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[0.82rem] font-medium"
                    style={{ color: 'var(--couleur-hotel-accent)' }}
                  >
                    <Gift aria-hidden size={14} strokeWidth={1.75} />
                    {champBilingue(avantage as unknown as Record<string, unknown>, 'title', locale)}
                  </span>
                ) : null}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
