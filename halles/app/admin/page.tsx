import { AlertTriangle, Building2, Gift, MapPin, MousePointerClick, Users } from 'lucide-react';
import { chargerStatsGlobales, listerAvantages, listerLieux } from '@/lib/admin/data';
import { avantagesBientotExpires } from '@/lib/perks';
import { totaliser } from '@/lib/stats';
import { LienBouton } from '@/components/ui/Bouton';

export const dynamic = 'force-dynamic';

/**
 * Vue d'ensemble : ce qui va, et surtout ce qui demande une action.
 * Les alertes passent avant les compteurs — un compteur ne se corrige pas.
 */
export default async function PageAdmin() {
  const [stats, avantages, aVerifier] = await Promise.all([
    chargerStatsGlobales(),
    listerAvantages(),
    listerLieux({ aVerifier: true }),
  ]);

  const expirent = avantagesBientotExpires(avantages, 30);
  const totaux = totaliser(stats.jours);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.6rem]">Vue d&apos;ensemble</h1>

      {/* Ce qui demande une action */}
      {expirent.length > 0 || aVerifier.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          {expirent.length > 0 ? (
            <Alerte
              libelle={`${expirent.length} avantage${expirent.length > 1 ? 's' : ''} expire${expirent.length > 1 ? 'nt' : ''} dans les 30 jours`}
              detail={expirent
                .slice(0, 4)
                .map((a) => `${a.title_fr} (${a.valid_until})`)
                .join(' · ')}
              href="/admin/avantages"
            />
          ) : null}

          {aVerifier.length > 0 ? (
            <Alerte
              libelle={`${aVerifier.length} lieu${aVerifier.length > 1 ? 'x' : ''} non vérifié${aVerifier.length > 1 ? 's' : ''} depuis six mois`}
              detail="Horaires, fermetures, changement de propriétaire : à repasser sur place ou par téléphone."
              href="/admin/lieux?verifier=1"
            />
          ) : null}
        </section>
      ) : null}

      {/* Compteurs de contenu */}
      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Compteur Icone={Building2} libelle="Hôtels publiés" valeur={stats.hotelsPublies}
                  detail={stats.hotelsBrouillon > 0 ? `${stats.hotelsBrouillon} en brouillon` : undefined} />
        <Compteur Icone={MapPin} libelle="Lieux publiés" valeur={stats.lieuxPublies} />
        <Compteur Icone={Gift} libelle="Avantages actifs" valeur={stats.avantagesActifs} />
        <Compteur Icone={Users} libelle="Sessions · 30 j" valeur={totaux.sessions}
                  detail={stats.agregationIndisponible ? 'agrégation indisponible' : undefined} />
      </section>

      <section className="grid gap-2.5 sm:grid-cols-2">
        <Compteur Icone={MousePointerClick} libelle="Clics sortants · 30 j" valeur={totaux.clicsSortants} />
        <Compteur Icone={Gift} libelle="Avantages ouverts · 30 j" valeur={totaux.avantagesOuverts} />
      </section>

      {stats.agregationIndisponible ? (
        <p className="border border-trait-fort bg-papier px-4 py-3 text-[0.88rem] leading-relaxed text-encre-doux rounded-[3px]">
          Les chiffres d&apos;audience sont vides : la vue d&apos;agrégation n&apos;a jamais été
          rafraîchie. Elle l&apos;est chaque nuit par le cron{' '}
          <code className="font-mono text-[0.82rem]">/api/cron/agreger</code>, et peut être
          déclenchée à la main avec le secret <code className="font-mono text-[0.82rem]">CRON_SECRET</code>.
        </p>
      ) : null}
    </div>
  );
}

function Compteur({
  Icone,
  libelle,
  valeur,
  detail,
}: {
  Icone: typeof Users;
  libelle: string;
  valeur: number;
  detail?: string;
}) {
  return (
    <div className="border border-trait bg-papier px-4 py-3.5 rounded-[3px]">
      <p className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.1em] text-encre-tres-doux">
        <Icone aria-hidden size={14} strokeWidth={1.75} />
        {libelle}
      </p>
      <p className="mt-1.5 text-[1.9rem] leading-none tabular-nums">{valeur}</p>
      {detail ? <p className="mt-1 text-[0.8rem] text-encre-tres-doux">{detail}</p> : null}
    </div>
  );
}

function Alerte({
  libelle,
  detail,
  href,
}: {
  libelle: string;
  detail: string;
  href: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border border-[#b07d20] bg-[#b07d20]/[0.06] px-4 py-3 rounded-[3px]">
      <AlertTriangle aria-hidden size={17} strokeWidth={1.75} className="text-[#8a6318]" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem] font-medium">{libelle}</p>
        <p className="mt-0.5 text-[0.82rem] text-encre-doux">{detail}</p>
      </div>
      <LienBouton href={href} taille="petit">
        Voir
      </LienBouton>
    </div>
  );
}
