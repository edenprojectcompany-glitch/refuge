'use client';

import type { Hotel } from '@/lib/types';
import { enregistrerHotel } from '@/lib/admin/actions';
import { Champ, Selecteur } from '@/components/ui/Champ';
import { FormulaireAdmin, Ligne, Section } from './FormulaireAdmin';

/**
 * Fiche hôtel côté back-office.
 *
 * Les infos pratiques (wifi, petit-déjeuner, blocs libres) n'y sont pas :
 * elles appartiennent à l'hôtelier et se modifient depuis son tableau de bord,
 * via une fonction à liste blanche. Deux chemins d'écriture sur les mêmes
 * champs finiraient par se contredire.
 */
export function FormulaireHotel({ hotel }: { hotel: Hotel | null }) {
  return (
    <FormulaireAdmin action={enregistrerHotel} redirection="/admin/hotels">
      {hotel ? <input type="hidden" name="id" value={hotel.id} /> : null}

      <Section titre="Identité">
        <Ligne etiquette="Nom">
          <Champ name="name" required defaultValue={hotel?.name ?? ''} />
        </Ligne>

        <Ligne
          etiquette="Slug"
          aide={hotel ? 'Change l’URL du guide : les QR codes imprimés cesseront de fonctionner.' : 'Servira de sous-domaine : slug.halles.app'}
        >
          <Champ
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]{1,60}[a-z0-9]"
            defaultValue={hotel?.slug ?? ''}
          />
        </Ligne>

        <Ligne etiquette="Ville">
          <Champ name="city" required defaultValue={hotel?.city ?? 'Paris'} />
        </Ligne>

        <Ligne etiquette="Nombre de chambres" aide="Sert au taux de scan estimé">
          <Champ name="rooms_count" type="number" min={1} defaultValue={hotel?.rooms_count ?? ''} />
        </Ligne>

        <Ligne etiquette="Adresse" large>
          <Champ name="address" defaultValue={hotel?.address ?? ''} />
        </Ligne>

        <Ligne etiquette="Latitude" aide="Origine de tous les temps de marche">
          <Champ name="lat" required inputMode="decimal" defaultValue={hotel ? String(hotel.lat) : ''} />
        </Ligne>

        <Ligne etiquette="Longitude">
          <Champ name="lng" required inputMode="decimal" defaultValue={hotel ? String(hotel.lng) : ''} />
        </Ligne>
      </Section>

      <Section
        titre="Apparence"
        aide="La couleur n’est utilisée qu’en accent. Si elle ne permet pas un contraste suffisant, l’en-tête est ajusté automatiquement."
      >
        <Ligne etiquette="Couleur">
          <div className="flex gap-2">
            <Champ
              name="primary_color"
              required
              pattern="#[0-9a-fA-F]{6}"
              defaultValue={hotel?.primary_color ?? '#1a1714'}
              className="font-mono"
            />
          </div>
        </Ligne>

        <Ligne etiquette="Langue par défaut">
          <Selecteur name="default_locale" defaultValue={hotel?.default_locale ?? 'fr'}>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </Selecteur>
        </Ligne>
      </Section>

      <Section titre="Abonnement">
        <Ligne etiquette="Statut" aide="Un hôtel non publié renvoie un 404 propre sur son sous-domaine.">
          <Selecteur name="status" defaultValue={hotel?.status ?? 'draft'}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </Selecteur>
        </Ligne>

        <Ligne etiquette="Formule">
          <Champ name="plan" required defaultValue={hotel?.plan ?? 'standard'} />
        </Ligne>
      </Section>
    </FormulaireAdmin>
  );
}
