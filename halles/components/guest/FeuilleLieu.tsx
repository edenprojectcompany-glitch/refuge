'use client';

import Image from 'next/image';
import { ArrowRight, Gift, X } from 'lucide-react';
import type { Hotel, LieuDuGuide, Locale } from '@/lib/types';
import { avecLangue, champBilingue, creerTraducteur } from '@/lib/i18n';
import { minutesAPied } from '@/lib/geo';
import { avantagesActifs } from '@/lib/perks';
import { gammePrix } from '@/lib/categories';

/**
 * Feuille du bas ouverte au tap sur un marqueur.
 *
 * Contenu réduit à ce qui décide d'y aller ou non : ce qu'est l'endroit, à
 * quelle distance, et l'avantage éventuel. Le reste est sur la fiche.
 */
export function FeuilleLieu({
  lieu,
  hotel,
  locale,
  base,
  onFermer,
}: {
  lieu: LieuDuGuide;
  hotel: Hotel;
  locale: Locale;
  base: string;
  onFermer: () => void;
}) {
  const t = creerTraducteur(locale);
  const avantage = avantagesActifs(lieu)[0];
  const resume = champBilingue(lieu as unknown as Record<string, unknown>, 'short_desc', locale);
  const prix = gammePrix(lieu.price_range);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-3">
      <div className="relative border border-trait-fort bg-papier px-4 pb-4 pt-3.5 rounded-[4px] shadow-[0_-1px_12px_rgba(26,23,20,0.08)]">
        <button
          type="button"
          onClick={onFermer}
          aria-label={t('commun.fermer')}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-encre-tres-doux"
        >
          <X aria-hidden size={18} strokeWidth={1.75} />
        </button>

        <div className="flex gap-3 pr-10">
          {lieu.photo_url ? (
            <Image
              src={lieu.photo_url}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 object-cover rounded-[3px]"
            />
          ) : null}

          <div className="min-w-0">
            <h2 className="text-[1.15rem] leading-tight">{lieu.name}</h2>
            <p className="mt-0.5 text-[0.78rem] uppercase tracking-[0.1em] text-encre-tres-doux">
              {t(`categories.${lieu.category}`)}
              {prix ? ` · ${prix}` : ''} · {t('lieu.minutesAPied', { n: minutesAPied(hotel, lieu) })}
            </p>
          </div>
        </div>

        {resume ? (
          <p className="mt-2.5 text-[0.9rem] leading-snug text-encre-doux line-clamp-2">{resume}</p>
        ) : null}

        {avantage ? (
          <p
            className="mt-2.5 inline-flex items-center gap-1.5 text-[0.85rem] font-medium"
            style={{ color: 'var(--couleur-hotel-accent)' }}
          >
            <Gift aria-hidden size={15} strokeWidth={1.75} />
            {champBilingue(avantage as unknown as Record<string, unknown>, 'title', locale)}
          </p>
        ) : null}

        <a
          href={avecLangue(`${base}/lieux/${lieu.id}`, locale)}
          className="mt-3 flex min-h-11 items-center justify-center gap-2 border border-trait-fort text-[0.92rem] font-medium rounded-[4px]"
        >
          {t('commun.voirLaFiche')}
          <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}
