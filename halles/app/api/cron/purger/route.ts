import { NextResponse } from 'next/server';
import { creerClientAdmin } from '@/lib/supabase/admin';
import { autoriserCron } from '@/lib/cron';

/**
 * Purge les événements de plus de treize mois.
 *
 * Treize mois : assez pour comparer une saison à la précédente, pas un jour de
 * plus. La minimisation des durées de conservation fait partie de ce qui rend
 * la mesure d'audience exemptable de consentement (voir docs/rgpd.md).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(requete: Request) {
  const refus = autoriserCron(requete);
  if (refus) return refus;

  const supabase = creerClientAdmin();
  const { data, error } = await supabase.rpc('purge_old_events');

  if (error) {
    console.error('[cron] purge impossible', error.message);
    return NextResponse.json({ ok: false, erreur: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, supprimes: data ?? 0 });
}
