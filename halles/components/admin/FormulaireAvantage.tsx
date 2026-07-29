'use client';

import type { Avantage } from '@/lib/types';
import { enregistrerAvantage } from '@/lib/admin/actions';
import { Champ, Selecteur, ZoneTexte } from '@/components/ui/Champ';
import { FormulaireAdmin, Ligne, Section } from './FormulaireAdmin';

/**
 * Saisie d'un avantage négocié.
 *
 * Les conditions sont le champ le plus important de l'écran : elles seront
 * lues telles quelles par le commerçant au comptoir. Un sous-entendu ici
 * devient une discussion pénible là-bas.
 */
export function FormulaireAvantage({
  avantage,
  lieux,
}: {
  avantage: Avantage | null;
  lieux: Array<{ id: string; name: string; city: string }>;
}) {
  return (
    <FormulaireAdmin action={enregistrerAvantage} redirection="/admin/avantages">
      {avantage ? <input type="hidden" name="id" value={avantage.id} /> : null}

      <Section titre="Établissement">
        <Ligne etiquette="Lieu" large>
          <Selecteur name="place_id" required defaultValue={avantage?.place_id ?? ''}>
            <option value="" disabled>
              Choisir un lieu…
            </option>
            {lieux.map((lieu) => (
              <option key={lieu.id} value={lieu.id}>
                {lieu.name} — {lieu.city}
              </option>
            ))}
          </Selecteur>
        </Ligne>
      </Section>

      <Section titre="Libellé" aide="Court et concret : « Apéritif offert », « -10 % sur l’addition ».">
        <Ligne etiquette="Titre (fr)" large>
          <Champ name="title_fr" required defaultValue={avantage?.title_fr ?? ''} maxLength={80} />
        </Ligne>
        <Ligne etiquette="Titre (en)" large>
          <Champ name="title_en" defaultValue={avantage?.title_en ?? ''} maxLength={80} />
        </Ligne>
        <Ligne etiquette="Description (fr)" large>
          <ZoneTexte name="description_fr" rows={2} defaultValue={avantage?.description_fr ?? ''} />
        </Ligne>
        <Ligne etiquette="Description (en)" large>
          <ZoneTexte name="description_en" rows={2} defaultValue={avantage?.description_en ?? ''} />
        </Ligne>
      </Section>

      <Section
        titre="Conditions"
        aide="Lues par le commerçant sur l’écran du client. Tout ce qui n’est pas écrit ici sera contesté au comptoir."
      >
        <Ligne etiquette="Conditions (fr)" large>
          <ZoneTexte
            name="conditions_fr"
            rows={3}
            defaultValue={avantage?.conditions_fr ?? ''}
            placeholder="Valable au dîner uniquement, hors vendredi et samedi. Un verre par personne. À signaler avant la commande."
          />
        </Ligne>
        <Ligne etiquette="Conditions (en)" large>
          <ZoneTexte name="conditions_en" rows={3} defaultValue={avantage?.conditions_en ?? ''} />
        </Ligne>
      </Section>

      <Section titre="Validité">
        <Ligne etiquette="Début" aide="Vide = depuis toujours">
          <Champ name="valid_from" type="date" defaultValue={avantage?.valid_from ?? ''} />
        </Ligne>
        <Ligne etiquette="Fin" aide="Vide = sans date de fin">
          <Champ name="valid_until" type="date" defaultValue={avantage?.valid_until ?? ''} />
        </Ligne>
        <Ligne etiquette="Statut">
          <Selecteur name="status" defaultValue={avantage?.status ?? 'draft'}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </Selecteur>
        </Ligne>
      </Section>
    </FormulaireAdmin>
  );
}
