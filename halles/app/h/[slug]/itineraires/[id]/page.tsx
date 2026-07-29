import { notFound } from 'next/navigation';
import { ArrowRight, Footprints } from 'lucide-react';
import { chargerGuide, chargerItineraire } from '@/lib/data/guide';
import { avecLangue, champBilingue, creerTraducteur, resoudreLocale } from '@/lib/i18n';
import { dureeItineraire, formaterDuree, resoudreEtapes } from '@/lib/itineraires';
import { COULEURS_CATEGORIES } from '@/lib/categories';
import { EnTeteEcran } from '@/components/guest/EnTeteEcran';
import { BarreNavigation } from '@/components/guest/BarreNavigation';
import { MiniCarte } from '@/components/guest/MiniCarte';
import { SuiviEcran } from '@/components/guest/SuiviEcran';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function PageItineraire({ params, searchParams }: Props) {
  const [{ slug, id }, requete] = await Promise.all([params, searchParams]);

  const [guide, itineraire] = await Promise.all([chargerGuide(slug), chargerItineraire(slug, id)]);
  if (!guide || !itineraire) notFound();

  const { hotel, lieux } = guide;
  const locale = resoudreLocale(requete.lang, hotel.default_locale);
  const t = creerTraducteur(locale);
  const base = `/h/${slug}`;

  const etapes = resoudreEtapes(itineraire, lieux, locale, hotel);
  if (etapes.length === 0) notFound();

  const duree = dureeItineraire(itineraire, etapes);
  const titre =
    champBilingue(itineraire as unknown as Record<string, unknown>, 'title', locale) ?? '';
  const description = champBilingue(
    itineraire as unknown as Record<string, unknown>,
    'description',
    locale,
  );

  return (
    <div lang={locale} className="flex min-h-dvh flex-col">
      <EnTeteEcran titre={t('itineraires.titre')} retourHref={base} locale={locale} compact />

      <main className="flex-1">
        <section className="px-5 pt-5">
          <h2 className="text-[1.85rem] leading-tight">{titre}</h2>
          {duree ? (
            <p className="mt-2 flex items-center gap-1.5 text-[0.85rem] text-encre-doux">
              <Footprints aria-hidden size={15} strokeWidth={1.75} />
              {formaterDuree(duree, locale)} · {etapes.length} {locale === 'fr' ? 'étapes' : 'stops'}
            </p>
          ) : null}
          {description ? (
            <p className="mt-3 text-[1rem] leading-relaxed text-encre-doux">{description}</p>
          ) : null}
        </section>

        <section className="mt-5">
          <MiniCarte
            hotel={hotel}
            points={etapes.map(({ lieu, ordre }) => ({
              lat: lieu.lat,
              lng: lieu.lng,
              couleur: COULEURS_CATEGORIES[lieu.category],
              ordre,
              nom: lieu.name,
            }))}
            locale={locale}
          />
        </section>

        <ol className="px-5 pt-6">
          {etapes.map(({ ordre, lieu, note, minutesDepuisPrecedente }) => (
            <li key={lieu.id} className="relative pl-9 pb-6 last:pb-2">
              {/* Filet vertical entre les pastilles numérotées */}
              <span
                aria-hidden
                className="absolute left-[13px] top-7 bottom-0 w-px bg-trait last:hidden"
              />
              <span
                aria-hidden
                className="absolute left-0 top-0 flex h-[27px] w-[27px] items-center justify-center rounded-full text-[0.8rem] font-medium tabular-nums"
                style={{ backgroundColor: 'var(--couleur-hotel)', color: 'var(--couleur-hotel-texte)' }}
              >
                {ordre}
              </span>

              {minutesDepuisPrecedente !== null ? (
                <p className="mb-1.5 text-[0.78rem] text-encre-tres-doux">
                  {ordre === 1 ? `${t('itineraires.depuisHotel')} · ` : ''}
                  {t('itineraires.minutesDeMarche', { n: minutesDepuisPrecedente })}
                </p>
              ) : null}

              <a href={avecLangue(`${base}/lieux/${lieu.id}`, locale)} className="block">
                <h3 className="text-[1.15rem]">{lieu.name}</h3>
                <p className="mt-0.5 text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
                  {t(`categories.${lieu.category}`)}
                </p>
                {note ? (
                  <p className="mt-2 text-[0.95rem] leading-snug text-encre-doux">{note}</p>
                ) : null}
                <span
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[0.85rem] font-medium"
                  style={{ color: 'var(--couleur-hotel-accent)' }}
                >
                  {t('commun.voirLaFiche')}
                  <ArrowRight aria-hidden size={14} strokeWidth={1.75} />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </main>

      <BarreNavigation base={base} locale={locale} actif="accueil" />
      <SuiviEcran hotelId={hotel.id} locale={locale} evenement="itinerary_view" />
    </div>
  );
}
