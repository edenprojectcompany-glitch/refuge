'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { creerTraducteur } from '@/lib/i18n';

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLE_REFUS = 'halles.installation-refusee';

/**
 * Enregistre le service worker et propose l'installation — au deuxième écran,
 * jamais au premier.
 *
 * Un bandeau d'installation sur l'écran d'arrivée, alors que le voyageur vient
 * de scanner un QR code et cherche juste où dîner, est une friction pure. Au
 * deuxième écran, il a montré son intérêt : la proposition devient un service.
 * Un refus est mémorisé et n'est jamais représenté.
 */
export function InstallationPWA({ locale, ecransVus }: { locale: Locale; ecransVus: number }) {
  const [invite, setInvite] = useState<EvenementInstallation | null>(null);
  const [visible, setVisible] = useState(false);
  const t = creerTraducteur(locale);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Enregistrement refusé (navigation privée, http) : sans conséquence.
      });
    }
  }, []);

  useEffect(() => {
    function capturer(evenement: Event) {
      evenement.preventDefault();
      setInvite(evenement as EvenementInstallation);
    }
    window.addEventListener('beforeinstallprompt', capturer);
    return () => window.removeEventListener('beforeinstallprompt', capturer);
  }, []);

  useEffect(() => {
    if (!invite || ecransVus < 2) return;
    try {
      if (window.localStorage.getItem(CLE_REFUS)) return;
    } catch {
      return;
    }
    setVisible(true);
  }, [invite, ecransVus]);

  if (!visible || !invite) return null;

  function refuser() {
    try {
      window.localStorage.setItem(CLE_REFUS, '1');
    } catch {
      // Sans stockage, la proposition réapparaîtra : acceptable.
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 z-40 border border-trait-fort bg-papier px-4 py-3.5 rounded-[4px] shadow-[0_2px_14px_rgba(26,23,20,0.14)]"
         style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.98rem] font-medium">{t('commun.installer')}</p>
          <p className="mt-0.5 text-[0.85rem] leading-snug text-encre-doux">
            {t('commun.installerTexte')}
          </p>
        </div>
        <button
          type="button"
          onClick={refuser}
          aria-label={t('commun.fermer')}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-encre-tres-doux"
        >
          <X aria-hidden size={17} strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-3 flex gap-2.5">
        <button
          type="button"
          onClick={async () => {
            setVisible(false);
            await invite.prompt();
            await invite.userChoice;
            setInvite(null);
          }}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 text-[0.9rem] font-medium rounded-[4px]"
          style={{ backgroundColor: 'var(--couleur-hotel)', color: 'var(--couleur-hotel-texte)' }}
        >
          <Download aria-hidden size={15} strokeWidth={1.75} />
          {t('commun.installer')}
        </button>
        <button
          type="button"
          onClick={refuser}
          className="min-h-11 px-4 text-[0.9rem] text-encre-doux"
        >
          {t('commun.plusTard')}
        </button>
      </div>
    </div>
  );
}
