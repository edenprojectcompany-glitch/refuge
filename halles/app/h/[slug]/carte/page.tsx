import { notFound } from 'next/navigation';
import { chargerGuide } from '@/lib/data/guide';
import { resoudreLocale } from '@/lib/i18n';
import { estCategorie } from '@/lib/categories';
import { EnTeteEcran } from '@/components/guest/EnTeteEcran';
import { BarreNavigation } from '@/components/guest/BarreNavigation';
import { VueCarte } from '@/components/guest/VueCarte';
import { ListeLieux } from '@/components/guest/ListeLieux';
import { SuiviEcran } from '@/components/guest/SuiviEcran';
import { creerTraducteur } from '@/lib/i18n';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[]; categorie?: string | string[] }>;
}

export default async function PageCarte({ params, searchParams }: Props) {
  const [{ slug }, requete] = await Promise.all([params, searchParams]);

  const guide = await chargerGuide(slug);
  if (!guide) notFound();

  const { hotel, lieux } = guide;
  const locale = resoudreLocale(requete.lang, hotel.default_locale);
  const t = creerTraducteur(locale);
  const base = `/h/${slug}`;

  const parametreCategorie = Array.isArray(requete.categorie)
    ? requete.categorie[0]
    : requete.categorie;
  const categorie = estCategorie(parametreCategorie) ? parametreCategorie : null;

  return (
    <div lang={locale} className="flex h-dvh flex-col">
      <EnTeteEcran titre={t('carte.titre')} retourHref={base} locale={locale} compact />

      {/* Le repère principal manquait : sur cet écran, tout est dans VueCarte. */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <VueCarte
          hotel={hotel}
          lieux={lieux}
          locale={locale}
          base={base}
          categorieInitiale={categorie}
        >
          <ListeLieux lieux={lieux} hotel={hotel} locale={locale} base={base} />
        </VueCarte>
      </main>

      <BarreNavigation base={base} locale={locale} actif="carte" />
      <SuiviEcran hotelId={hotel.id} locale={locale} />
    </div>
  );
}
