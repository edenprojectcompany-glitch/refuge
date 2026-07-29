'use client';

import { useEffect, useState } from 'react';
import type { HorairesSemaine, Locale } from '@/lib/types';
import { etatOuverture } from '@/lib/horaires';
import { creerTraducteur } from '@/lib/i18n';

/**
 * Pastille « ouvert / fermé maintenant ».
 *
 * Calculée dans le navigateur, jamais au rendu : les pages guest sont mises en
 * cache cinq minutes, un état figé au moment du rendu afficherait « ouvert »
 * bien après la fermeture. Le calcul reste en heure de Paris quel que soit le
 * fuseau du téléphone.
 */
export function EtatOuvert({
  horaires,
  locale,
}: {
  horaires: HorairesSemaine | null;
  locale: Locale;
}) {
  const [etat, setEtat] = useState<ReturnType<typeof etatOuverture> | null>(null);
  const t = creerTraducteur(locale);

  useEffect(() => {
    setEtat(etatOuverture(horaires));
    // Une réévaluation par minute suffit : on ne rate jamais une fermeture de
    // plus d'une minute, sans réveiller le téléphone pour rien.
    const minuteur = setInterval(() => setEtat(etatOuverture(horaires)), 60_000);
    return () => clearInterval(minuteur);
  }, [horaires]);

  if (!etat || etat.ouvert === null) return null;

  const libelle = etat.ouvert
    ? etat.prochainHoraire
      ? t('lieu.ouvertJusqua', { h: etat.prochainHoraire })
      : t('lieu.ouvert')
    : etat.prochainHoraire
      ? etat.reouvrePlusTard
        ? t('lieu.fermeAujourdhui')
        : t('lieu.fermeJusqua', { h: etat.prochainHoraire })
      : t('lieu.ferme');

  return (
    <span className="inline-flex items-center gap-1.5 text-[0.85rem]">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: etat.ouvert ? '#3f7a4a' : '#a2472f' }}
      />
      <span style={{ color: etat.ouvert ? '#33633c' : '#8a3d2c' }}>{libelle}</span>
    </span>
  );
}
