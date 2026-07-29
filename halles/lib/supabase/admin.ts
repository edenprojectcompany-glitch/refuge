import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { envPublic, serviceRoleKey, verifierEnvPublic } from '@/lib/env';

/**
 * Client service role : contourne la RLS.
 *
 * Réservé au back-office et aux crons, côté serveur exclusivement. L'import de
 * `server-only` fait échouer la compilation si ce module se retrouve dans un
 * bundle client.
 */
export function creerClientAdmin() {
  verifierEnvPublic();
  return createClient(envPublic.supabaseUrl, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
