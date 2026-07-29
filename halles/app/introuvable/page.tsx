import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guide introuvable',
  robots: { index: false, follow: false },
};

/**
 * Réponse aux sous-domaines inconnus ou dépubliés.
 *
 * Le middleware réécrit vers cette page avec un statut 404 : un QR code d'un
 * hôtel qui a résilié ne doit pas renvoyer le site vitrine, ni une erreur brute.
 */
export default function PageIntrouvable() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="text-[0.78rem] uppercase tracking-[0.14em] text-encre-tres-doux">Erreur 404</p>
      <h1 className="mt-3 text-[2rem]">Ce guide n&apos;existe pas</h1>
      <p className="mt-4 text-[0.98rem] leading-relaxed text-encre-doux">
        L&apos;adresse demandée ne correspond à aucun guide en ligne. Si vous avez scanné un QR code
        dans votre chambre, signalez-le à la réception de l&apos;hôtel.
      </p>
      <p className="mt-8 text-[0.9rem] text-encre-tres-doux">
        <span lang="en">
          This address does not match any published guide. If you scanned a QR code in your room,
          please let the front desk know.
        </span>
      </p>
    </main>
  );
}
