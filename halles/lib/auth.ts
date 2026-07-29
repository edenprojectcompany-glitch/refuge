import 'server-only';
import { redirect } from 'next/navigation';
import { creerClientServeur } from '@/lib/supabase/serveur';
import { creerClientAdmin } from '@/lib/supabase/admin';
import type { RoleUtilisateur } from '@/lib/types';

/**
 * Identité et autorisation des surfaces authentifiées.
 *
 * Le rôle est toujours relu en base, jamais déduit d'un jeton ou d'un cookie :
 * un utilisateur ne doit pas pouvoir se promouvoir en modifiant son propre
 * stockage.
 */

export interface Utilisateur {
  id: string;
  email: string | null;
  role: RoleUtilisateur;
  nom: string | null;
}

export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Lecture par le service role : la policy de `profiles` n'autorise que sa
  // propre ligne, ce qui suffirait, mais on veut aussi pouvoir lire le rôle
  // même si les policies évoluent.
  const admin = creerClientAdmin();
  const { data } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (data?.role as RoleUtilisateur) ?? 'hotelier',
    nom: (data?.full_name as string | null) ?? null,
  };
}

/** Exige un administrateur ; redirige sinon. */
export async function exigerAdmin(): Promise<Utilisateur> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) redirect('/connexion?vers=/admin');
  if (utilisateur.role !== 'admin') redirect('/connexion?erreur=acces');
  return utilisateur;
}

/** Exige un hôtelier rattaché à au moins un hôtel ; redirige sinon. */
export async function exigerHotelier(): Promise<{ utilisateur: Utilisateur; hotelIds: string[] }> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) redirect('/connexion?vers=/dashboard');

  const admin = creerClientAdmin();
  const { data } = await admin.from('hotel_users').select('hotel_id').eq('user_id', utilisateur.id);
  const hotelIds = (data ?? []).map((ligne) => ligne.hotel_id as string);

  if (hotelIds.length === 0 && utilisateur.role !== 'admin') {
    redirect('/connexion?erreur=aucun-hotel');
  }
  return { utilisateur, hotelIds };
}
