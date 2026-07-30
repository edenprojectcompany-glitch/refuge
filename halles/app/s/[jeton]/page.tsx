import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Gift, MapPin, MousePointerClick, ScanLine, TrendingDown, TrendingUp } from 'lucide-react';
import { chargerStatsParJeton, totauxComparés } from '@/lib/data/stats-publiques';
import { evolution } from '@/lib/stats';
import { variablesTheme } from '@/lib/theme';
import { Histogramme } from '@/components/stats/Histogramme';
import type { CSSProperties } from 'react';

export const metadata: Metadata = {
  title: 'Votre guide en chiffres',
  robots: { index: false, follow: false },
};

/*
 * Ces chiffres bougent tous les jours et se lisent souvent le matin :
 * une minute de cache suffit à absorber un rechargement, pas plus.
 */
export const revalidate = 60;

/**
 * Ce que l'hôtelier voit de son guide.
 *
 * Pas de compte, pas de mot de passe : le lien est la clé. Il ne peut rien
 * modifier ici — c'est une page de constat, pas un outil. Ton rassurant,
 * chiffres gros, zéro jargon : cette page est l'argument de renouvellement de
 * l'abonnement, pas un tableau de bord d'analyste.
 */
export default async function PageStats({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const stats = await chargerStatsParJeton(jeton);
  if (!stats) notFound();

  const { courant, precedent } = totauxComparés(stats);
  const theme = variablesTheme(stats.couleur);
  const accent = theme['--couleur-hotel-accent'];

  // Virgule décimale et espace insécable avant le pour-cent : cette page est
  // lue par un hôtelier français, pas par un tableur.
  const parChambre =
    stats.chambres && stats.chambres > 0 ? courant.sessions / stats.chambres : null;
  const parChambreLisible =
    parChambre === null ? null : parChambre.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

  return (
    <div style={theme as CSSProperties} className="min-h-dvh">
      <header
        className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-7"
        style={{ backgroundColor: 'var(--couleur-hotel)', color: 'var(--couleur-hotel-texte)' }}
      >
        <p className="text-[0.7rem] uppercase tracking-[0.16em] opacity-70">{stats.ville}</p>
        <h1 className="mt-1 text-[1.9rem] leading-tight">{stats.nom}</h1>
        <p className="mt-2 text-[0.95rem] opacity-85">Votre guide sur les 30 derniers jours</p>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-12">
        {stats.demonstration ? (
          <p className="mt-5 border border-[#b07d20] bg-[#b07d20]/[0.06] px-4 py-3 text-[0.88rem] text-[#8a6318] rounded-[4px]">
            Aperçu de démonstration : la base n&apos;est pas encore connectée, les compteurs restent
            à zéro.
          </p>
        ) : null}

        <section className="mt-5 grid gap-2.5 sm:grid-cols-3">
          <Chiffre
            Icone={ScanLine}
            libelle="Scans du QR code"
            valeur={courant.sessions}
            evolution={evolution(courant.sessions, precedent.sessions)}
            accent={accent}
          />
          <Chiffre
            Icone={MousePointerClick}
            libelle="Clics vers vos partenaires"
            valeur={courant.clicsSortants}
            evolution={evolution(courant.clicsSortants, precedent.clicsSortants)}
            accent={accent}
          />
          <Chiffre
            Icone={Gift}
            libelle="Avantages consultés"
            valeur={courant.avantagesOuverts}
            evolution={evolution(courant.avantagesOuverts, precedent.avantagesOuverts)}
            accent={accent}
          />
        </section>

        <section className="mt-5 border border-trait bg-papier px-4 py-4 rounded-[4px]">
          <h2 className="font-texte text-[0.72rem] uppercase tracking-[0.12em] text-encre-tres-doux">
            Jour par jour
          </h2>
          <Histogramme serie={stats.serie} couleur={accent} />
        </section>

        {parChambre !== null ? (
          <p className="mt-4 border-l-2 pl-3.5 text-[0.95rem] leading-relaxed text-encre-doux"
             style={{ borderColor: accent }}>
            Soit{' '}
            <strong className="font-medium text-encre">
              {parChambreLisible} scan{parChambre >= 2 ? 's' : ''} par chambre
            </strong>{' '}
            sur
            le mois, pour {stats.chambres} chambres. Un client sur deux qui scanne est un bon
            résultat pour un support en chambre.
          </p>
        ) : null}

        {stats.lieux.length > 0 ? (
          <Classement
            titre="Les adresses les plus consultées"
            Icone={MapPin}
            entrees={stats.lieux}
            accent={accent}
          />
        ) : null}

        {stats.avantages.length > 0 ? (
          <Classement
            titre="Les avantages les plus montrés"
            Icone={Gift}
            entrees={stats.avantages}
            accent={accent}
          />
        ) : null}

        {stats.lieux.length === 0 && stats.avantages.length === 0 && !stats.demonstration ? (
          <p className="mt-5 border border-trait bg-papier px-4 py-5 text-center text-[0.92rem] leading-relaxed text-encre-doux rounded-[4px]">
            Pas encore assez de passage pour établir un classement. Les chiffres se remplissent dès
            que vos clients commencent à scanner.
          </p>
        ) : null}

        <p className="mt-8 text-[0.78rem] leading-relaxed text-encre-tres-doux">
          Ces chiffres sont anonymes : aucun nom, aucune adresse, aucun cookie. On compte des
          passages, jamais des personnes. Page mise à jour en continu — gardez le lien, il reste
          valable.
        </p>
      </main>
    </div>
  );
}

function Chiffre({
  Icone,
  libelle,
  valeur,
  evolution: variation,
  accent,
}: {
  Icone: typeof ScanLine;
  libelle: string;
  valeur: number;
  evolution: number | null;
  accent: string;
}) {
  return (
    <div className="border border-trait bg-papier px-4 py-4 rounded-[4px]">
      <p className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
        <Icone aria-hidden size={14} strokeWidth={1.75} style={{ color: accent }} />
        {libelle}
      </p>
      <p className="mt-2 text-[2.4rem] leading-none tabular-nums">{valeur}</p>

      {variation === null ? (
        <p className="mt-2 text-[0.8rem] text-encre-tres-doux">premier mois de mesure</p>
      ) : (
        <p
          className="mt-2 flex items-center gap-1.5 text-[0.8rem]"
          style={{ color: variation >= 0 ? '#33633c' : '#8a3d2c' }}
        >
          {variation >= 0 ? (
            <TrendingUp aria-hidden size={13} strokeWidth={2} />
          ) : (
            <TrendingDown aria-hidden size={13} strokeWidth={2} />
          )}
          {`${variation >= 0 ? '+' : ''}${variation}\u00a0% sur le mois précédent`}
        </p>
      )}
    </div>
  );
}

function Classement({
  titre,
  Icone,
  entrees,
  accent,
}: {
  titre: string;
  Icone: typeof MapPin;
  entrees: Array<{ libelle: string; total: number }>;
  accent: string;
}) {
  const maximum = Math.max(...entrees.map((e) => e.total), 1);

  return (
    <section className="mt-5 border border-trait bg-papier px-4 py-4 rounded-[4px]">
      <h2 className="flex items-center gap-2 font-texte text-[0.72rem] uppercase tracking-[0.12em] text-encre-tres-doux">
        <Icone aria-hidden size={14} strokeWidth={1.75} />
        {titre}
      </h2>

      <ol className="mt-3 flex flex-col gap-2">
        {entrees.map((entree, index) => (
          <li key={entree.libelle} className="flex items-center gap-3">
            <span className="w-4 text-[0.8rem] tabular-nums text-encre-tres-doux">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.95rem]">{entree.libelle}</span>
              {/* Barre de proportion : un classement sans échelle laisse croire
                  que le premier écrase le dernier, ou l'inverse. */}
              <span
                aria-hidden
                className="mt-1 block h-1 rounded-full"
                style={{
                  width: `${Math.max((entree.total / maximum) * 100, 4)}%`,
                  backgroundColor: accent,
                  opacity: 0.5,
                }}
              />
            </span>
            <span className="text-[0.9rem] tabular-nums text-encre-doux">{entree.total}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
