import { ArrowRight, Footprints } from 'lucide-react';
import type { Itineraire, Locale } from '@/lib/types';
import { avecLangue, champBilingue, creerTraducteur } from '@/lib/i18n';
import { formaterDuree } from '@/lib/itineraires';

/**
 * Les parcours prêts à suivre, sur l'accueil.
 *
 * Répond à la question posée à la réception dix fois par jour : « on a une
 * demi-journée, on fait quoi ? »
 */
export function Itineraires({
  itineraires,
  locale,
  base,
}: {
  itineraires: Itineraire[];
  locale: Locale;
  base: string;
}) {
  const t = creerTraducteur(locale);
  if (itineraires.length === 0) return null;

  return (
    <section className="px-5 pt-9">
      <h2 className="text-[1.35rem]">{t('accueil.itinerairesTitre')}</h2>
      <p className="mt-1 text-[0.9rem] text-encre-doux">{t('accueil.itinerairesIntro')}</p>

      <ul className="mt-4 space-y-2.5">
        {itineraires.map((itineraire) => {
          const titre = champBilingue(
            itineraire as unknown as Record<string, unknown>,
            'title',
            locale,
          );
          const description = champBilingue(
            itineraire as unknown as Record<string, unknown>,
            'description',
            locale,
          );

          return (
            <li key={itineraire.id}>
              <a
                href={avecLangue(`${base}/itineraires/${itineraire.id}`, locale)}
                className="block border border-trait bg-papier px-4 py-4 rounded-[4px]"
              >
                <h3 className="text-[1.15rem] leading-snug">{titre}</h3>

                {itineraire.duration_minutes ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[0.8rem] text-encre-tres-doux">
                    <Footprints aria-hidden size={14} strokeWidth={1.75} />
                    {formaterDuree(itineraire.duration_minutes, locale)}
                  </p>
                ) : null}

                {description ? (
                  <p className="mt-2 text-[0.92rem] leading-snug text-encre-doux">{description}</p>
                ) : null}

                <span
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-[0.88rem] font-medium"
                  style={{ color: 'var(--couleur-hotel-accent)' }}
                >
                  {t('commun.voirLaFiche')}
                  <ArrowRight aria-hidden size={15} strokeWidth={1.75} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
