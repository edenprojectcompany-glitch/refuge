import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase/serveur';

/**
 * Atterrissage du lien magique : échange le code contre une session.
 *
 * Le paramètre `vers` est validé comme chemin interne : sans cela, un lien
 * forgé pourrait rediriger vers un site tiers après authentification.
 */
export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const code = url.searchParams.get('code');
  const demande = url.searchParams.get('vers') ?? '/admin';
  const vers = demande.startsWith('/') && !demande.startsWith('//') ? demande : '/admin';

  if (!code) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien', url.origin));
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien', url.origin));
  }
  return NextResponse.redirect(new URL(vers, url.origin));
}
