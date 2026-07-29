'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import type { Lieu } from '@/lib/types';
import { ORDRE_CATEGORIES } from '@/lib/categories';
import { analyserUrlGoogleMaps } from '@/lib/admin/import-maps';
import { enregistrerLieu } from '@/lib/admin/actions';
import { Bouton } from '@/components/ui/Bouton';
import { Champ, Selecteur, ZoneTexte } from '@/components/ui/Champ';
import { FormulaireAdmin, Ligne, Section } from './FormulaireAdmin';

/**
 * Saisie d'un lieu.
 *
 * Le collage d'une URL Google Maps pré-remplit nom et coordonnées — c'est le
 * geste qui fait passer l'onboarding d'un hôtel de dix heures à trois. Le parsing
 * est faillible par construction : on annonce ce qui a été trouvé et ce qui
 * reste à saisir, plutôt que de laisser croire à un formulaire complet.
 */
export function FormulaireLieu({ lieu, villes }: { lieu: Lieu | null; villes: string[] }) {
  const [nom, setNom] = useState(lieu?.name ?? '');
  const [lat, setLat] = useState(lieu ? String(lieu.lat) : '');
  const [lng, setLng] = useState(lieu ? String(lieu.lng) : '');
  const [urlMaps, setUrlMaps] = useState('');
  const [retourImport, setRetourImport] = useState<string | null>(null);

  function importer() {
    const resultat = analyserUrlGoogleMaps(urlMaps);

    if (resultat.probleme === 'lien-court') {
      setRetourImport(
        "Lien raccourci : ouvrez-le dans un navigateur, puis copiez l'URL complète de la barre d'adresse.",
      );
      return;
    }
    if (resultat.probleme === 'url-invalide') {
      setRetourImport('Ce n’est pas une URL. Collez le lien complet depuis Google Maps.');
      return;
    }
    if (resultat.probleme === 'domaine-inconnu') {
      setRetourImport('Cette URL ne vient pas de Google Maps.');
      return;
    }

    if (resultat.nom) setNom(resultat.nom);
    if (resultat.lat !== null) setLat(String(resultat.lat));
    if (resultat.lng !== null) setLng(String(resultat.lng));

    setRetourImport(
      resultat.manquant.length === 0
        ? 'Nom et coordonnées récupérés. Vérifiez l’adresse, elle n’est pas dans l’URL.'
        : `Récupéré partiellement : ${resultat.manquant.join(' et ')} à saisir à la main.`,
    );
  }

  return (
    <FormulaireAdmin action={enregistrerLieu} redirection="/admin/lieux">
      {lieu ? <input type="hidden" name="id" value={lieu.id} /> : null}

      {!lieu ? (
        <section className="border border-trait-fort bg-papier px-4 py-4 rounded-[3px]">
          <h2 className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-encre-tres-doux">
            Import depuis Google Maps
          </h2>
          <p className="mt-1 text-[0.82rem] text-encre-doux">
            Collez l’URL de la fiche : le nom et les coordonnées sont lus dans le lien, sans appeler
            l’API Google.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Champ
              type="url"
              value={urlMaps}
              onChange={(e) => setUrlMaps(e.target.value)}
              placeholder="https://www.google.com/maps/place/…"
              className="min-w-[240px] flex-1"
              aria-label="URL Google Maps"
            />
            <Bouton type="button" onClick={importer} disabled={urlMaps.trim() === ''}>
              <Link2 aria-hidden size={15} strokeWidth={1.75} />
              Pré-remplir
            </Bouton>
          </div>
          {retourImport ? (
            <p className="mt-2 text-[0.82rem] text-encre-doux">{retourImport}</p>
          ) : null}
        </section>
      ) : null}

      <Section titre="Identité">
        <Ligne etiquette="Nom">
          <Champ name="name" required value={nom} onChange={(e) => setNom(e.target.value)} />
        </Ligne>

        <Ligne etiquette="Catégorie">
          <Selecteur name="category" defaultValue={lieu?.category ?? 'restaurant'}>
            {ORDRE_CATEGORIES.map((categorie) => (
              <option key={categorie} value={categorie}>
                {categorie}
              </option>
            ))}
          </Selecteur>
        </Ligne>

        <Ligne etiquette="Adresse" large>
          <Champ name="address" required defaultValue={lieu?.address ?? ''} />
        </Ligne>

        <Ligne etiquette="Ville">
          <Champ name="city" required defaultValue={lieu?.city ?? villes[0] ?? 'Paris'} list="villes" />
          <datalist id="villes">
            {villes.map((ville) => (
              <option key={ville} value={ville} />
            ))}
          </datalist>
        </Ligne>

        <Ligne etiquette="Gamme de prix" aide="1 à 4, ou vide pour un lieu gratuit">
          <Champ name="price_range" type="number" min={1} max={4} defaultValue={lieu?.price_range ?? ''} />
        </Ligne>

        <Ligne etiquette="Latitude">
          <Champ name="lat" required value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
        </Ligne>

        <Ligne etiquette="Longitude">
          <Champ name="lng" required value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" />
        </Ligne>
      </Section>

      <Section titre="Contenu" aide="Le français fait référence : l’anglais vide retombe dessus.">
        <Ligne etiquette="Résumé (fr)" large>
          <Champ name="short_desc_fr" defaultValue={lieu?.short_desc_fr ?? ''} maxLength={160} />
        </Ligne>
        <Ligne etiquette="Résumé (en)" large>
          <Champ name="short_desc_en" defaultValue={lieu?.short_desc_en ?? ''} maxLength={160} />
        </Ligne>
        <Ligne etiquette="Description (fr)" large>
          <ZoneTexte name="long_desc_fr" rows={4} defaultValue={lieu?.long_desc_fr ?? ''} />
        </Ligne>
        <Ligne etiquette="Description (en)" large>
          <ZoneTexte name="long_desc_en" rows={4} defaultValue={lieu?.long_desc_en ?? ''} />
        </Ligne>
        <Ligne etiquette="Tags" aide="Séparés par des virgules : vegan, terrasse, tardif…" large>
          <Champ name="tags" defaultValue={(lieu?.tags ?? []).join(', ')} />
        </Ligne>
      </Section>

      <Section titre="Contact et liens">
        <Ligne etiquette="Téléphone">
          <Champ name="phone" type="tel" defaultValue={lieu?.phone ?? ''} />
        </Ligne>
        <Ligne etiquette="Site web">
          <Champ name="website" type="url" defaultValue={lieu?.website ?? ''} />
        </Ligne>
        <Ligne etiquette="Réservation">
          <Champ name="booking_url" type="url" defaultValue={lieu?.booking_url ?? ''} />
        </Ligne>
        <Ligne etiquette="Instagram" aide="Sans l’arobase">
          <Champ name="instagram" defaultValue={lieu?.instagram ?? ''} />
        </Ligne>
      </Section>

      <Section
        titre="Photo"
        aide="URL de la photo sur le site du commerçant. Elle est téléchargée une fois et rangée dans notre stockage — le lien ne cassera plus. À n’utiliser que pour un partenaire."
      >
        <Ligne etiquette="Photo à récupérer" large>
          <Champ name="photo_source" type="url" placeholder="https://site-du-commercant.fr/photo.jpg" />
        </Ligne>
        {lieu?.photo_url ? (
          <Ligne etiquette="Photo actuelle" large>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lieu.photo_url}
              alt=""
              className="h-24 w-40 border border-trait object-cover rounded-[3px]"
            />
          </Ligne>
        ) : null}
      </Section>

      <Section
        titre="Horaires"
        aide='JSON par jour. Créneau franchissant minuit : ["20:00","02:00"]. Jour absent = inconnu, tableau vide = fermé.'
      >
        <Ligne etiquette="opening_hours" large>
          <ZoneTexte
            name="opening_hours"
            rows={5}
            spellCheck={false}
            className="font-mono text-[0.82rem]"
            defaultValue={lieu?.opening_hours ? JSON.stringify(lieu.opening_hours, null, 0) : ''}
            placeholder='{"mon":[],"tue":[["12:00","14:30"],["19:00","22:30"]]}'
          />
        </Ligne>
      </Section>

      <Section titre="Publication">
        <Ligne etiquette="Statut">
          <Selecteur name="status" defaultValue={lieu?.status ?? 'draft'}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
            <option value="closed">Fermé définitivement</option>
          </Selecteur>
        </Ligne>
        <Ligne etiquette="Vérifié le" aide="Laisser vide si jamais vérifié">
          <Champ name="verified_at" type="date" defaultValue={lieu?.verified_at ?? ''} />
        </Ligne>
      </Section>
    </FormulaireAdmin>
  );
}
