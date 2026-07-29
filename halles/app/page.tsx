import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Halles — le quartier de votre hôtel, avantages compris',
  description:
    "Halles équipe les hôtels indépendants d'un guide de quartier : adresses sélectionnées et avantages négociés auprès des commerçants, accessibles par QR code depuis la chambre.",
};

/**
 * Site vitrine. Contenu volontairement minimal en phase 1 : la page de vente et
 * son référencement sont traités en phase 6, une fois le produit démontrable.
 */
export default function PageVitrine() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <p className="text-[0.78rem] uppercase tracking-[0.18em] text-encre-tres-doux">Paris</p>
      <h1 className="mt-4 text-[2.6rem] leading-[1.05]">
        Le quartier de votre hôtel,
        <br />
        avantages compris.
      </h1>

      <p className="mt-6 text-[1.05rem] leading-relaxed text-encre-doux">
        Vos clients scannent un QR code en chambre et découvrent les adresses que vous avez
        choisies, avec des avantages négociés chez chaque commerçant. Un apéritif offert, une
        remise, un dessert — sur simple présentation de leur écran.
      </p>

      <p className="mt-4 text-[1.05rem] leading-relaxed text-encre-doux">
        Ce que nous apportons n&apos;est pas une carte : c&apos;est un réseau de commerçants
        partenaires qu&apos;un hôtel seul ne peut pas négocier.
      </p>

      <div className="mt-10 border-t border-trait pt-6">
        <p className="text-[0.9rem] text-encre-tres-doux">
          Démonstration : <code className="font-mono">/h/lemarais</code>
        </p>
      </div>
    </main>
  );
}
