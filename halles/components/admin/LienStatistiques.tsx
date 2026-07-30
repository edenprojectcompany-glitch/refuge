'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { regenererJetonStats } from '@/lib/admin/actions';
import { Bouton } from '@/components/ui/Bouton';

/**
 * Le lien de statistiques à remettre à l'hôtelier.
 *
 * C'est tout ce qu'il reçoit : pas de compte, pas de mot de passe, pas de mail.
 * Le lien est donc la clé — d'où le bouton de régénération, seul moyen de
 * révoquer un accès qui a fuité.
 */
export function LienStatistiques({ hotelId, jeton }: { hotelId: string; jeton: string }) {
  const [valeur, setValeur] = useState(jeton);
  const [copie, setCopie] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const lien =
    typeof window === 'undefined' ? `/s/${valeur}` : `${window.location.origin}/s/${valeur}`;

  return (
    <section className="border border-trait-fort bg-papier px-4 py-4 rounded-[3px]">
      <h2 className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
        Lien de statistiques de l&apos;hôtelier
      </h2>
      <p className="mt-1 text-[0.82rem] leading-relaxed text-encre-doux">
        À lui transmettre une fois. Il y verra ses scans, ses clics sortants et ses avantages
        consultés — sans compte, sans mot de passe, et sans rien pouvoir modifier.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-[240px] flex-1 truncate rounded-[3px] border border-trait bg-creme px-2.5 py-2 font-mono text-[0.8rem]">
          {lien}
        </code>

        <Bouton
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(lien);
              setCopie(true);
              setTimeout(() => setCopie(false), 2000);
            } catch {
              // Presse-papiers refusé : le lien reste sélectionnable à la main.
            }
          }}
        >
          {copie ? <Check aria-hidden size={14} strokeWidth={2} /> : <Copy aria-hidden size={14} strokeWidth={1.75} />}
          {copie ? 'Copié' : 'Copier'}
        </Bouton>

        <a
          href={`/s/${valeur}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-[3px] border border-trait-fort px-3.5 text-[0.88rem] font-medium hover:bg-creme"
        >
          Ouvrir
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Bouton
          type="button"
          variante="danger"
          taille="petit"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              setMessage(null);
              const donnees = new FormData();
              donnees.set('id', hotelId);
              const retour = await regenererJetonStats(donnees);
              if (retour.ok && retour.id) {
                setValeur(retour.id);
                setMessage(retour.message ?? null);
              } else {
                setMessage(retour.message ?? 'Échec');
              }
            })
          }
        >
          <RefreshCw aria-hidden size={13} strokeWidth={1.75} />
          {enCours ? 'Génération…' : 'Régénérer le lien'}
        </Bouton>

        {message ? <span className="text-[0.8rem] text-encre-doux">{message}</span> : null}
      </div>
    </section>
  );
}
