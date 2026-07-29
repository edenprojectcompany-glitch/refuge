import { cn } from '@/lib/ui';
import type { StatutContenu } from '@/lib/types';

const LIBELLES: Record<StatutContenu, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
  closed: 'Fermé',
};

const COULEURS: Record<StatutContenu, string> = {
  draft: 'border-[#b07d20] text-[#8a6318]',
  published: 'border-[#3f7a4a] text-[#33633c]',
  archived: 'border-trait-fort text-encre-tres-doux',
  closed: 'border-[#a2472f] text-[#8a3d2c]',
};

/** État d'un contenu, lisible d'un coup d'œil dans une table dense. */
export function PastilleStatut({ statut }: { statut: StatutContenu }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border px-2 text-[0.7rem] font-medium',
        COULEURS[statut],
      )}
    >
      {LIBELLES[statut]}
    </span>
  );
}

export function Pastille({
  className,
  ...reste
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border border-trait-fort px-2 text-[0.7rem] text-encre-doux',
        className,
      )}
      {...reste}
    />
  );
}
