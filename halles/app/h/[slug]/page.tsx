import { notFound } from 'next/navigation';
import { chargerGuide } from '@/lib/data/guide';
import { resoudreLocale } from '@/lib/i18n';
import { compterEtablissementsAvecAvantage } from '@/lib/perks';
import type { CategorieLieu } from '@/lib/types';
import { EnTeteHotel } from '@/components/guest/EnTeteHotel';
import { BandeauAvantages } from '@/components/guest/BandeauAvantages';
import { GrilleCategories } from '@/components/guest/GrilleCategories';
import { Incontournables } from '@/components/guest/Incontournables';
import { InfosPratiques } from '@/components/guest/InfosPratiques';
import { MemoireLangue } from '@/components/guest/MemoireLangue';

/**
 * Accueil du guide.
 *
 * Entièrement rendu côté serveur, données pré-chargées : à l'ouverture, aucun
 * indicateur de chargement, aucune requête depuis le navigateur. C'est la seule
 * façon de tenir le budget LCP sur le wifi d'un hôtel.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

/** Ordre d'affichage des catégories : ce qu'on cherche en premier en arrivant. */
const ORDRE_CATEGORIES: CategorieLieu[] = [
  'restaurant',
  'bar',
  'cafe',
  'boulangerie',
  'brunch',
  'culture',
  'shopping',
  'balade',
  'nuit',
  'pratique',
];

export default async function PageAccueil({ params, searchParams }: Props) {
  const [{ slug }, requete] = await Promise.all([params, searchParams]);

  const guide = await chargerGuide(slug);
  if (!guide) notFound();

  const { hotel, lieux } = guide;
  const locale = resoudreLocale(requete.lang, hotel.default_locale);

  const nombreEtablissements = compterEtablissementsAvecAvantage(lieux);

  const comptes = ORDRE_CATEGORIES.map((categorie) => ({
    categorie,
    total: lieux.filter((lieu) => lieu.category === categorie).length,
  })).filter(({ total }) => total > 0);

  const incontournables = lieux.filter((lieu) => lieu.is_featured).slice(0, 4);

  /*
   * Tous les liens internes sont préfixés par /h/{slug}. C'est correct sur le
   * sous-domaine comme en mode chemin, alors qu'un lien relatif se résoudrait
   * mal en mode chemin. Le prix à payer est une URL moins jolie sur le
   * sous-domaine ; la contrepartie est un rendu qui reste statique.
   */
  const base = `/h/${slug}`;

  return (
    /* `lang` sur le contenu et non sur <html> : le layout racine ne connaît pas
       la langue demandée, qui vit dans les paramètres d'URL de la page. */
    <main lang={locale}>
      <EnTeteHotel hotel={hotel} locale={locale} cheminCourant={base} />
      <BandeauAvantages nombreEtablissements={nombreEtablissements} locale={locale} base={base} />
      <GrilleCategories comptes={comptes} locale={locale} base={base} />
      <Incontournables lieux={incontournables} hotel={hotel} locale={locale} base={base} />
      <InfosPratiques hotel={hotel} locale={locale} base={base} />

      <MemoireLangue localeServie={locale} langueExplicite={requete.lang !== undefined} />
    </main>
  );
}
