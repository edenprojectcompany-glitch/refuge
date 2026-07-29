import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/ui';

/**
 * Bouton du back-office.
 *
 * Densité assumée : c'est un outil de production, pas une page marketing.
 * Hauteur minimale 36 px à la souris, 44 px pour les actions principales que
 * l'on peut atteindre au doigt.
 */
const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-[3px] text-[0.88rem] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre',
  {
    variants: {
      variante: {
        primaire: 'bg-encre text-creme hover:bg-encre/90',
        secondaire: 'border border-trait-fort bg-papier hover:bg-creme',
        discret: 'text-encre-doux hover:bg-creme',
        danger: 'border border-[#a2472f] text-[#8a3d2c] hover:bg-[#a2472f]/10',
      },
      taille: {
        normal: 'h-9 px-3.5',
        grand: 'h-11 px-5',
        petit: 'h-8 px-2.5 text-[0.82rem]',
        icone: 'h-9 w-9',
      },
    },
    defaultVariants: { variante: 'secondaire', taille: 'normal' },
  },
);

export type ProprietesBouton = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles>;

export function Bouton({ className, variante, taille, ...reste }: ProprietesBouton) {
  return <button className={cn(styles({ variante, taille }), className)} {...reste} />;
}

export function LienBouton({
  className,
  variante,
  taille,
  ...reste
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & VariantProps<typeof styles>) {
  return <a className={cn(styles({ variante, taille }), className)} {...reste} />;
}
