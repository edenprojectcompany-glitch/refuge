import type { StyleSpecification } from 'maplibre-gl';

/**
 * Style de carte, écrit à la main sur le schéma Protomaps v4.
 *
 * Pas de thème tout fait : le fond doit prolonger le papier du guide, pas
 * ressembler à une carte de navigation. D'où une palette réduite au crème, au
 * blanc et à deux gris, et l'absence de tout ce qui n'aide pas un piéton —
 * frontières, limites administratives, points d'intérêt commerciaux (qui
 * feraient concurrence aux adresses sélectionnées par l'hôtel).
 */

const CREME = '#f4efe6';
const EAU = '#d9e2e4';
const VERT = '#e2e8dc';
const BATI = '#e9e2d6';
const ROUTE = '#ffffff';
const CONTOUR_ROUTE = '#e0d8c9';
const ENCRE = '#4a443c';
const ENCRE_CLAIRE = '#8a8177';

export function styleProtomaps(urlPmtiles: string, urlGlyphes: string): StyleSpecification {
  return {
    version: 8,
    glyphs: urlGlyphes,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${urlPmtiles}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> · <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'fond', type: 'background', paint: { 'background-color': CREME } },
      {
        id: 'terre',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'earth',
        paint: { 'fill-color': CREME },
      },
      {
        id: 'espaces-verts',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'kind'], ['literal', ['park', 'garden', 'forest', 'grass', 'cemetery', 'pedestrian']]],
        paint: { 'fill-color': VERT },
      },
      {
        id: 'eau',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: { 'fill-color': EAU },
      },
      {
        id: 'batiments',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'buildings',
        // Les bâtiments n'apparaissent qu'en zoom rapproché : à l'échelle du
        // quartier ils noirciraient la carte sans rien apprendre.
        minzoom: 14,
        paint: { 'fill-color': BATI, 'fill-opacity': 0.75 },
      },
      {
        id: 'routes-contour',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: {
          'line-color': CONTOUR_ROUTE,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 1.5, 16, 7, 19, 22],
        },
      },
      {
        id: 'routes',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: {
          'line-color': ROUTE,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0.6, 16, 5, 19, 18],
        },
      },
      {
        id: 'noms-rues',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'roads',
        minzoom: 15,
        filter: ['in', ['get', 'kind'], ['literal', ['major_road', 'medium_road', 'minor_road']]],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-letter-spacing': 0.02,
        },
        paint: {
          'text-color': ENCRE_CLAIRE,
          'text-halo-color': CREME,
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'noms-lieux',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'places',
        filter: ['in', ['get', 'kind'], ['literal', ['neighbourhood', 'macrohood', 'locality']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-letter-spacing': 0.08,
          'text-transform': 'uppercase',
        },
        paint: {
          'text-color': ENCRE,
          'text-halo-color': CREME,
          'text-halo-width': 1.6,
        },
      },
    ],
  };
}
