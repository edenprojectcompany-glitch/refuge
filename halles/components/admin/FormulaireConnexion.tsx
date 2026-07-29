'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { creerClientNavigateur } from '@/lib/supabase/navigateur';
import { Bouton } from '@/components/ui/Bouton';
import { Champ, Etiquette } from '@/components/ui/Champ';

/** Demande d'un lien magique. Le retour est volontairement bavard sur l'état. */
export function FormulaireConnexion({ vers }: { vers: string }) {
  const [courriel, setCourriel] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye' | 'erreur'>('saisie');
  const [message, setMessage] = useState<string | null>(null);

  async function envoyer(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEtat('envoi');
    setMessage(null);

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithOtp({
      email: courriel.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?vers=${encodeURIComponent(vers)}`,
      },
    });

    if (error) {
      setEtat('erreur');
      setMessage(error.message);
      return;
    }
    setEtat('envoye');
  }

  if (etat === 'envoye') {
    return (
      <div className="mt-6 border border-trait-fort bg-papier px-4 py-4 rounded-[3px]">
        <p className="text-[0.95rem] font-medium">Lien envoyé</p>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-encre-doux">
          Ouvrez le message envoyé à <span className="font-medium">{courriel}</span> depuis cet
          appareil. Le lien expire dans une heure.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="mt-6 flex flex-col gap-3">
      <div>
        <Etiquette htmlFor="courriel">Adresse électronique</Etiquette>
        <Champ
          id="courriel"
          type="email"
          name="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="vous@votre-hotel.fr"
          value={courriel}
          onChange={(e) => setCourriel(e.target.value)}
          className="mt-1.5 h-11"
        />
      </div>

      <Bouton type="submit" variante="primaire" taille="grand" disabled={etat === 'envoi'}>
        <Mail aria-hidden size={16} strokeWidth={1.75} />
        {etat === 'envoi' ? 'Envoi…' : 'Recevoir le lien'}
      </Bouton>

      {message ? <p className="text-[0.85rem] text-[#8a3d2c]">{message}</p> : null}
    </form>
  );
}
