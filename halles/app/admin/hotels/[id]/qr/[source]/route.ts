import { NextResponse } from 'next/server';
import { exigerAdmin } from '@/lib/auth';
import { chargerHotelAdmin } from '@/lib/admin/data';
import { EMPLACEMENTS, estEmplacement, genererChevalet } from '@/lib/admin/qr';
import { envPublic } from '@/lib/env';

/**
 * Téléchargement d'un chevalet A5.
 *
 * Route et non action serveur : le résultat est un fichier, que le navigateur
 * doit pouvoir enregistrer d'un clic.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string; source: string }> },
) {
  await exigerAdmin();

  const { id, source } = await params;
  if (!estEmplacement(source)) {
    return NextResponse.json({ erreur: 'emplacement_inconnu' }, { status: 404 });
  }

  const hotel = await chargerHotelAdmin(id);
  if (!hotel) return NextResponse.json({ erreur: 'hotel_introuvable' }, { status: 404 });

  const pdf = await genererChevalet(hotel, EMPLACEMENTS[source], envPublic.rootDomain);

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="halles-${hotel.slug}-${source}.pdf"`,
      // Le fichier dépend du slug et de la couleur : jamais de cache partagé.
      'Cache-Control': 'no-store',
    },
  });
}
