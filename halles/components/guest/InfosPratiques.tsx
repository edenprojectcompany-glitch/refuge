import { ArrowRight, MessageCircle, Phone, Wifi } from 'lucide-react';
import type { Hotel, Locale } from '@/lib/types';
import { avecLangue, creerTraducteur } from '@/lib/i18n';
import { BoutonCopier } from './BoutonCopier';

/**
 * Bloc d'infos pratiques de l'accueil : l'essentiel seulement.
 * Le reste vit sur /infos — on ne noie pas le wifi dans les horaires de pressing.
 */
export function InfosPratiques({
  hotel,
  locale,
  base,
}: {
  hotel: Hotel;
  locale: Locale;
  base: string;
}) {
  const t = creerTraducteur(locale);
  const telephoneWhatsapp = hotel.contact_whatsapp?.replace(/[^\d+]/g, '');

  return (
    <section className="px-5 pt-9 pb-10">
      <h2 className="text-[1.35rem]">{t('accueil.infosTitre')}</h2>

      <dl className="mt-4 divide-y divide-trait border border-trait bg-papier rounded-[4px]">
        {hotel.wifi_name ? (
          <div className="px-4 py-3.5">
            <dt className="flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.1em] text-encre-tres-doux">
              <Wifi aria-hidden size={14} strokeWidth={1.75} />
              {t('infos.wifi')}
            </dt>
            <dd className="mt-1.5 text-[0.95rem]">
              <span className="text-encre-doux">{t('infos.reseau')} </span>
              <span className="font-medium">{hotel.wifi_name}</span>
            </dd>
            {hotel.wifi_password ? (
              <dd className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[0.95rem]">
                <span>
                  <span className="text-encre-doux">{t('infos.motDePasse')} </span>
                  <span className="font-medium font-mono tracking-wide">{hotel.wifi_password}</span>
                </span>
                <BoutonCopier
                  valeur={hotel.wifi_password}
                  libelle={t('infos.copier')}
                  libelleCopie={t('infos.copie')}
                />
              </dd>
            ) : null}
          </div>
        ) : null}

        {hotel.breakfast_info ? (
          <LigneInfo titre={t('infos.petitDejeuner')} texte={hotel.breakfast_info} />
        ) : null}
        {hotel.checkout_info ? (
          <LigneInfo titre={t('infos.depart')} texte={hotel.checkout_info} />
        ) : null}
      </dl>

      {telephoneWhatsapp || hotel.contact_phone ? (
        <div className="mt-3 flex flex-wrap gap-2.5">
          {telephoneWhatsapp ? (
            <a
              href={`https://wa.me/${telephoneWhatsapp.replace('+', '')}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-trait-fort px-4 text-[0.9rem] font-medium rounded-[4px]"
            >
              <MessageCircle aria-hidden size={16} strokeWidth={1.75} />
              {t('infos.ecrireWhatsapp')}
            </a>
          ) : null}
          {hotel.contact_phone ? (
            <a
              href={`tel:${hotel.contact_phone}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-trait-fort px-4 text-[0.9rem] font-medium rounded-[4px]"
            >
              <Phone aria-hidden size={16} strokeWidth={1.75} />
              {t('infos.appelerHotel')}
            </a>
          ) : null}
        </div>
      ) : null}

      <a
        href={avecLangue(`${base}/infos`, locale)}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-medium"
        style={{ color: 'var(--couleur-hotel-accent)' }}
      >
        {t('accueil.toutesLesInfos')}
        <ArrowRight aria-hidden size={17} strokeWidth={1.75} />
      </a>
    </section>
  );
}

function LigneInfo({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="px-4 py-3.5">
      <dt className="text-[0.78rem] uppercase tracking-[0.1em] text-encre-tres-doux">{titre}</dt>
      <dd className="mt-1 text-[0.95rem] leading-snug">{texte}</dd>
    </div>
  );
}
