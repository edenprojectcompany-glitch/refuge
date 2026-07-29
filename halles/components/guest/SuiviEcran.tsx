'use client';

import { useEffect, useState } from 'react';
import type { Locale, TypeEvenement } from '@/lib/types';
import { compterEcran, suivre, suivreEcran } from '@/lib/analytics';
import { InstallationPWA } from './InstallationPWA';

/**
 * Pied de page technique commun à tous les écrans du guide.
 *
 * Déclare la vue de l'écran, ouvre la session au premier, compte les écrans vus
 * et laisse la proposition d'installation apparaître à partir du deuxième.
 * Ne rend rien de visible tant que rien n'est à proposer, et vit en fin de
 * document : la mesure ne doit ni retarder l'affichage, ni bloquer le pouce.
 */
export function SuiviEcran({
  hotelId,
  locale,
  evenement,
  placeId,
  perkId,
}: {
  hotelId: string;
  locale: Locale;
  /** Événement supplémentaire propre à l'écran (`place_view`, `perk_open`…). */
  evenement?: TypeEvenement;
  placeId?: string;
  perkId?: string;
}) {
  const [ecransVus, setEcransVus] = useState(0);

  useEffect(() => {
    setEcransVus(compterEcran());
    suivreEcran({ hotelId, locale, placeId, perkId });
    if (evenement) suivre({ hotelId, locale, type: evenement, placeId, perkId });
  }, [hotelId, locale, evenement, placeId, perkId]);

  return <InstallationPWA locale={locale} ecransVus={ecransVus} />;
}
