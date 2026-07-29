import { Gift } from 'lucide-react';
import type { Hotel, LieuDuGuide, Locale } from '@/lib/types';
import { avecLangue, champBilingue, creerTraducteur } from '@/lib/i18n';
import { minutesAPied } from '@/lib/geo';
import { avantagesActifs } from '@/lib/perks';

/**
 * Les quatre adresses mises en avant par l'hôtelier.
 *
 * Le mot de l'hôtel passe avant la description : c'est lui qui distingue le
 * guide d'une recherche cartographique, et il doit se lire en premier.
 */
export function Incontournables({
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
  if (lieux.length === 0) return null;

  return (
    <section className="px-5 pt-9">
      <h2 className="text-[1.35rem]">{t('accueil.incontournablesTitre')}</h2>
      <p className="mt-1 text-[0.9rem] text-encre-doux">{t('accueil.incontournablesIntro')}</p>

      <ul className="mt-4 space-y-2.5">
        {lieux.map((lieu) => {
          const note = champBilingue(lieu as unknown as Record<string, unknown>, 'hotel_note', locale);
          const resume = champBilingue(lieu as unknown as Record<string, unknown>, 'short_desc', locale);
          const avantages = avantagesActifs(lieu);
          const minutes = minutesAPied(hotel, lieu);

          return (
            <li key={lieu.id}>
              <a
                href={avecLangue(`${base}/lieux/${lieu.id}`, locale)}
                className="block border border-trait bg-papier px-4 py-4 rounded-[4px]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[1.15rem]">{lieu.name}</h3>
                  <span className="shrink-0 text-[0.8rem] text-encre-tres-doux tabular-nums">
                    {t('lieu.minutesAPied', { n: minutes })}
                  </span>
                </div>

                <p className="mt-0.5 text-[0.78rem] uppercase tracking-[0.1em] text-encre-tres-doux">
                  {t(`categories.${lieu.category}`)}
                </p>

                {note ? (
                  <p className="mt-3 border-l-2 pl-3 text-[0.95rem] italic leading-snug"
                     style={{ borderColor: 'var(--couleur-hotel-accent)' }}>
                    {note}
                  </p>
                ) : resume ? (
                  <p className="mt-3 text-[0.95rem] text-encre-doux leading-snug">{resume}</p>
                ) : null}

                {avantages.length > 0 ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[0.85rem] font-medium"
                     style={{ color: 'var(--couleur-hotel-accent)' }}>
                    <Gift aria-hidden size={15} strokeWidth={1.75} />
                    {champBilingue(avantages[0] as unknown as Record<string, unknown>, 'title', locale)}
                  </p>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
