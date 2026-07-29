import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { envPublic, verifierEnvPublic } from '@/lib/env';

/**
 * Client serveur porteur de la session.
 *
 * Réservé aux surfaces authentifiées (back-office, tableau de bord) : il lit
 * les cookies, ce qui force le rendu dynamique. Les pages guest utilisent
 * `creerClientPublic()`, qui reste cacheable.
 */
export async function creerClientServeur() {
  verifierEnvPublic();
  const magasin = await cookies();

  return createServerClient(envPublic.supabaseUrl, envPublic.supabaseAnonKey, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: (aPoser) => {
        try {
          aPoser.forEach(({ name, value, options }) => magasin.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : la pose de cookies y est
          // interdite. Le middleware de session s'en charge.
        }
      },
    },
  });
}
