'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, GripVertical, Plus, Star, Trash2 } from 'lucide-react';
import type { Hotel } from '@/lib/types';
import {
  attacherLieu,
  basculerFeatured,
  detacherLieu,
  dupliquerCuration,
  enregistrerNote,
  reordonnerCuration,
} from '@/lib/admin/actions';
import { Bouton } from '@/components/ui/Bouton';
import { Selecteur, ZoneTexte } from '@/components/ui/Champ';

export interface LigneCuration {
  place_id: string;
  nom: string;
  categorie: string;
  position: number;
  is_featured: boolean;
  hotel_note_fr: string | null;
  hotel_note_en: string | null;
}

/**
 * Écran de curation d'un hôtel.
 *
 * Trois gestes : l'ordre, les quatre mises en avant, et le mot de l'hôtel.
 * Le glisser-déposer utilise l'API HTML5 native — une bibliothèque de drag and
 * drop pèserait plus lourd que tout le back-office pour trois lignes de code.
 * L'ordre n'est envoyé qu'au relâchement, pas à chaque survol.
 */
/**
 * Empreinte de l'état serveur : identifiants, ordre, mises en avant et présence
 * d'une note. Tout ce qui, changeant, doit reprendre la main sur l'affichage.
 */
function signatureDe(lignes: LigneCuration[]): string {
  return lignes
    .map((l) => `${l.place_id}:${l.position}:${l.is_featured ? 1 : 0}:${l.hotel_note_fr ? 1 : 0}`)
    .join('|');
}

export function EcranCuration({
  hotel,
  lignes,
  disponibles,
  voisins,
}: {
  hotel: Hotel;
  lignes: LigneCuration[];
  disponibles: Array<{ id: string; name: string; category: string }>;
  voisins: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [attrape, setAttrape] = useState<string | null>(null);

  /*
   * L'ordre affiché est celui du serveur, sauf pendant un glisser-déposer où on
   * garde une version locale pour que la ligne suive le doigt sans attendre
   * l'aller-retour.
   *
   * Cette version locale doit être abandonnée dès que le serveur renvoie autre
   * chose — après une duplication, un ajout ou une suppression. Sans cela, la
   * liste restait figée sur l'état d'avant : une duplication de 25 lieux
   * n'affichait rien, et une mise en avant ne se voyait pas.
   */
  const [ordreLocal, setOrdreLocal] = useState<LigneCuration[] | null>(null);
  const [signature, setSignature] = useState(() => signatureDe(lignes));

  const signatureServeur = signatureDe(lignes);
  if (signatureServeur !== signature) {
    setSignature(signatureServeur);
    setOrdreLocal(null);
  }

  const ordre = ordreLocal ?? lignes;
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const misEnAvant = ordre.filter((ligne) => ligne.is_featured).length;

  function agir(action: (donnees: FormData) => Promise<{ ok: boolean; message?: string }>, champs: Record<string, string>) {
    demarrer(async () => {
      setMessage(null);
      const donnees = new FormData();
      Object.entries(champs).forEach(([cle, valeur]) => donnees.set(cle, valeur));
      const retour = await action(donnees);

      if (!retour.ok) {
        setMessage({ ok: false, texte: retour.message ?? 'Échec' });
        return;
      }
      if (retour.message) setMessage({ ok: true, texte: retour.message });
      router.refresh();
    });
  }

  function deposer(cible: string) {
    if (!attrape || attrape === cible) return;

    const suivant = [...ordre];
    const depuis = suivant.findIndex((l) => l.place_id === attrape);
    const vers = suivant.findIndex((l) => l.place_id === cible);
    const [deplace] = suivant.splice(depuis, 1);
    suivant.splice(vers, 0, deplace);

    setOrdreLocal(suivant);
    setAttrape(null);
    agir(reordonnerCuration, {
      hotel_id: hotel.id,
      ordre: suivant.map((l) => l.place_id).join(','),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {message ? (
        <p
          className={`px-3.5 py-2.5 text-[0.88rem] rounded-[3px] border ${
            message.ok
              ? 'border-[#3f7a4a] bg-[#3f7a4a]/[0.06] text-[#33633c]'
              : 'border-[#a2472f] bg-[#a2472f]/[0.06] text-[#8a3d2c]'
          }`}
        >
          {message.texte}
        </p>
      ) : null}

      {/* Duplication : la fonctionnalité qui fait l'onboarding en trois heures */}
      {voisins.length > 0 ? (
        <section className="border border-trait-fort bg-papier px-4 py-4 rounded-[3px]">
          <h2 className="flex items-center gap-2 text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
            <Copy aria-hidden size={14} strokeWidth={1.75} />
            Reprendre la curation d&apos;un autre hôtel
          </h2>
          <p className="mt-1 text-[0.82rem] text-encre-doux">
            Les lieux déjà présents sont conservés. Les notes ne sont pas recopiées : ce sont les
            mots de l&apos;autre hôtelier, et deux guides identiques n&apos;ont plus d&apos;intérêt.
          </p>

          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(evenement) => {
              evenement.preventDefault();
              const formulaire = new FormData(evenement.currentTarget);
              agir(dupliquerCuration, {
                source: String(formulaire.get('source') ?? ''),
                cible: hotel.id,
                avec_notes: formulaire.get('avec_notes') === 'on' ? '1' : '0',
              });
            }}
          >
            <Selecteur name="source" required defaultValue="" className="w-auto">
              <option value="" disabled>
                Choisir un hôtel…
              </option>
              {voisins.map((voisin) => (
                <option key={voisin.id} value={voisin.id}>
                  {voisin.name}
                </option>
              ))}
            </Selecteur>

            <label className="flex h-9 items-center gap-2 text-[0.85rem] text-encre-doux">
              <input type="checkbox" name="avec_notes" className="h-4 w-4" />
              avec les notes, à réécrire
            </label>

            <Bouton type="submit" disabled={enCours}>
              Reprendre
            </Bouton>
          </form>
        </section>
      ) : null}

      {/* Ajout d'un lieu */}
      <section className="border border-trait bg-papier px-4 py-4 rounded-[3px]">
        <h2 className="flex items-center gap-2 text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
          <Plus aria-hidden size={14} strokeWidth={2} />
          Ajouter un lieu de {hotel.city}
        </h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(evenement) => {
            evenement.preventDefault();
            const formulaire = new FormData(evenement.currentTarget);
            agir(attacherLieu, {
              hotel_id: hotel.id,
              place_id: String(formulaire.get('place_id') ?? ''),
            });
            evenement.currentTarget.reset();
          }}
        >
          <Selecteur name="place_id" required defaultValue="" className="w-auto min-w-[260px] flex-1">
            <option value="" disabled>
              {disponibles.length === 0 ? 'Tous les lieux sont déjà dans ce guide' : 'Choisir un lieu…'}
            </option>
            {disponibles.map((lieu) => (
              <option key={lieu.id} value={lieu.id}>
                {lieu.name} — {lieu.category}
              </option>
            ))}
          </Selecteur>
          <Bouton type="submit" disabled={enCours || disponibles.length === 0}>
            Ajouter
          </Bouton>
        </form>
      </section>

      {/* La curation */}
      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
            Ordre du guide · {ordre.length} lieux
          </h2>
          <p className="text-[0.8rem] text-encre-tres-doux">
            {misEnAvant}/4 incontournables · glisser pour réordonner
          </p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {ordre.map((ligne, index) => (
            <li
              key={ligne.place_id}
              draggable
              onDragStart={() => setAttrape(ligne.place_id)}
              onDragOver={(evenement) => evenement.preventDefault()}
              onDrop={() => deposer(ligne.place_id)}
              onDragEnd={() => setAttrape(null)}
              className={`border bg-papier rounded-[3px] ${
                attrape === ligne.place_id ? 'border-encre opacity-60' : 'border-trait'
              }`}
            >
              <div className="flex items-center gap-2 px-2.5 py-2">
                <span className="cursor-grab text-encre-tres-doux" aria-hidden>
                  <GripVertical size={16} strokeWidth={1.75} />
                </span>

                <span className="w-6 text-[0.8rem] tabular-nums text-encre-tres-doux">
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-medium">{ligne.nom}</span>
                  <span className="block text-[0.75rem] text-encre-tres-doux">
                    {ligne.categorie}
                    {ligne.hotel_note_fr ? ' · commenté' : ' · sans mot de l’hôtel'}
                  </span>
                </span>

                <Bouton
                  type="button"
                  taille="petit"
                  variante={ligne.is_featured ? 'primaire' : 'secondaire'}
                  disabled={enCours}
                  aria-pressed={ligne.is_featured}
                  onClick={() =>
                    agir(basculerFeatured, {
                      hotel_id: hotel.id,
                      place_id: ligne.place_id,
                      is_featured: ligne.is_featured ? '0' : '1',
                    })
                  }
                >
                  <Star aria-hidden size={13} strokeWidth={2} />
                  {ligne.is_featured ? 'En avant' : 'Mettre en avant'}
                </Bouton>

                <Bouton
                  type="button"
                  taille="petit"
                  variante="discret"
                  onClick={() => setOuvert(ouvert === ligne.place_id ? null : ligne.place_id)}
                >
                  {ligne.hotel_note_fr ? 'Modifier le mot' : 'Écrire le mot'}
                </Bouton>

                <Bouton
                  type="button"
                  taille="icone"
                  variante="danger"
                  disabled={enCours}
                  aria-label={`Retirer ${ligne.nom} du guide`}
                  onClick={() =>
                    agir(detacherLieu, { hotel_id: hotel.id, place_id: ligne.place_id })
                  }
                >
                  <Trash2 aria-hidden size={14} strokeWidth={1.75} />
                </Bouton>
              </div>

              {ouvert === ligne.place_id ? (
                <form
                  className="grid gap-2.5 border-t border-trait px-2.5 py-3 sm:grid-cols-2"
                  onSubmit={(evenement) => {
                    evenement.preventDefault();
                    const formulaire = new FormData(evenement.currentTarget);
                    agir(enregistrerNote, {
                      hotel_id: hotel.id,
                      place_id: ligne.place_id,
                      hotel_note_fr: String(formulaire.get('hotel_note_fr') ?? ''),
                      hotel_note_en: String(formulaire.get('hotel_note_en') ?? ''),
                    });
                    setOuvert(null);
                  }}
                >
                  <label className="sm:col-span-2">
                    <span className="block text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
                      Le mot de l&apos;hôtel (fr) — mis en avant sur la fiche
                    </span>
                    <ZoneTexte
                      name="hotel_note_fr"
                      rows={2}
                      defaultValue={ligne.hotel_note_fr ?? ''}
                      placeholder="Notre cantine à nous. Dites que vous venez de l’hôtel."
                      className="mt-1"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="block text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
                      Le mot de l&apos;hôtel (en)
                    </span>
                    <ZoneTexte
                      name="hotel_note_en"
                      rows={2}
                      defaultValue={ligne.hotel_note_en ?? ''}
                      className="mt-1"
                    />
                  </label>

                  <div className="flex gap-2 sm:col-span-2">
                    <Bouton type="submit" variante="primaire" disabled={enCours}>
                      Enregistrer le mot
                    </Bouton>
                    <Bouton type="button" variante="discret" onClick={() => setOuvert(null)}>
                      Fermer
                    </Bouton>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        {ordre.length === 0 ? (
          <p className="border border-trait bg-papier px-4 py-8 text-center text-[0.9rem] text-encre-doux rounded-[3px]">
            Ce guide est vide. Reprenez la curation d&apos;un hôtel voisin, ou ajoutez les lieux un
            par un.
          </p>
        ) : null}
      </section>

      {/* Chevalets à imprimer */}
      <section className="border border-trait bg-papier px-4 py-4 rounded-[3px]">
        <h2 className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
          QR codes à imprimer
        </h2>
        <p className="mt-1 text-[0.82rem] text-encre-doux">
          Un fichier A5 par emplacement, chacun avec sa provenance : l&apos;hôtelier verra lequel de
          ses supports fonctionne.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ['chambre', 'Chambre'],
              ['reception', 'Réception'],
              ['carte-cle', 'Carte-clé'],
            ] as const
          ).map(([source, libelle]) => (
            <a
              key={source}
              href={`/admin/hotels/${hotel.id}/qr/${source}`}
              className="inline-flex h-9 items-center gap-2 rounded-[3px] border border-trait-fort px-3.5 text-[0.88rem] font-medium hover:bg-creme"
            >
              {libelle} · PDF A5
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
