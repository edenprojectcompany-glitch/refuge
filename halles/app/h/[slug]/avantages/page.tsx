import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { chargerGuide } from '@/lib/data/guide';
import { avecLangue, champBilingue, creerTraducteur, resoudreLocale } from '@/lib/i18n';
import { avantagesActifs } from '@/lib/perks';
import { minutesAPied } from '@/lib/geo';
import { COULEURS_CATEGORIES, ORDRE_CATEGORIES } from '@/lib/categories';
import { EnTeteEcran } from '@/components/guest/EnTeteEcran';
import { BarreNavigation } from '@/components/guest/BarreNavigation';
import { SuiviEcran } from '@/components/guest/SuiviEcran';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function PageAvantages({ params, searchParams }: Props) {
  const [{ slug }, requete] = await Promise.all([params, searchParams]);

  const guide = await chargerGuide(slug);
  if (!guide) notFound();

  const { hotel, lieux } = guide;
  const locale = resoudreLocale(requete.lang, hotel.default_locale);
  const t = creerTraducteur(locale);
  const base = `/h/${slug}`;

  // Un lieu peut porter plusieurs avantages : on aplatit en couples
  // (lieu, avantage), puis on regroupe par catégorie d'établissement.
  const couples = lieux.flatMap((lieu) =>
    avantagesActifs(lieu).map((avantage) => ({ lieu, avantage })),
  );

  const groupes = ORDRE_CATEGORIES.map((categorie) => ({
    categorie,
    entrees: couples.filter(({ lieu }) => lieu.category === categorie),
  })).filter(({ entrees }) => entrees.length > 0);

  return (
    <div lang={locale} className="flex min-h-dvh flex-col">
      <EnTeteEcran titre={t('avantages.titre')} retourHref={base} locale={locale} />

      <main className="flex-1">
        <p className="px-5 pt-5 text-[0.95rem] leading-relaxed text-encre-doux">
          {t('avantages.intro')}
        </p>

        {groupes.length === 0 ? (
          <p className="px-5 py-10 text-center text-[0.95rem] text-encre-doux">
            {t('avantages.aucun')}
          </p>
        ) : null}

        {groupes.map(({ categorie, entrees }) => (
          <section key={categorie} className="px-5 pt-7">
            <h2 className="flex items-center gap-2 font-texte text-[0.75rem] uppercase tracking-[0.14em] text-encre-tres-doux">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COULEURS_CATEGORIES[categorie] }}
              />
              {t(`categories.${categorie}`)}
            </h2>

            <ul className="mt-3 space-y-2.5">
              {entrees.map(({ lieu, avantage }) => (
                <li key={avantage.id}>
                  <a
                    href={avecLangue(`${base}/avantages/${avantage.id}`, locale)}
                    className="block border border-trait bg-papier px-4 py-4 rounded-[4px]"
                  >
                    <p className="font-titre text-[1.25rem] leading-snug">
                      {champBilingue(avantage as unknown as Record<string, unknown>, 'title', locale)}
                    </p>
                    <p className="mt-1 flex items-baseline justify-between gap-3 text-[0.9rem] text-encre-doux">
                      <span>{lieu.name}</span>
                      <span className="shrink-0 text-[0.8rem] text-encre-tres-doux tabular-nums">
                        {t('lieu.minutesAPied', { n: minutesAPied(hotel, lieu) })}
                      </span>
                    </p>
                    <span
                      className="mt-3 inline-flex min-h-11 items-center gap-2 text-[0.88rem] font-medium"
                      style={{ color: 'var(--couleur-hotel-accent)' }}
                    >
                      {t('avantages.presentation')}
                      <ArrowRight aria-hidden size={15} strokeWidth={1.75} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="h-8" />
      </main>

      <BarreNavigation base={base} locale={locale} actif="avantages" />
      <SuiviEcran hotelId={hotel.id} locale={locale} />
    </div>
  );
}
