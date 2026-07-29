'use client';

import { CalendarCheck, Globe, Navigation, Phone } from 'lucide-react';
import type { LieuDuGuide, Locale } from '@/lib/types';
import { creerTraducteur } from '@/lib/i18n';
import { suivre } from '@/lib/analytics';

/**
 * Actions sortantes d'une fiche.
 *
 * Chaque clic émet un `outbound_click` : c'est le chiffre qui prouve à
 * l'hôtelier que son guide envoie vraiment du monde chez ses partenaires, donc
 * l'argument de renouvellement de l'abonnement. L'événement part en
 * `sendBeacon`, sans jamais retarder l'ouverture du lien.
 */
export function BoutonsSortants({
  lieu,
  hotelId,
  locale,
}: {
  lieu: LieuDuGuide;
  hotelId: string;
  locale: Locale;
}) {
  const t = creerTraducteur(locale);

  function tracer(destination: string) {
    suivre({
      hotelId,
      type: destination === 'appel' ? 'contact_click' : 'outbound_click',
      placeId: lieu.id,
      locale,
      meta: { destination },
    });
  }

  function ouvrirItineraire() {
    tracer('itineraire');
    const coordonnees = `${lieu.lat},${lieu.lng}`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${coordonnees}&travelmode=walking`;

    // Sur iOS, `maps://` ouvre Plans directement ; ailleurs, Google Maps web.
    const estApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    window.location.href = estApple
      ? `maps://?daddr=${coordonnees}&dirflg=w`
      : google;

    // Si le schéma natif n'aboutit pas, on retombe sur le web.
    if (estApple) {
      window.setTimeout(() => {
        if (!document.hidden) window.location.href = google;
      }, 900);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={ouvrirItineraire}
        className="flex min-h-12 items-center justify-center gap-2 text-[0.92rem] font-medium rounded-[4px]"
        style={{ backgroundColor: 'var(--couleur-hotel)', color: 'var(--couleur-hotel-texte)' }}
      >
        <Navigation aria-hidden size={16} strokeWidth={1.75} />
        {t('lieu.itineraire')}
      </button>

      {lieu.phone ? (
        <Sortant href={`tel:${lieu.phone}`} onClick={() => tracer('appel')}>
          <Phone aria-hidden size={16} strokeWidth={1.75} />
          {t('lieu.appeler')}
        </Sortant>
      ) : null}

      {lieu.booking_url ? (
        <Sortant href={lieu.booking_url} externe onClick={() => tracer('reservation')}>
          <CalendarCheck aria-hidden size={16} strokeWidth={1.75} />
          {t('lieu.reserver')}
        </Sortant>
      ) : null}

      {lieu.website ? (
        <Sortant href={lieu.website} externe onClick={() => tracer('site')}>
          <Globe aria-hidden size={16} strokeWidth={1.75} />
          {t('lieu.siteWeb')}
        </Sortant>
      ) : null}
    </div>
  );
}

function Sortant({
  href,
  externe,
  onClick,
  children,
}: {
  href: string;
  externe?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      {...(externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex min-h-12 items-center justify-center gap-2 border border-trait-fort text-[0.92rem] font-medium rounded-[4px]"
    >
      {children}
    </a>
  );
}
