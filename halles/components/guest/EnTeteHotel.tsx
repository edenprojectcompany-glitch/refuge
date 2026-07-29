import Image from 'next/image';
import type { Hotel, Locale } from '@/lib/types';
import { LOCALES } from '@/lib/i18n';

/**
 * En-tête du guide : logo, nom de l'hôtel, sélecteur de langue.
 *
 * Entièrement rendu côté serveur, y compris le changement de langue : ce sont
 * de simples liens vers `?lang=`, donc aucun JavaScript au-dessus de la ligne
 * de flottaison.
 */
export function EnTeteHotel({
  hotel,
  locale,
  cheminCourant,
}: {
  hotel: Hotel;
  locale: Locale;
  cheminCourant: string;
}) {
  return (
    <header
      className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6"
      style={{
        backgroundColor: 'var(--couleur-hotel)',
        color: 'var(--couleur-hotel-texte)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {hotel.logo_url ? (
            <Image
              src={hotel.logo_url}
              alt=""
              width={44}
              height={44}
              // Seule image au-dessus de la ligne de flottaison : chargée en priorité.
              priority
              className="h-11 w-11 rounded-[3px] object-cover bg-white/10"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] opacity-70">
              {hotel.city}
            </p>
            <h1 className="text-[1.6rem] leading-tight truncate">{hotel.name}</h1>
          </div>
        </div>

        <nav aria-label="Langue" className="flex shrink-0 items-center gap-1 pt-1">
          {LOCALES.map((code) => {
            const actif = code === locale;
            return (
              <a
                key={code}
                href={`${cheminCourant}?lang=${code}`}
                hrefLang={code}
                aria-current={actif ? 'true' : undefined}
                className="flex h-11 min-w-11 items-center justify-center px-2 text-sm uppercase tracking-wider"
                style={{ opacity: actif ? 1 : 0.55, fontWeight: actif ? 600 : 400 }}
              >
                {code}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
