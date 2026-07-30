'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { List, MapIcon } from 'lucide-react';
import type { CategorieLieu, Hotel, LieuDuGuide, Locale } from '@/lib/types';
import { COULEURS_CATEGORIES, ORDRE_CATEGORIES } from '@/lib/categories';
import { creerTraducteur } from '@/lib/i18n';
import { envPublic } from '@/lib/env';

/*
 * MapLibre ne sait pas se rendre côté serveur, et pèse davantage que tout le
 * reste du guide : import dynamique, sans SSR, avec un fond crème en attendant.
 */
const Carte = dynamic(() => import('./Carte').then((module) => module.Carte), {
  ssr: false,
  loading: () => <div className="flex-1 bg-creme" />,
});

/**
 * Écran carte : bascule entre carte et liste, filtres par catégorie.
 *
 * La liste est rendue côté serveur et passée en `children` : elle est lisible
 * immédiatement, avant même que la bibliothèque de carte soit téléchargée.
 * C'est la seule façon de tenir sur le wifi d'un hôtel.
 */
export function VueCarte({
  hotel,
  lieux,
  locale,
  base,
  categorieInitiale,
  children,
}: {
  hotel: Hotel;
  lieux: LieuDuGuide[];
  locale: Locale;
  base: string;
  categorieInitiale: CategorieLieu | null;
  children: React.ReactNode;
}) {
  const t = creerTraducteur(locale);
  const carteDisponible = envPublic.pmtilesUrl !== '';

  const [categorie, setCategorie] = useState<CategorieLieu | null>(categorieInitiale);
  const [selection, setSelection] = useState<LieuDuGuide | null>(null);
  const [mode, setMode] = useState<'carte' | 'liste'>(carteDisponible ? 'carte' : 'liste');

  const presentes = ORDRE_CATEGORIES.filter((valeur) =>
    lieux.some((lieu) => lieu.category === valeur),
  );

  function changerCategorie(valeur: CategorieLieu | null) {
    setCategorie(valeur);
    setSelection(null);
    // L'URL suit le filtre sans recharger : un lien partagé rouvre la même vue.
    const url = new URL(window.location.href);
    if (valeur) url.searchParams.set('categorie', valeur);
    else url.searchParams.delete('categorie');
    window.history.replaceState(null, '', url);
  }

  const visibles = categorie ? lieux.filter((lieu) => lieu.category === categorie) : lieux;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filtres : défilement horizontal, une seule ligne, pouce en bas d'écran */}
      <div className="shrink-0 border-b border-trait bg-creme">
        <div
          role="group"
          aria-label={t('carte.filtres')}
          className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Puce active={categorie === null} onClick={() => changerCategorie(null)}>
            {t('commun.tout')}
          </Puce>
          {presentes.map((valeur) => (
            <Puce
              key={valeur}
              active={categorie === valeur}
              couleur={COULEURS_CATEGORIES[valeur]}
              onClick={() => changerCategorie(valeur)}
            >
              {t(`categories.${valeur}`)}
            </Puce>
          ))}
        </div>
      </div>

      {mode === 'carte' && carteDisponible ? (
        <Carte
          hotel={hotel}
          lieux={lieux}
          locale={locale}
          base={base}
          categorieInitiale={categorie}
          selection={selection}
          onSelection={setSelection}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {!carteDisponible ? (
            <p className="border-b border-trait bg-papier px-5 py-3 text-[0.85rem] text-encre-doux">
              {t('carte.indisponible')} {t('carte.indisponibleTexte')}
            </p>
          ) : null}
          {/* Liste rendue côté serveur, filtrée côté client */}
          <div data-categorie-active={categorie ?? 'toutes'}>
            {visibles.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.9rem] text-encre-doux">
                {t('commun.aucunResultat')}
              </p>
            ) : null}
            <ListeFiltree categorie={categorie}>{children}</ListeFiltree>
          </div>
        </div>
      )}

      {/* Masquée quand une feuille est ouverte : les deux occupaient le même
          espace sous le pouce et se chevauchaient. */}
      {carteDisponible && !selection ? (
        <button
          type="button"
          onClick={() => setMode(mode === 'carte' ? 'liste' : 'carte')}
          className="fixed left-1/2 z-20 flex min-h-11 -translate-x-1/2 items-center gap-2 border border-trait-fort bg-papier px-4 text-[0.9rem] font-medium rounded-full shadow-[0_1px_8px_rgba(26,23,20,0.12)]"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
        >
          {mode === 'carte' ? (
            <>
              <List aria-hidden size={16} strokeWidth={1.75} />
              {t('commun.liste')}
            </>
          ) : (
            <>
              <MapIcon aria-hidden size={16} strokeWidth={1.75} />
              {t('commun.carte')}
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Masque en CSS les entrées de la liste serveur hors catégorie.
 * Refaire la liste côté client dupliquerait le rendu et le doublerait en poids.
 */
function ListeFiltree({
  categorie,
  children,
}: {
  categorie: CategorieLieu | null;
  children: React.ReactNode;
}) {
  return (
    <>
      {categorie ? (
        <style>{`[data-lieu-categorie]:not([data-lieu-categorie="${categorie}"]){display:none}`}</style>
      ) : null}
      {children}
    </>
  );
}

function Puce({
  active,
  couleur,
  onClick,
  children,
}: {
  active: boolean;
  couleur?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // min-h-11 : 44 px, la cible tactile minimale. Les filtres se tapotent en
  // marchant, souvent d'une main.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border px-3.5 text-[0.85rem] rounded-full"
      style={{
        borderColor: active ? 'var(--couleur-hotel-accent)' : 'var(--color-trait-fort)',
        backgroundColor: active ? 'var(--couleur-hotel-accent)' : 'transparent',
        color: active ? '#fffdf8' : undefined,
      }}
    >
      {couleur && !active ? (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: couleur }}
        />
      ) : null}
      {children}
    </button>
  );
}
