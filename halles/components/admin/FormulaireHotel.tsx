'use client';

import type { Hotel } from '@/lib/types';
import { enregistrerHotel } from '@/lib/admin/actions';
import { Champ, Selecteur, ZoneTexte } from '@/components/ui/Champ';
import { FormulaireAdmin, Ligne, Section } from './FormulaireAdmin';

/**
 * Fiche hôtel côté back-office.
 *
 * Les infos pratiques sont ici : l'hôtelier n'a pas de surface d'édition, il
 * donne le QR code et c'est tout. On les saisit à l'installation, puis au
 * téléphone quand un mot de passe wifi change.
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

      <Section
        titre="Infos pratiques"
        aide="Affichées dans le guide, sur l'accueil et l'écran Infos. Ce que le client cherche en arrivant."
      >
        <Ligne etiquette="Nom du réseau wifi">
          <Champ name="wifi_name" defaultValue={hotel?.wifi_name ?? ''} />
        </Ligne>
        <Ligne etiquette="Mot de passe wifi" aide="Affiché en clair, avec un bouton copier">
          <Champ name="wifi_password" defaultValue={hotel?.wifi_password ?? ''} />
        </Ligne>
        <Ligne etiquette="Petit-déjeuner" large>
          <ZoneTexte name="breakfast_info" rows={2} defaultValue={hotel?.breakfast_info ?? ''} />
        </Ligne>
        <Ligne etiquette="Arrivée" large>
          <ZoneTexte name="checkin_info" rows={2} defaultValue={hotel?.checkin_info ?? ''} />
        </Ligne>
        <Ligne etiquette="Départ" large>
          <ZoneTexte name="checkout_info" rows={2} defaultValue={hotel?.checkout_info ?? ''} />
        </Ligne>
        <Ligne etiquette="Transports" large>
          <ZoneTexte name="transport_info" rows={2} defaultValue={hotel?.transport_info ?? ''} />
        </Ligne>
        <Ligne etiquette="WhatsApp" aide="Format international : +33612345678">
          <Champ name="contact_whatsapp" defaultValue={hotel?.contact_whatsapp ?? ''} />
        </Ligne>
        <Ligne etiquette="Téléphone de la réception">
          <Champ name="contact_phone" type="tel" defaultValue={hotel?.contact_phone ?? ''} />
        </Ligne>
        <Ligne etiquette="Logo" aide="URL d'une image carrée, affichée dans l'en-tête et sur l'écran d'avantage" large>
          <Champ name="logo_url" type="url" defaultValue={hotel?.logo_url ?? ''} />
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
