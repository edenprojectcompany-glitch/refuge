import type { JourStats } from '@/lib/stats';

/**
 * Courbe des scans sur trente jours, en SVG rendu côté serveur.
 *
 * Pas de bibliothèque de graphiques : un histogramme de trente barres se dessine
 * en vingt lignes, et l'hôtelier ouvre souvent ce lien depuis son téléphone à
 * la réception. Zéro kilo-octet de JavaScript pour la seule chose qu'il regarde
 * vraiment — est-ce que ça monte ou ça descend.
 */
export function Histogramme({ serie, couleur }: { serie: JourStats[]; couleur: string }) {
  const maximum = Math.max(1, ...serie.map((jour) => jour.sessions));
  const LARGEUR = 100;
  const HAUTEUR = 34;
  const pas = LARGEUR / Math.max(serie.length, 1);
  const largeurBarre = Math.max(pas * 0.62, 0.6);

  const premier = serie[0]?.day;
  const dernier = serie[serie.length - 1]?.day;
  const jourLisible = (jour?: string) =>
    jour
      ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
          new Date(`${jour}T12:00:00Z`),
        )
      : '';

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label={`Scans par jour sur ${serie.length} jours, maximum ${maximum}`}
      >
        {/* Repère du maximum, discret : sans échelle, une barre ne dit rien. */}
        <line x1="0" y1="0.5" x2={LARGEUR} y2="0.5" stroke="#e6dfd4" strokeWidth="0.3" />
        <line x1="0" y1={HAUTEUR / 2} x2={LARGEUR} y2={HAUTEUR / 2} stroke="#e6dfd4" strokeWidth="0.3" />

        {serie.map((jour, index) => {
          const hauteur = (jour.sessions / maximum) * (HAUTEUR - 1);
          return (
            <rect
              key={jour.day}
              x={index * pas + (pas - largeurBarre) / 2}
              y={HAUTEUR - hauteur}
              width={largeurBarre}
              height={Math.max(hauteur, jour.sessions > 0 ? 0.5 : 0)}
              fill={couleur}
              opacity={0.85}
            />
          );
        })}
      </svg>

      <figcaption className="mt-1.5 flex justify-between text-[0.75rem] text-encre-tres-doux">
        <span>{jourLisible(premier)}</span>
        <span className="tabular-nums">maximum {maximum} par jour</span>
        <span>{jourLisible(dernier)}</span>
      </figcaption>
    </figure>
  );
}
