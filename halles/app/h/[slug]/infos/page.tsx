import { notFound } from 'next/navigation';
import { Bus, Coffee, DoorOpen, LogOut, MapPin, MessageCircle, Phone, Wifi } from 'lucide-react';
import { chargerHotel } from '@/lib/data/guide';
import { creerTraducteur, resoudreLocale } from '@/lib/i18n';
import { EnTeteEcran } from '@/components/guest/EnTeteEcran';
import { BarreNavigation } from '@/components/guest/BarreNavigation';
import { BoutonCopier } from '@/components/guest/BoutonCopier';
import { SuiviEcran } from '@/components/guest/SuiviEcran';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function PageInfos({ params, searchParams }: Props) {
  const [{ slug }, requete] = await Promise.all([params, searchParams]);

  const hotel = await chargerHotel(slug);
  if (!hotel) notFound();

  const locale = resoudreLocale(requete.lang, hotel.default_locale);
  const t = creerTraducteur(locale);
  const base = `/h/${slug}`;
  const whatsapp = hotel.contact_whatsapp?.replace(/[^\d]/g, '');

  const blocs = [
    { cle: 'petitDejeuner', Icone: Coffee, titre: t('infos.petitDejeuner'), texte: hotel.breakfast_info },
    { cle: 'arrivee', Icone: DoorOpen, titre: t('infos.arrivee'), texte: hotel.checkin_info },
    { cle: 'depart', Icone: LogOut, titre: t('infos.depart'), texte: hotel.checkout_info },
    { cle: 'transports', Icone: Bus, titre: t('infos.transports'), texte: hotel.transport_info },
    { cle: 'adresse', Icone: MapPin, titre: t('infos.adresse'), texte: hotel.address },
  ].filter((bloc): bloc is typeof bloc & { texte: string } => Boolean(bloc.texte));

  return (
    <div lang={locale} className="flex min-h-dvh flex-col">
      <EnTeteEcran titre={t('infos.titre')} retourHref={base} locale={locale} />

      <main className="flex-1 px-5 pt-5 pb-8">
        {hotel.wifi_name ? (
          <section className="border border-trait-fort bg-papier px-4 py-4 rounded-[4px]">
            <h2 className="flex items-center gap-2 font-texte text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
              <Wifi aria-hidden size={14} strokeWidth={1.75} />
              {t('infos.wifi')}
            </h2>
            <p className="mt-2.5 text-[1rem]">
              <span className="text-encre-doux">{t('infos.reseau')} </span>
              <span className="font-medium">{hotel.wifi_name}</span>
            </p>
            {hotel.wifi_password ? (
              <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[1rem]">
                <span>
                  <span className="text-encre-doux">{t('infos.motDePasse')} </span>
                  <span className="font-mono font-medium tracking-wide">{hotel.wifi_password}</span>
                </span>
                <BoutonCopier
                  valeur={hotel.wifi_password}
                  libelle={t('infos.copier')}
                  libelleCopie={t('infos.copie')}
                />
              </p>
            ) : null}
          </section>
        ) : null}

        <dl className="mt-3 divide-y divide-trait border border-trait bg-papier rounded-[4px]">
          {blocs.map(({ cle, Icone, titre, texte }) => (
            <div key={cle} className="px-4 py-3.5">
              <dt className="flex items-center gap-2 font-texte text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
                <Icone aria-hidden size={14} strokeWidth={1.75} />
                {titre}
              </dt>
              <dd className="mt-1.5 text-[0.98rem] leading-relaxed">{texte}</dd>
            </div>
          ))}
        </dl>

        {/* Blocs libres saisis par l'hôtelier depuis son tableau de bord */}
        {hotel.custom_blocks.length > 0 ? (
          <dl className="mt-3 divide-y divide-trait border border-trait bg-papier rounded-[4px]">
            {hotel.custom_blocks.map((bloc, index) => (
              <div key={`${bloc.title}-${index}`} className="px-4 py-3.5">
                <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-encre-tres-doux">
                  {bloc.title}
                </dt>
                <dd className="mt-1.5 text-[0.98rem] leading-relaxed">{bloc.body}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {whatsapp || hotel.contact_phone ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 border border-trait-fort px-4 text-[0.92rem] font-medium rounded-[4px]"
              >
                <MessageCircle aria-hidden size={16} strokeWidth={1.75} />
                {t('infos.ecrireWhatsapp')}
              </a>
            ) : null}
            {hotel.contact_phone ? (
              <a
                href={`tel:${hotel.contact_phone}`}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 border border-trait-fort px-4 text-[0.92rem] font-medium rounded-[4px]"
              >
                <Phone aria-hidden size={16} strokeWidth={1.75} />
                {t('infos.appelerHotel')}
              </a>
            ) : null}
          </div>
        ) : null}
      </main>

      <BarreNavigation base={base} locale={locale} actif="infos" />
      <SuiviEcran hotelId={hotel.id} locale={locale} />
    </div>
  );
}
