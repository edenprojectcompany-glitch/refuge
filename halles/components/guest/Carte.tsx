'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as CarteMapLibre } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CategorieLieu, Hotel, LieuDuGuide, Locale } from '@/lib/types';
import { COULEURS_CATEGORIES } from '@/lib/categories';
import { styleProtomaps } from '@/lib/carte/style';
import { envPublic } from '@/lib/env';
import { avantagesActifs } from '@/lib/perks';
import { creerTraducteur } from '@/lib/i18n';
import { suivre } from '@/lib/analytics';
import { FeuilleLieu } from './FeuilleLieu';

/**
 * Carte MapLibre sur tuiles Protomaps auto-hébergées.
 *
 * Chargée en import dynamique depuis la page : la bibliothèque pèse plus que
 * tout le reste du guide réuni, et l'écran doit être utile avant qu'elle arrive.
 */
export function Carte({
  hotel,
  lieux,
  locale,
  base,
  categorieInitiale,
  selection,
  onSelection,
}: {
  hotel: Hotel;
  lieux: LieuDuGuide[];
  locale: Locale;
  base: string;
  categorieInitiale: CategorieLieu | null;
  /* La sélection est portée par le parent : c'est lui qui masque la bascule
     liste/carte quand une feuille est ouverte, pour éviter le chevauchement. */
  selection: LieuDuGuide | null;
  onSelection: (lieu: LieuDuGuide | null) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const marqueurs = useRef<maplibregl.Marker[]>([]);
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);
  const t = creerTraducteur(locale);

  // --- Initialisation, une seule fois ---
  useEffect(() => {
    if (!conteneur.current || carte.current) return;

    // Le protocole pmtiles permet à MapLibre de lire un unique fichier par
    // requêtes de plage, sans serveur de tuiles.
    const protocole = new Protocol();
    maplibregl.addProtocol('pmtiles', protocole.tile);

    const instance = new maplibregl.Map({
      container: conteneur.current,
      style: styleProtomaps(envPublic.pmtilesUrl, envPublic.glyphsUrl),
      center: [hotel.lng, hotel.lat],
      zoom: 15.2,
      attributionControl: { compact: true },
      // Le guide se tient d'une main : pas de rotation involontaire au pouce.
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    instance.on('load', () => setPret(true));
    /*
     * Tuiles injoignables : sans ce garde-fou, le voile de chargement resterait
     * en place indéfiniment et bloquerait l'écran — y compris le bouton qui
     * ramène à la liste. Une panne de tuiles doit dégrader, pas emprisonner.
     */
    instance.on('error', () => setEchec(true));
    instance.on('dragend', () =>
      suivre({ hotelId: hotel.id, type: 'map_interaction', locale, meta: { geste: 'deplacement' } }),
    );

    carte.current = instance;

    return () => {
      instance.remove();
      carte.current = null;
      maplibregl.removeProtocol('pmtiles');
    };
  }, [hotel.id, hotel.lat, hotel.lng, locale]);

  // --- Marqueurs, redessinés quand le filtre change ---
  useEffect(() => {
    const instance = carte.current;
    if (!instance) return;

    marqueurs.current.forEach((marqueur) => marqueur.remove());
    marqueurs.current = [];

    const marqueurHotel = new maplibregl.Marker({ element: elementHotel() })
      .setLngLat([hotel.lng, hotel.lat])
      .addTo(instance);
    marqueurs.current.push(marqueurHotel);

    const visibles = categorieInitiale
      ? lieux.filter((lieu) => lieu.category === categorieInitiale)
      : lieux;

    visibles.forEach((lieu) => {
      const aUnAvantage = avantagesActifs(lieu).length > 0;
      const element = elementLieu(lieu.category, aUnAvantage, lieu.name);

      element.addEventListener('click', () => {
        onSelection(lieu);
        instance.easeTo({ center: [lieu.lng, lieu.lat], duration: 400, offset: [0, -110] });
        suivre({ hotelId: hotel.id, type: 'place_view', placeId: lieu.id, locale });
      });

      marqueurs.current.push(
        new maplibregl.Marker({ element }).setLngLat([lieu.lng, lieu.lat]).addTo(instance),
      );
    });

    // Cadrer sur les lieux visibles plus l'hôtel, avec de la marge sous la
    // feuille du bas.
    if (visibles.length > 0) {
      const limites = new maplibregl.LngLatBounds([hotel.lng, hotel.lat], [hotel.lng, hotel.lat]);
      visibles.forEach((lieu) => limites.extend([lieu.lng, lieu.lat]));
      instance.fitBounds(limites, { padding: { top: 70, bottom: 150, left: 50, right: 50 }, maxZoom: 16.5, duration: 0 });
    }
  }, [lieux, categorieInitiale, hotel.id, hotel.lat, hotel.lng, locale, onSelection]);

  return (
    <div className="relative flex-1">
      {/*
        Dimensions en style inline, et non en classe utilitaire : la feuille de
        style de MapLibre déclare `.maplibregl-map { position: relative }` et,
        chargée après Tailwind, écrasait `absolute inset-0`. Le conteneur se
        retrouvait à hauteur nulle, le canvas débordait à une taille par défaut
        et plus aucun marqueur n'était atteignable au doigt.
      */}
      <div
        ref={conteneur}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-label={t('carte.titre')}
        role="application"
      />

      {!pret && !echec ? (
        <div className="absolute inset-0 flex items-center justify-center bg-creme">
          <p className="text-[0.9rem] text-encre-tres-doux">{t('carte.chargement')}</p>
        </div>
      ) : null}

      {echec && !pret ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <p className="border border-trait-fort bg-papier px-3 py-2 text-center text-[0.85rem] text-encre-doux rounded-[4px]">
            {t('carte.indisponible')} {t('carte.indisponibleTexte')}
          </p>
        </div>
      ) : null}

      {selection ? (
        <FeuilleLieu
          lieu={selection}
          hotel={hotel}
          locale={locale}
          base={base}
          onFermer={() => onSelection(null)}
        />
      ) : null}
    </div>
  );
}

/** Pastille d'un lieu : couleur de catégorie, anneau doré si avantage actif. */
function elementLieu(categorie: CategorieLieu, avantage: boolean, nom: string): HTMLElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.setAttribute('aria-label', nom);
  bouton.style.cssText = [
    'width:22px',
    'height:22px',
    'border-radius:50%',
    `background:${COULEURS_CATEGORIES[categorie]}`,
    avantage ? 'box-shadow:0 0 0 3px #f7d98a, 0 0 0 4.5px rgba(0,0,0,.18)' : 'box-shadow:0 0 0 2px #fffdf8',
    'cursor:pointer',
    'padding:0',
    'border:none',
  ].join(';');
  return bouton;
}

/** Marqueur de l'hôtel : forme et couleur différentes, jamais filtré. */
function elementHotel(): HTMLElement {
  const element = document.createElement('div');
  element.style.cssText = [
    'width:16px',
    'height:16px',
    'background:#1a1714',
    'border:3px solid #fffdf8',
    'transform:rotate(45deg)',
    'box-shadow:0 1px 3px rgba(0,0,0,.35)',
  ].join(';');
  return element;
}
