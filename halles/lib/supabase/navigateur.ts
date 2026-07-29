'use client';

import { createBrowserClient } from '@supabase/ssr';
import { envPublic } from '@/lib/env';

/** Client navigateur, utilisé par l'authentification du dashboard (phase 5). */
export function creerClientNavigateur() {
  return createBrowserClient(envPublic.supabaseUrl, envPublic.supabaseAnonKey);
}
