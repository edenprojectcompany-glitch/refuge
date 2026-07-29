import type { Metadata } from 'next';
import { Building2, Gift, Home, MapPin } from 'lucide-react';
import { exigerAdmin } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Back-office — Halles',
  robots: { index: false, follow: false },
};

/**
 * Coquille du back-office.
 *
 * Le garde-fou est ici : toute page dessous est protégée sans avoir à y penser.
 * Densité assumée — c'est un outil de production, pas une vitrine.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const utilisateur = await exigerAdmin();

  const entrees = [
    { href: '/admin', libelle: 'Vue d’ensemble', Icone: Home },
    { href: '/admin/hotels', libelle: 'Hôtels', Icone: Building2 },
    { href: '/admin/lieux', libelle: 'Lieux', Icone: MapPin },
    { href: '/admin/avantages', libelle: 'Avantages', Icone: Gift },
  ];

  return (
    <div className="min-h-dvh bg-creme">
      <header className="border-b border-trait bg-papier">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5">
          <a href="/admin" className="text-[1.05rem] font-titre">
            Halles
          </a>

          <nav aria-label="Back-office" className="flex flex-1 flex-wrap gap-1">
            {entrees.map(({ href, libelle, Icone }) => (
              <a
                key={href}
                href={href}
                className="flex h-9 items-center gap-2 rounded-[3px] px-2.5 text-[0.88rem] text-encre-doux hover:bg-creme"
              >
                <Icone aria-hidden size={15} strokeWidth={1.75} />
                {libelle}
              </a>
            ))}
          </nav>

          <p className="text-[0.8rem] text-encre-tres-doux">{utilisateur.email}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
    </div>
  );
}
