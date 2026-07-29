'use client';

import { useEffect } from 'react';
import type { Locale } from '@/lib/types';

const CLE = 'halles.langue';

/**
 * Mémorise la langue choisie et la restaure au scan suivant.
 *
 * Ne rend rien et vit en bas de page : la langue servie vient toujours du
 * serveur (`?lang=`), ce composant ne fait que corriger le tir pour un visiteur
 * qui revient sans le paramètre. Le choix de l'URL prime toujours sur la
 * mémoire, sans quoi le sélecteur de langue deviendrait inopérant.
 */
export function MemoireLangue({
  localeServie,
  langueExplicite,
}: {
  localeServie: Locale;
  langueExplicite: boolean;
}) {
  useEffect(() => {
    let stockee: string | null = null;
    try {
      stockee = window.localStorage.getItem(CLE);
      if (langueExplicite) window.localStorage.setItem(CLE, localeServie);
    } catch {
      // Navigation privée ou stockage refusé : la langue par défaut fera l'affaire.
      return;
    }

    if (langueExplicite || !stockee || stockee === localeServie) return;
    if (stockee !== 'fr' && stockee !== 'en') return;

    const url = new URL(window.location.href);
    url.searchParams.set('lang', stockee);
    window.location.replace(url.toString());
  }, [localeServie, langueExplicite]);

  return null;
}
