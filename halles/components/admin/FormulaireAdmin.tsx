'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Bouton } from '@/components/ui/Bouton';
import type { Retour } from '@/lib/admin/actions';

/**
 * Enveloppe commune aux formulaires du back-office.
 *
 * Gère l'appel de l'action, l'erreur, l'avertissement partiel (« enregistré,
 * mais la photo a échoué ») et la redirection. Les erreurs restent affichées
 * au-dessus du bouton, là où l'œil revient après avoir cliqué.
 */
export function FormulaireAdmin({
  action,
  redirection,
  libelle = 'Enregistrer',
  children,
}: {
  action: (donnees: FormData) => Promise<Retour>;
  /** Où aller après un enregistrement réussi. */
  redirection: string;
  libelle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);

    demarrer(async () => {
      setErreur(null);
      setAvertissement(null);
      const retour = await action(donnees);

      if (!retour.ok) {
        setErreur(retour.message ?? 'Enregistrement refusé.');
        return;
      }
      if (retour.message) {
        // Enregistré mais incomplet : on reste sur place pour que le message
        // soit lu, plutôt que de le perdre dans une redirection.
        setAvertissement(retour.message);
        router.refresh();
        return;
      }
      router.push(redirection);
    });
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5">
      {children}

      {erreur ? (
        <p className="border border-[#a2472f] bg-[#a2472f]/[0.06] px-3.5 py-2.5 text-[0.88rem] text-[#8a3d2c] rounded-[3px]">
          {erreur}
        </p>
      ) : null}

      {avertissement ? (
        <p className="border border-[#b07d20] bg-[#b07d20]/[0.06] px-3.5 py-2.5 text-[0.88rem] text-[#8a6318] rounded-[3px]">
          {avertissement}
        </p>
      ) : null}

      <div className="sticky bottom-0 flex gap-2.5 border-t border-trait bg-creme py-3">
        <Bouton type="submit" variante="primaire" taille="grand" disabled={enCours}>
          <Save aria-hidden size={16} strokeWidth={1.75} />
          {enCours ? 'Enregistrement…' : libelle}
        </Bouton>
        <Bouton type="button" variante="discret" taille="grand" onClick={() => router.back()}>
          Annuler
        </Bouton>
      </div>
    </form>
  );
}

/** Bloc de champs avec un titre, pour découper un formulaire long. */
export function Section({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-trait bg-papier px-4 py-4 rounded-[3px]">
      <h2 className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
        {titre}
      </h2>
      {aide ? <p className="mt-1 text-[0.82rem] text-encre-doux">{aide}</p> : null}
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Ligne({
  etiquette,
  aide,
  large,
  children,
}: {
  etiquette: string;
  aide?: string;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={large ? 'sm:col-span-2' : undefined}>
      <span className="block text-[0.72rem] font-medium uppercase tracking-[0.1em] text-encre-tres-doux">
        {etiquette}
      </span>
      <div className="mt-1.5">{children}</div>
      {aide ? <p className="mt-1 text-[0.78rem] text-encre-tres-doux">{aide}</p> : null}
    </div>
  );
}
