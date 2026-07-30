import type { Metadata } from 'next';
import { envPublic } from '@/lib/env';

const TITRE = 'Halles — le quartier de votre hôtel, avantages compris';
const DESCRIPTION =
  "Halles équipe les hôtels indépendants de Paris d'un guide de quartier : adresses choisies et avantages négociés chez les commerçants, accessibles par QR code depuis la chambre. Sans application à installer.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  keywords: [
    'guide de quartier hôtel',
    'conciergerie digitale hôtel',
    'QR code chambre hôtel',
    'avantages commerçants hôtel',
    'hôtel indépendant Paris',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: TITRE,
    description: DESCRIPTION,
    siteName: 'Halles',
  },
  twitter: { card: 'summary_large_image', title: TITRE, description: DESCRIPTION },
};

/*
 * La page est statique : aucun appel à la base, aucun JavaScript client. C'est
 * la seule page que Google indexe, et la seule qu'un hôtelier ouvre depuis un
 * ordinateur — d'où une mise en page qui tient sur les deux largeurs.
 */
export const dynamic = 'force-static';

const QUESTIONS = [
  {
    q: "Le client doit-il installer une application ?",
    r: "Non. Il scanne le QR code posé dans la chambre et le guide s'ouvre dans son navigateur, en français ou en anglais. Rien à télécharger, aucun compte à créer, aucune adresse à donner.",
  },
  {
    q: 'Comment le commerçant reconnaît-il un client de votre hôtel ?',
    r: "Le client montre son écran, c'est tout. Nous avons écarté les codes à saisir et les validations côté commerçant : chaque friction ajoutée fait chuter l'usage, et un serveur en plein service ne manipule pas une tablette.",
  },
  {
    q: 'Qui négocie les avantages avec les commerçants ?',
    r: "Nous. C'est le cœur du travail et ce que vous achetez : un hôtel seul, avec ses trente chambres, n'a pas le poids pour négocier un apéritif offert. Un réseau d'hôtels d'un même quartier, oui.",
  },
  {
    q: 'Combien de temps pour mettre en place le guide ?',
    r: "Une journée. Nous partons de la sélection déjà négociée dans votre quartier, nous l'ajustons à votre clientèle, vous relisez, nous imprimons les chevalets. Vous n'avez rien à saisir.",
  },
  {
    q: "Qu'est-ce que l'hôtelier doit gérer au quotidien ?",
    r: "Rien. Le QR code reste dans la chambre, la sélection est tenue à jour de notre côté, les avantages sont renégociés à échéance. Vous recevez un lien privé qui montre vos chiffres du mois.",
  },
  {
    q: 'Est-ce que cela remplace une conciergerie ?',
    r: "Non, et ce n'est pas le but. Cela répond à la question posée cinquante fois par semaine à la réception — « où est-ce qu'on mange bien, pas loin ? » — avec une réponse qui vous appartient, à toute heure, y compris quand personne n'est à l'accueil.",
  },
];

export default function PageVitrine() {
  const domaine = envPublic.rootDomain;

  // Données structurées : la FAQ est la partie de cette page qui a une chance
  // d'apparaître seule dans un résultat de recherche.
  const donneesStructurees = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Halles',
        description: DESCRIPTION,
        areaServed: { '@type': 'City', name: 'Paris' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: QUESTIONS.map(({ q, r }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: r },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
      />

      <header className="border-b border-trait">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 py-5">
          <span className="font-[family-name:var(--police-titre)] text-[1.35rem]">Halles</span>
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center text-[0.9rem] text-encre-doux hover:underline"
          >
            Nous écrire
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="border-b border-trait py-16 sm:py-20">
          <p className="text-[0.78rem] uppercase tracking-[0.18em] text-encre-tres-doux">
            Paris · hôtels indépendants
          </p>
          <h1 className="mt-4 text-[2.4rem] leading-[1.05] sm:text-[3.2rem]">
            Le quartier de votre hôtel,
            <br />
            avantages compris.
          </h1>

          <p className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-encre-doux">
            Vos clients scannent un QR code en chambre et découvrent les adresses que vous avez
            choisies, avec un avantage négocié chez chaque commerçant. Un apéritif offert, une
            remise, un dessert — sur simple présentation de leur écran.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {/*
              Lien natif et non `next/link` : la vitrine ne charge aucun
              JavaScript, et le guide est une autre surface (souvent un autre
              sous-domaine) — un préchargement par le routeur ne servirait à
              rien et coûterait le routeur client sur une page statique.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/h/lemarais"
              className="inline-flex min-h-11 items-center bg-encre px-5 text-[0.95rem] font-medium text-creme rounded-[3px] hover:opacity-90"
            >
              Voir un guide en vrai
            </a>
            <a
              href="#contact"
              className="inline-flex min-h-11 items-center border border-trait-fort px-5 text-[0.95rem] font-medium rounded-[3px] hover:bg-papier"
            >
              Parler de votre hôtel
            </a>
          </div>
          <p className="mt-3 text-[0.85rem] text-encre-tres-doux">
            Guide de démonstration, quartier du Marais. Ouvrez-le sur votre téléphone.
          </p>
        </section>

        <section className="border-b border-trait py-14">
          <h2 className="text-[1.7rem] leading-tight">
            Le problème n&apos;est pas le manque d&apos;adresses.
          </h2>
          <div className="mt-6 grid gap-6 text-[1.02rem] leading-relaxed text-encre-doux sm:grid-cols-2">
            <p>
              Votre client a déjà toutes les cartes du monde dans sa poche. Ce qu&apos;il n&apos;a
              pas, c&apos;est votre avis — et une raison de pousser cette porte-là plutôt que celle
              d&apos;à côté. À 20 h, sans réponse, il finit dans la chaîne qui a le plus d&apos;avis
              en ligne, à quatre rues de chez vous.
            </p>
            <p>
              Une liste de recommandations en PDF ne change rien : elle se lit une fois et ne
              déclenche pas de visite. Ce qui déclenche, c&apos;est un avantage réel, obtenu chez un
              commerçant qui vous connaît. C&apos;est exactement ce qu&apos;un hôtel de trente
              chambres ne peut pas négocier seul.
            </p>
          </div>
        </section>

        <section className="border-b border-trait py-14">
          <h2 className="text-[1.7rem] leading-tight">
            Ce que nous apportons est un réseau, pas un logiciel.
          </h2>
          <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-encre-doux">
            Nous démarchons les commerçants du quartier un par un, nous négocions un avantage
            tenable pour eux, et nous le renégocions quand il expire. Le guide n&apos;est que le
            tuyau qui l&apos;apporte jusqu&apos;à la chambre.
          </p>

          <ol className="mt-9 grid gap-7 sm:grid-cols-3">
            {[
              [
                'Nous négocions',
                "Restaurants, bars, boulangeries, boutiques : chaque avantage est obtenu de vive voix, avec une contrepartie claire pour le commerçant — des clients qui dorment à trois cents mètres.",
              ],
              [
                'Vous choisissez',
                "Nous partons de la sélection du quartier, vous gardez ce qui ressemble à vos clients, vous écartez le reste, et vous ajoutez votre mot sur chaque adresse. C'est ce mot qui fait la différence avec une carte.",
              ],
              [
                'Le client scanne',
                "Le chevalet est posé dans la chambre. Le guide s'ouvre en deux secondes, en français ou en anglais, sans application et sans compte.",
              ],
            ].map(([titre, texte], index) => (
              <li key={titre}>
                <span className="text-[0.8rem] tabular-nums text-encre-tres-doux">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1.5 text-[1.15rem]">{titre}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-encre-doux">{texte}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-b border-trait py-14">
          <h2 className="text-[1.7rem] leading-tight">Ce que vous avez à faire : rien.</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <p className="text-[1.02rem] leading-relaxed text-encre-doux">
              Pas de compte à créer, pas de mot de passe à retenir, pas d&apos;écran à apprendre.
              Nous imprimons les chevalets, vous les posez. La sélection reste à jour de notre côté.
            </p>
            <p className="text-[1.02rem] leading-relaxed text-encre-doux">
              Une fois par mois, un lien privé vous montre combien de clients ont ouvert le guide,
              quelles adresses ils regardent et quels avantages ils utilisent. C&apos;est la seule
              page que vous aurez à consulter.
            </p>
          </div>
        </section>

        <section className="border-b border-trait py-14">
          <h2 className="text-[1.7rem] leading-tight">Questions fréquentes</h2>
          <dl className="mt-7 divide-y divide-trait border-y border-trait">
            {QUESTIONS.map(({ q, r }) => (
              <div key={q} className="py-5">
                <dt className="text-[1.02rem] font-medium">{q}</dt>
                <dd className="mt-2 text-[0.98rem] leading-relaxed text-encre-doux">{r}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="contact" className="py-14 scroll-mt-6">
          <h2 className="text-[1.7rem] leading-tight">Votre quartier est-il couvert ?</h2>
          <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-encre-doux">
            Nous ouvrons quartier par quartier : un guide n&apos;a de valeur que si les commerçants
            sont à moins de dix minutes à pied. Dites-nous où se trouve votre hôtel, nous vous
            dirons ce qui est déjà négocié autour de vous.
          </p>
          <p className="mt-6 text-[1.05rem]">
            <a
              href="mailto:bonjour@halles.app"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              bonjour@halles.app
            </a>
          </p>
        </section>
      </main>

      <footer className="border-t border-trait">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[0.85rem] text-encre-tres-doux">
          <span>Halles · Paris</span>
          <span>
            Démonstration :{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/h/lemarais" className="hover:underline">
              {domaine === 'localhost' ? '/h/lemarais' : `lemarais.${domaine}`}
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
