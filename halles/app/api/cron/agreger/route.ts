import { NextResponse } from 'next/server';
import { creerClientAdmin } from '@/lib/supabase/admin';
import { autoriserCron } from '@/lib/cron';

/**
 * Rafraîchit la vue d'agrégation quotidienne.
 *
 * Le tableau de bord ne requête jamais `events` en direct : sans ce cron, ses
 * chiffres se figent. Planifié chaque nuit dans vercel.json.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(requete: Request) {
  const refus = autoriserCron(requete);
  if (refus) return refus;

  const supabase = creerClientAdmin();
  const { error } = await supabase.rpc('refresh_daily_stats');

  if (error) {
    console.error('[cron] agrégation impossible', error.message);
    return NextResponse.json({ ok: false, erreur: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, agrege: true });
}
