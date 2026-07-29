import 'server-only';
import { NextResponse } from 'next/server';
import { cronSecret } from '@/lib/env';

/**
 * Autorisation des routes de maintenance.
 *
 * Ces routes tournent avec le service role : sans secret partagé, n'importe qui
 * pourrait déclencher un rafraîchissement ou une purge. Renvoie une réponse à
 * retourner telle quelle en cas de refus, `null` si l'appel est légitime.
 */
export function autoriserCron(requete: Request): NextResponse | null {
  let attendu: string;
  try {
    attendu = cronSecret();
  } catch {
    // Secret non configuré : on refuse plutôt que d'ouvrir la route.
    return NextResponse.json({ erreur: 'cron_non_configure' }, { status: 503 });
  }

  const entete = requete.headers.get('authorization') ?? '';
  const fourni = entete.startsWith('Bearer ') ? entete.slice(7) : '';

  if (fourni !== attendu) {
    return NextResponse.json({ erreur: 'non_autorise' }, { status: 401 });
  }
  return null;
}
