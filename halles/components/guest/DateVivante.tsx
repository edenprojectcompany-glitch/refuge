'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/types';
import { FUSEAU_PARIS } from '@/lib/perks';

/**
 * Date et heure du jour, en mouvement.
 *
 * Il n'y a volontairement ni code, ni scan, ni validation côté commerçant : la
 * moindre friction ferait chuter l'usage. La contrepartie est qu'une capture
 * d'écran pourrait circuler. L'horloge qui avance seconde par seconde et le
 * dégradé qui balaie l'encart rendent une capture immédiatement reconnaissable
 * — c'est un garde-fou social, pas un contrôle technique, et c'est assumé.
 */
export function DateVivante({ locale }: { locale: Locale }) {
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  useEffect(() => {
    setMaintenant(new Date());
    const minuteur = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(minuteur);
  }, []);

  const langue = locale === 'fr' ? 'fr-FR' : 'en-GB';

  const date = maintenant
    ? new Intl.DateTimeFormat(langue, {
        timeZone: FUSEAU_PARIS,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(maintenant)
    : ' ';

  const heure = maintenant
    ? new Intl.DateTimeFormat(langue, {
        timeZone: FUSEAU_PARIS,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(maintenant)
    : ' ';

  return (
    <div className="balayage relative overflow-hidden border-y border-trait bg-papier px-5 py-4 text-center">
      <p className="text-[0.95rem] first-letter:uppercase">{date}</p>
      <p className="mt-0.5 font-mono text-[1.6rem] tabular-nums tracking-wider">{heure}</p>
    </div>
  );
}
