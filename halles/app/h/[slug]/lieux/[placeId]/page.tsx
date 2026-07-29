import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, AtSign, Gift } from 'lucide-react';
import { chargerGuide } from '@/lib/data/guide';
import { avecLangue, champBilingue, creerTraducteur, resoudreLocale } from '@/lib/i18n';
import { formaterDistance, distanceAPied, minutesAPied } from '@/lib/geo';
import { avantagesActifs } from '@/lib/perks';
import { gammePrix } from '@/lib/categories';
import { semaineLisible } from '@/lib/horaires';
import { EnTeteEcran } from '@/components/guest/EnTeteEcran';
import { BarreNavigation } from '@/components/guest/BarreNavigation';
import { EtatOuvert } from '@/components/guest/EtatOuvert';
import { BoutonsSortants } from '@/components/guest/BoutonsSortants';
import { SuiviEcran } from '@/components/guest/SuiviEcran';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; placeId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function PageLieu({ params, searchParams }: Props) {
  const [{ slug, placeId }, requete] = await Promise.all([params, searchParams]);

  const guide = await chargerGuide(slug);
  if (!guide) notFound();

  const { hotel, lieux } = guide;
  // Le lieu doit appartenir à CE guide : une fiche d'un autre hôtel n'a rien à
  // faire ici, même si elle est publiée.
  const lieu = lieux.find((candidat) => candidat.id === placeId);
  if (!lieu) notFound();

  const locale = resoudreLocale(requete.lang, hotel.default_locale);
  const t = creerTraducteur(locale);
  const base = `/h/${slug}`;

  const note = champBilingue(lieu as unknown as Record<string, unknown>, 'hotel_note', locale);
  const description =
    champBilingue(lieu as unknown as Record<string, unknown>, 'long_desc', locale) ??
    champBilingue(lieu as unknown as Record<string, unknown>, 'short_desc', locale);
  const avantage = avantagesActifs(lieu)[0];
  const prix = gammePrix(lieu.price_range);
  const horaires = semaineLisible(lieu.opening_hours, locale);

  return (
    <div lang={locale} className="flex min-h-dvh flex-col">
      <EnTeteEcran titre={lieu.name} retourHref={`${base}/carte`} locale={locale} compact />

      <main className="flex-1">
        {lieu.photo_url ? (
          <Image
            src={lieu.photo_url}
            alt=""
            width={780}
            height={440}
            priority
            className="h-52 w-full object-cover"
          />
        ) : null}

        <section className="px-5 pt-5">
          <h2 className="text-[1.75rem] leading-tight">{lieu.name}</h2>

          <p className="mt-1.5 text-[0.78rem] uppercase tracking-[0.1em] text-encre-tres-doux">
            {t(`categories.${lieu.category}`)}
            {prix ? ` · ${prix}` : ''}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <EtatOuvert horaires={lieu.opening_hours} locale={locale} />
            <span className="text-[0.85rem] text-encre-doux">
              {t('lieu.minutesAPied', { n: minutesAPied(hotel, lieu) })} ·{' '}
              {formaterDistance(distanceAPied(hotel, lieu), locale)}
            </span>
          </div>

          {lieu.tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {lieu.tags.map((tag) => (
                <li
                  key={tag}
                  className="border border-trait px-2 py-0.5 text-[0.75rem] text-encre-doux rounded-full"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Le mot de l'hôtel passe avant la description : c'est lui qui
            distingue le guide d'une fiche cartographique. */}
        {note ? (
          <section className="px-5 pt-6">
            <div
              className="border-l-2 bg-papier px-4 py-4"
              style={{ borderColor: 'var(--couleur-hotel-accent)' }}
            >
              <p className="text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
                {t('lieu.leMotDeLHotel')}
              </p>
              <p className="mt-2 text-[1rem] italic leading-relaxed">{note}</p>
            </div>
          </section>
        ) : null}

        {avantage ? (
          <section className="px-5 pt-6">
            <a
              href={avecLangue(`${base}/avantages/${avantage.id}`, locale)}
              className="block border border-trait-fort bg-papier px-4 py-4 rounded-[4px]"
            >
              <p
                className="inline-flex items-center gap-1.5 text-[0.72rem] uppercase tracking-[0.14em]"
                style={{ color: 'var(--couleur-hotel-accent)' }}
              >
                <Gift aria-hidden size={14} strokeWidth={1.75} />
                {t('lieu.avantage')}
              </p>
              <p className="mt-2 font-titre text-[1.3rem] leading-snug">
                {champBilingue(avantage as unknown as Record<string, unknown>, 'title', locale)}
              </p>
              <span
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-[0.92rem] font-medium"
                style={{ color: 'var(--couleur-hotel-accent)' }}
              >
                {t('lieu.voirAvantage')}
                <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
              </span>
            </a>
          </section>
        ) : null}

        {description ? (
          <section className="px-5 pt-7">
            <h3 className="font-texte text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
              {t('lieu.aPropos')}
            </h3>
            <p className="mt-2.5 text-[1rem] leading-relaxed text-encre-doux">{description}</p>
          </section>
        ) : null}

        <section className="px-5 pt-7">
          <BoutonsSortants lieu={lieu} hotelId={hotel.id} locale={locale} />

          {lieu.instagram ? (
            <a
              href={`https://instagram.com/${lieu.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex min-h-11 items-center justify-center gap-2 text-[0.88rem] text-encre-doux"
            >
              <AtSign aria-hidden size={15} strokeWidth={1.75} />
              @{lieu.instagram.replace('@', '')}
            </a>
          ) : null}
        </section>

        {horaires.length > 0 ? (
          <section className="px-5 pt-7">
            <h3 className="font-texte text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
              {t('lieu.horaires')}
            </h3>
            <dl className="mt-2.5 border border-trait bg-papier divide-y divide-trait rounded-[4px]">
              {horaires.map(({ jour, libelle, creneaux }) => (
                <div key={jour} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[0.9rem]">{libelle}</dt>
                  <dd className="text-[0.9rem] tabular-nums text-encre-doux">
                    {creneaux === null ? '—' : creneaux === '' ? t('lieu.ferme_jour') : creneaux}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="px-5 py-7">
          <h3 className="font-texte text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
            {t('infos.adresse')}
          </h3>
          <p className="mt-2 text-[0.95rem] text-encre-doux">{lieu.address}</p>
        </section>
      </main>

      <BarreNavigation base={base} locale={locale} actif="carte" />
      <SuiviEcran hotelId={hotel.id} locale={locale} evenement="place_view" placeId={lieu.id} />
    </div>
  );
}
