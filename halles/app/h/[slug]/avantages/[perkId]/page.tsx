import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { chargerGuide } from '@/lib/data/guide';
import { avecLangue, champBilingue, creerTraducteur, resoudreLocale } from '@/lib/i18n';
import { avantageActif } from '@/lib/perks';
import { EnTeteEcran } from '@/components/guest/EnTeteEcran';
import { DateVivante } from '@/components/guest/DateVivante';
import { SuiviEcran } from '@/components/guest/SuiviEcran';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; perkId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

/**
 * L'écran que le client montre au commerçant.
 *
 * Tout est dimensionné pour être lu à bout de bras, à travers un comptoir :
 * le nom de l'hôtel en grand, l'avantage en grand, les conditions en clair.
 * Aucun code, aucun scan — la friction ferait chuter l'usage, et l'usage est
 * ce que l'hôtelier achète.
 */
export default async function PageAvantage({ params, searchParams }: Props) {
  const [{ slug, perkId }, requete] = await Promise.all([params, searchParams]);

  const guide = await chargerGuide(slug);
  if (!guide) notFound();

  const { hotel, lieux } = guide;

  // L'avantage doit appartenir à un lieu de CE guide.
  const lieu = lieux.find((candidat) =>
    candidat.avantages.some((avantage) => avantage.id === perkId),
  );
  const avantage = lieu?.avantages.find((candidat) => candidat.id === perkId);
  if (!lieu || !avantage) notFound();

  const locale = resoudreLocale(requete.lang, hotel.default_locale);
  const t = creerTraducteur(locale);
  const base = `/h/${slug}`;

  const actif = avantageActif(avantage);
  const titre = champBilingue(avantage as unknown as Record<string, unknown>, 'title', locale);
  const description = champBilingue(
    avantage as unknown as Record<string, unknown>,
    'description',
    locale,
  );
  const conditions = champBilingue(
    avantage as unknown as Record<string, unknown>,
    'conditions',
    locale,
  );

  const finValidite = avantage.valid_until
    ? new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${avantage.valid_until}T12:00:00Z`))
    : null;

  return (
    <div lang={locale} className="flex min-h-dvh flex-col">
      <EnTeteEcran titre={t('avantages.titre')} retourHref={`${base}/avantages`} locale={locale} compact />

      <main className="flex-1">
        {/* Identification de l'hôtel : c'est ce que le commerçant vérifie. */}
        <section
          className="flex flex-col items-center px-5 py-6 text-center"
          style={{ backgroundColor: 'var(--couleur-hotel)', color: 'var(--couleur-hotel-texte)' }}
        >
          {hotel.logo_url ? (
            <Image
              src={hotel.logo_url}
              alt=""
              width={72}
              height={72}
              priority
              className="mb-3 h-18 w-18 rounded-[3px] object-cover bg-white/10"
            />
          ) : null}
          <p className="text-[0.7rem] uppercase tracking-[0.16em] opacity-75">
            {t('avantages.clientDe')}
          </p>
          <p className="mt-1 font-titre text-[2rem] leading-tight">{hotel.name}</p>
        </section>

        <DateVivante locale={locale} />

        <section className="px-6 pt-8 text-center">
          <p className="text-[0.75rem] uppercase tracking-[0.16em] text-encre-tres-doux">
            {lieu.name}
          </p>
          <h2 className="mt-3 text-[2.1rem] leading-[1.1]">{titre}</h2>
          {description ? (
            <p className="mt-4 text-[1.05rem] leading-relaxed text-encre-doux">{description}</p>
          ) : null}
        </section>

        {!actif ? (
          <p className="mx-5 mt-6 border border-[#a2472f] px-4 py-3 text-center text-[0.95rem] text-[#8a3d2c] rounded-[4px]">
            {t('avantages.expire')}
          </p>
        ) : null}

        {conditions ? (
          <section className="px-5 pt-8">
            <h3 className="font-texte text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
              {t('avantages.conditions')}
            </h3>
            <p className="mt-2.5 border border-trait bg-papier px-4 py-3.5 text-[0.95rem] leading-relaxed rounded-[4px]">
              {conditions}
            </p>
          </section>
        ) : null}

        <p className="px-5 pt-4 text-center text-[0.82rem] text-encre-tres-doux">
          {finValidite ? t('avantages.valableJusqua', { d: finValidite }) : t('avantages.sansLimite')}
        </p>

        <section className="px-5 py-8">
          <a
            href={avecLangue(`${base}/lieux/${lieu.id}`, locale)}
            className="flex min-h-12 items-center justify-center gap-2 border border-trait-fort text-[0.92rem] font-medium rounded-[4px]"
          >
            {t('avantages.voirLeLieu')}
            <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
          </a>
        </section>
      </main>

      <SuiviEcran
        hotelId={hotel.id}
        locale={locale}
        evenement="perk_open"
        placeId={lieu.id}
        perkId={avantage.id}
      />
    </div>
  );
}
