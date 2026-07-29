import type { Metadata } from 'next';
import { FormulaireConnexion } from '@/components/admin/FormulaireConnexion';

export const metadata: Metadata = {
  title: 'Connexion — Halles',
  robots: { index: false, follow: false },
};

const ERREURS: Record<string, string> = {
  acces: "Ce compte n'a pas accès au back-office.",
  'aucun-hotel': "Ce compte n'est rattaché à aucun hôtel. Contactez-nous.",
  lien: 'Ce lien de connexion a expiré ou a déjà servi. Demandez-en un nouveau.',
};

/**
 * Connexion par lien magique, sans mot de passe.
 *
 * La cible est un hôtelier peu technophile : un mot de passe de plus serait un
 * mot de passe oublié de plus, donc un appel de plus.
 */
export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ vers?: string; erreur?: string }>;
}) {
  const { vers, erreur } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-encre-tres-doux">Halles</p>
      <h1 className="mt-3 text-[2rem] leading-tight">Se connecter</h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-encre-doux">
        Entrez votre adresse : vous recevrez un lien de connexion valable une heure. Aucun mot de
        passe à retenir.
      </p>

      {erreur && ERREURS[erreur] ? (
        <p className="mt-5 border border-[#a2472f] px-4 py-3 text-[0.9rem] text-[#8a3d2c] rounded-[3px]">
          {ERREURS[erreur]}
        </p>
      ) : null}

      <FormulaireConnexion vers={vers ?? '/admin'} />
    </main>
  );
}
