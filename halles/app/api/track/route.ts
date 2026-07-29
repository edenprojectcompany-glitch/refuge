import { NextResponse } from 'next/server';
import { z } from 'zod';
import { creerClientEcriture } from '@/lib/supabase/public';

/**
 * Ingestion des événements de mesure d'audience.
 *
 * Écrit avec la clé anonyme, donc soumis à la policy `events_insertion_publique` :
 * l'hôtel visé doit exister et être publié, et rien ne peut être relu. La route
 * n'a volontairement aucun privilège élevé — un endpoint public qui écrirait
 * avec le service role serait une porte ouverte.
 *
 * L'agrégation, les crons et le tableau de bord arrivent en phase 3.
 */
export const runtime = 'nodejs';

const schema = z.object({
  hotel_id: z.string().uuid(),
  session_id: z.string().min(8).max(64),
  type: z.enum([
    'session_start',
    'page_view',
    'place_view',
    'outbound_click',
    'perk_view',
    'perk_open',
    'itinerary_view',
    'contact_click',
    'map_interaction',
  ]),
  place_id: z.string().uuid().nullable().optional(),
  perk_id: z.string().uuid().nullable().optional(),
  source: z.enum(['chambre', 'reception', 'carte-cle', 'autre']).nullable().optional(),
  locale: z.enum(['fr', 'en']).nullable().optional(),
  // Borné : `meta` ne doit jamais devenir un fourre-tout où finiraient des
  // données personnelles.
  meta: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()]))
    .optional(),
});

export async function POST(requete: Request) {
  let charge: unknown;
  try {
    charge = await requete.json();
  } catch {
    return NextResponse.json({ erreur: 'json_invalide' }, { status: 400 });
  }

  const resultat = schema.safeParse(charge);
  if (!resultat.success) {
    return NextResponse.json({ erreur: 'evenement_invalide' }, { status: 400 });
  }

  const { meta, ...evenement } = resultat.data;
  const supabase = creerClientEcriture();
  const { error } = await supabase.from('events').insert({ ...evenement, meta: meta ?? {} });

  if (error) {
    // Une mesure perdue ne vaut pas une erreur visible côté client : on trace
    // côté serveur et on répond 204 quoi qu'il arrive.
    console.error('[track] insertion refusée', error.message);
  }

  return new NextResponse(null, { status: 204 });
}
