import { cn } from '@/lib/ui';

/** Champs de saisie du back-office : lisibles, denses, sans fioriture. */
export function Champ({ className, ...reste }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-[3px] border border-trait-fort bg-papier px-2.5 text-[0.9rem]',
        'placeholder:text-encre-tres-doux focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-encre',
        className,
      )}
      {...reste}
    />
  );
}

export function ZoneTexte({
  className,
  ...reste
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-[3px] border border-trait-fort bg-papier px-2.5 py-2 text-[0.9rem] leading-relaxed',
        'placeholder:text-encre-tres-doux focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-encre',
        className,
      )}
      {...reste}
    />
  );
}

export function Selecteur({
  className,
  ...reste
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-[3px] border border-trait-fort bg-papier px-2 text-[0.9rem]',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-encre',
        className,
      )}
      {...reste}
    />
  );
}

export function Etiquette({
  className,
  ...reste
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-[0.72rem] font-medium uppercase tracking-[0.1em] text-encre-tres-doux',
        className,
      )}
      {...reste}
    />
  );
}
