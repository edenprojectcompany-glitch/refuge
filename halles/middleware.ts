import { NextResponse, type NextRequest } from 'next/server';
import { analyserHote, slugExiste, slugValide } from '@/lib/tenant';

/**
 * Aiguillage multi-tenant.
 *
 *   lemarais.halles.app/carte → réécrit vers /h/lemarais/carte
 *   halles.app/h/lemarais     → route native, sert de repli en dev et pour un
 *                               hôtel qui veut un lien simple
 *   halles.app/admin          → back-office, laissé passer
 *   halles.app                → site vitrine, laissé passer
 *
 * Un slug inconnu ou dépublié est réécrit vers /introuvable, qui répond 404 :
 * on ne veut pas qu'un sous-domaine expiré renvoie le site vitrine.
 */
export async function middleware(requete: NextRequest) {
  const surface = analyserHote(requete.headers.get('host'));
  const chemin = requete.nextUrl.pathname;

  // Mode chemin : on vérifie quand même l'existence du tenant.
  if (chemin.startsWith('/h/')) {
    const slug = chemin.split('/')[2] ?? '';
    if (!slugValide(slug) || !(await slugExiste(slug))) {
      return reecrireIntrouvable(requete);
    }
    return NextResponse.next();
  }

  if (surface.type === 'racine') return NextResponse.next();

  if (!(await slugExiste(surface.slug))) {
    return reecrireIntrouvable(requete);
  }

  const destination = requete.nextUrl.clone();
  destination.pathname = `/h/${surface.slug}${chemin === '/' ? '' : chemin}`;
  return NextResponse.rewrite(destination);
}

function reecrireIntrouvable(requete: NextRequest) {
  const destination = requete.nextUrl.clone();
  destination.pathname = '/introuvable';
  return NextResponse.rewrite(destination, { status: 404 });
}

export const config = {
  /*
   * Tout sauf les fichiers statiques et les routes d'API : le tracking et les
   * crons ne doivent pas payer la résolution de tenant.
   */
  matcher: ['/((?!api/|_next/|favicon.ico|manifest|icons/|.*\\.[\\w]+$).*)'],
};
