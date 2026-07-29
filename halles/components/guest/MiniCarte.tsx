import type { Hotel, Locale } from '@/lib/types';

/**
 * Plan de situation d'un itinéraire.
 *
 * SVG rendu côté serveur plutôt qu'une seconde instance MapLibre : la page
 * d'itinéraire se lit souvent en marchant, et la carte complète du quartier est
 * à un seul geste de là. Ce plan répond à la seule question utile ici — dans
 * quel sens ça tourne et quelle étape est loin — pour zéro kilo-octet de
 * JavaScript.
 *
 * Projection équirectangulaire locale : sur un quartier, la déformation est
 * inférieure à l'épaisseur du trait.
 */
export function MiniCarte({
  hotel,
  points,
  locale,
}: {
  hotel: Hotel;
  points: Array<{ lat: number; lng: number; couleur: string; ordre: number; nom: string }>;
  locale: Locale;
}) {
  if (points.length === 0) return null;

  const LARGEUR = 340;
  const HAUTEUR = 200;
  const MARGE = 26;

  const cosLat = Math.cos((hotel.lat * Math.PI) / 180);
  const bruts = [
    { x: hotel.lng * cosLat, y: -hotel.lat, hotel: true, ordre: 0, couleur: '#1a1714', nom: hotel.name },
    ...points.map((point) => ({
      x: point.lng * cosLat,
      y: -point.lat,
      hotel: false,
      ordre: point.ordre,
      couleur: point.couleur,
      nom: point.nom,
    })),
  ];

  const xs = bruts.map((p) => p.x);
  const ys = bruts.map((p) => p.y);
  const etendueX = Math.max(...xs) - Math.min(...xs) || 1e-6;
  const etendueY = Math.max(...ys) - Math.min(...ys) || 1e-6;
  // Une seule échelle pour les deux axes : sinon le parcours serait déformé.
  const echelle = Math.min((LARGEUR - 2 * MARGE) / etendueX, (HAUTEUR - 2 * MARGE) / etendueY);

  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const places = bruts.map((point) => ({
    ...point,
    cx: LARGEUR / 2 + (point.x - centreX) * echelle,
    cy: HAUTEUR / 2 + (point.y - centreY) * echelle,
  }));

  const etapes = places.filter((point) => !point.hotel);
  const depart = places.find((point) => point.hotel);
  const trace = [depart, ...etapes]
    .filter((point): point is (typeof places)[number] => Boolean(point))
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.cx.toFixed(1)} ${point.cy.toFixed(1)}`)
    .join(' ');

  return (
    <figure className="border-y border-trait bg-[#f4efe6] px-4 py-3">
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          locale === 'fr'
            ? `Plan du parcours, ${etapes.length} étapes depuis l'hôtel`
            : `Route sketch, ${etapes.length} stops from the hotel`
        }
      >
        <path
          d={trace}
          fill="none"
          stroke="#b9ae9c"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />

        {depart ? (
          <rect
            x={depart.cx - 5}
            y={depart.cy - 5}
            width="10"
            height="10"
            fill="#1a1714"
            transform={`rotate(45 ${depart.cx} ${depart.cy})`}
          />
        ) : null}

        {etapes.map((point) => (
          <g key={point.ordre}>
            <circle cx={point.cx} cy={point.cy} r="10" fill={point.couleur} />
            <text
              x={point.cx}
              y={point.cy + 3.5}
              textAnchor="middle"
              fontSize="10"
              fill="#fffdf8"
              fontFamily="var(--font-texte)"
            >
              {point.ordre}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
