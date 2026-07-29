import {
  Croissant,
  Coffee,
  EggFried,
  Footprints,
  Landmark,
  LifeBuoy,
  Moon,
  ShoppingBag,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import type { CategorieLieu, Locale } from '@/lib/types';
import { avecLangue, creerTraducteur } from '@/lib/i18n';

/** Une icône par catégorie ; jeu lucide-react exclusivement. */
const ICONES: Record<CategorieLieu, typeof Coffee> = {
  restaurant: UtensilsCrossed,
  bar: Wine,
  cafe: Coffee,
  boulangerie: Croissant,
  brunch: EggFried,
  culture: Landmark,
  shopping: ShoppingBag,
  balade: Footprints,
  pratique: LifeBuoy,
  nuit: Moon,
};

/**
 * Grille de catégories, deux colonnes, cibles tactiles pleine largeur.
 * Une catégorie sans adresse dans ce guide n'est pas affichée : mieux vaut
 * quatre entrées utiles que dix dont six sont vides.
 */
export function GrilleCategories({
  comptes,
  locale,
  base,
}: {
  comptes: Array<{ categorie: CategorieLieu; total: number }>;
  locale: Locale;
  base: string;
}) {
  const t = creerTraducteur(locale);
  if (comptes.length === 0) return null;

  return (
    <section className="px-5 pt-9">
      <h2 className="text-[1.35rem]">{t('accueil.categoriesTitre')}</h2>

      <ul className="mt-4 grid grid-cols-2 gap-2.5">
        {comptes.map(({ categorie, total }) => {
          const Icone = ICONES[categorie];
          return (
            <li key={categorie}>
              <a
                href={avecLangue(`${base}/carte?categorie=${categorie}`, locale)}
                className="flex min-h-[4.5rem] flex-col justify-between border border-trait bg-papier px-3.5 py-3 rounded-[4px]"
              >
                <Icone
                  aria-hidden
                  size={20}
                  strokeWidth={1.5}
                  style={{ color: 'var(--couleur-hotel-accent)' }}
                />
                <span className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-[0.95rem]">{t(`categories.${categorie}`)}</span>
                  <span className="text-[0.8rem] text-encre-tres-doux tabular-nums">{total}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
