# Halles

Guide de quartier et avantages négociés pour hôtels indépendants.

Le client de l'hôtel scanne un QR code en chambre et accède à une sélection
d'adresses avec des avantages obtenus auprès des commerçants du quartier —
sans compte, sans application à installer. L'hôtel paie un abonnement mensuel ;
la valeur vendue n'est pas le logiciel, c'est le réseau de commerçants.

Trois surfaces sur un seul déploiement :

| Surface | URL | Public |
|---|---|---|
| Guide | `lemarais.halles.app` | client de l'hôtel, sans compte |
| Dashboard | `halles.app/dashboard` | hôtelier, magic link |
| Back-office | `halles.app/admin` | administration |
| Vitrine | `halles.app` | prospects |

## Pile technique

Next.js 15 (App Router, Server Components), TypeScript strict, Tailwind CSS v4,
Supabase (Postgres + Auth + Storage), Zod, lucide-react, Vitest. Cartographie
par MapLibre GL JS sur tuiles Protomaps auto-hébergées — ni Mapbox ni Google
Maps, dont la facturation à la vue détruirait la marge.

## Installation depuis zéro

### 1. Dépendances

```bash
cd halles
npm install
```

Node 20 ou plus récent.

### 2. Projet Supabase

> Pour seulement **voir** le guide, cette étape est facultative : sans variables
> Supabase, l'application démarre en mode démonstration.


1. Créer un projet sur [supabase.com](https://supabase.com) — région `eu-west-3`
   (Paris) pour la latence et pour garder les données en Europe.
2. Récupérer dans *Project Settings > API* : l'URL du projet, la clé `anon`
   et la clé `service_role`.
3. Copier `.env.example` en `.env.local` et renseigner ces trois valeurs.

```bash
cp .env.example .env.local
```

### 3. Migrations

Dans l'ordre, via le *SQL Editor* du tableau de bord Supabase ou via `psql` :

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260729120000_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20260729120100_fonctions.sql
psql "$DATABASE_URL" -f supabase/migrations/20260729120200_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/20260729130000_stockage.sql
psql "$DATABASE_URL" -f supabase/migrations/20260729130100_stats_globales.sql
```

Chaque migration a son inverse dans `supabase/rollback/`, à rejouer dans l'ordre
décroissant.

### 4. Jeu de démonstration

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Un hôtel publié (`lemarais`), 25 adresses du Marais, 8 avantages, 2 itinéraires.
Le seed est idempotent : le rejouer ne crée pas de doublons.

Les établissements du seed sont **fictifs**, à des adresses réelles. Ne pas y
substituer d'enseignes existantes tant qu'un accord n'est pas signé : afficher
un avantage au nom d'un commerçant qui ne l'a pas accordé l'engagerait à tort.

### 5. Premier compte administrateur

Le back-office exige un compte de rôle `admin`. Le rôle ne s'auto-attribue pas :
il faut le poser une fois à la main.

1. Se connecter sur `/connexion` avec son adresse : le compte est créé par le
   lien magique, avec le rôle `hotelier` par défaut.
2. Le promouvoir, depuis le *SQL Editor* de Supabase :

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'vous@exemple.fr');
```

### 6. Lancement

```bash
npm run dev
```

- Guide de démonstration : http://lemarais.localhost:3000
  (`*.localhost` est résolu par les navigateurs modernes sans toucher au fichier
  `hosts` ; sinon, ajouter `127.0.0.1 lemarais.localhost`)
- Même guide en mode chemin : http://localhost:3000/h/lemarais
- Vitrine : http://localhost:3000

### 7. Tuiles cartographiques

**Nécessaire pour que l'écran carte affiche un fond.** Sans
`NEXT_PUBLIC_PMTILES_URL`, l'application le détecte et sert la liste des
adresses à la place, avec un message : rien ne casse, mais il n'y a pas de plan.

Pour Paris :

```bash
# Extrait de la couverture mondiale Protomaps, limité à Paris intra-muros
npx pmtiles extract \
  https://build.protomaps.com/20260601.pmtiles paris.pmtiles \
  --bbox=2.224,48.815,2.470,48.902 --maxzoom=16
```

Déposer `paris.pmtiles` dans un bucket public Supabase Storage (ou Cloudflare R2)
et renseigner `NEXT_PUBLIC_PMTILES_URL` avec son URL. Le fichier pèse quelques
dizaines de mégaoctets et se sert par requêtes de plage : aucun coût à la vue.

Les libellés de la carte ont besoin de glyphes de police. Par défaut on utilise
les fichiers statiques publics de Protomaps ; `NEXT_PUBLIC_GLYPHS_URL` permet
d'en héberger une copie pour n'avoir aucun appel sortant.

Le style de carte est écrit à la main dans `lib/carte/style.ts`, sur le schéma
Protomaps v4. Il n'a pas encore été confronté à un vrai fichier de tuiles : les
noms de couches (`earth`, `roads`, `places`…) sont ceux du schéma documenté,
mais c'est le premier point à vérifier une fois le `.pmtiles` en place.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run test` | tests unitaires de la logique métier (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run test:sql` | schéma, seed, RLS et rollbacks sur un Postgres jetable |

### Vérifier la base sans projet Supabase

`npm run test:sql` rejoue les migrations, le seed et vingt-six assertions de
sécurité (ce que voit un visiteur anonyme, ce qu'un hôtelier peut écrire, ce
qu'un intrus ne peut pas lire) sur une base Postgres locale. Le simulacre
`supabase/tests/00_shim_supabase.sql` recrée les rôles `anon`, `authenticated`,
`service_role` et le schéma `auth` — il ne doit **jamais** être appliqué à un
vrai projet Supabase.

```bash
# Base locale attendue sur le port 55432, ou :
DATABASE_URL=postgres://... npm run test:sql
```

## Architecture

```
app/
  page.tsx                 vitrine
  introuvable/             404 des sous-domaines inconnus
  h/[slug]/                le guide d'un hôtel
    layout.tsx             charge le tenant, injecte son thème
    page.tsx               accueil
lib/
  tenant.ts                résolution du sous-domaine, cache 60 s
  auth.ts                  identité et garde-fous (rôle relu en base)
  admin/                   lectures, actions serveur, import Maps, photos
  stats.ts                 totaux, évolutions, taux de scan
  data/demo.ts             jeu de démonstration sans Supabase
  data/guide.ts            lectures du guide, cache balisé
  i18n/                    dictionnaires FR/EN et traducteur
  geo.ts                   distances et temps de marche
  perks.ts                 validité des avantages
  theme.ts                 couleur de l'hôtel, contrastes AA garantis
  supabase/                clients public / navigateur / service role
middleware.ts              aiguillage multi-tenant
supabase/
  migrations/              schéma, fonctions, RLS
  rollback/                inverse de chaque migration
  tests/                   simulacre Supabase et assertions RLS
```

### Multi-tenant

Le middleware lit l'en-tête `Host`, en extrait le slug et réécrit vers
`/h/{slug}/…`. L'existence du slug est vérifiée contre Supabase avec un cache
mémoire de 60 secondes : sans lui, chaque chargement paierait un aller-retour
réseau avant de commencer à rendre. Un slug inconnu ou dépublié reçoit un 404
propre, jamais la vitrine.

Le mode chemin `halles.app/h/{slug}` est la route native ; le sous-domaine y est
réécrit. Les liens internes sont donc toujours préfixés `/h/{slug}`, ce qui reste
correct dans les deux modes.

La colonne `hotels.custom_domain` existe pour les domaines par hôtel, mais n'est
pas résolue en v1.

### Progressive web app

Le manifeste est généré par tenant (`/h/{slug}/manifest.webmanifest`) : un guide
installé porte le nom, la couleur et le logo de SON hôtel. Le service worker
garde les fichiers versionnés en cache et sert les pages déjà vues d'abord
depuis le cache — un écran consulté reste lisible dans un restaurant sans
réseau. Pas de mode hors ligne complet en v1 : rien n'est pré-chargé.

La proposition d'installation n'apparaît qu'au deuxième écran, et jamais deux
fois si elle a été refusée.

### Mesure d'audience

`POST /api/track` écrit avec la clé anonyme, donc sous le contrôle de la RLS.
Identifiant de session en `sessionStorage`, aucune IP, aucun user-agent, aucun
cookie — d'où l'absence de bandeau de consentement, raisonnement détaillé dans
`docs/rgpd.md` (et qui reste à faire valider juridiquement).

Deux crons Vercel, déclarés dans `vercel.json` et protégés par `CRON_SECRET` :

| Route | Quand | Rôle |
|---|---|---|
| `/api/cron/agreger` | chaque nuit à 3 h 10 | rafraîchit la vue d'agrégation |
| `/api/cron/purger` | chaque lundi à 3 h 40 | supprime les événements de plus de 13 mois |

À déclencher à la main :
`curl -H "Authorization: Bearer $CRON_SECRET" https://halles.app/api/cron/agreger`

### Back-office

`/admin`, protégé par le layout : toute page dessous exige un compte de rôle
`admin`. Connexion par lien magique, sans mot de passe.

- **Vue d'ensemble** — ce qui demande une action d'abord (avantages qui expirent
  dans 30 jours, lieux non vérifiés depuis six mois), les compteurs ensuite.
- **Hôtels, lieux, avantages** — tables denses, filtres dans l'URL (donc
  partageables), statut modifiable directement dans la table, raccourcis
  clavier `/` et `n`.
- **Import Google Maps** — coller l'URL d'une fiche pré-remplit nom et
  coordonnées, en lisant le lien sans appeler l'API Google. Le retour dit ce
  qui a été trouvé et ce qui reste à saisir.
- **Photos** — coller l'URL de la photo sur le site du commerçant : le serveur
  la télécharge une fois et la range dans Supabase Storage. Voir
  `docs/decisions.md`.

Les écritures passent par des actions serveur avec le service role, après
vérification du rôle, et invalident le cache des guides concernés : une
publication est visible immédiatement, sans attendre les cinq minutes de
revalidation.

### Curation et QR codes

`/admin/hotels/<id>/curation` réunit les trois gestes qui fabriquent la valeur
perçue d'un guide : l'ordre (glisser-déposer, API HTML5 native, aucune
bibliothèque), les quatre mises en avant (plafonnées, parce que l'accueil n'en
affiche pas plus), et le mot de l'hôtel.

**Reprendre la curation d'un hôtel voisin** est la fonction qui conditionne la
rentabilité : elle fait passer l'onboarding de dix heures à trois. Deux
garde-fous côté base (`dupliquer_curation()`) : même ville obligatoire, et les
notes ne sont pas recopiées par défaut — ce sont les mots d'un autre hôtelier,
et deux guides identiques n'auraient plus d'intérêt. Les lieux déjà présents
sont conservés : la duplication ajoute, elle n'écrase jamais.

**Chevalets A5** : un PDF par emplacement (chambre, réception, carte-clé),
chacun avec son `?source=`, donc mesurable séparément. Le QR est tracé en
carrés vectoriels — le fichier pèse 4 ko et reste net agrandi en affiche.
Correction d'erreur au niveau Q, marge de quatre modules, et l'URL en clair en
pied de page pour qu'un code abîmé ne condamne pas le guide.

### Mode démonstration

Sans `NEXT_PUBLIC_SUPABASE_URL`, l'application sert le jeu de démonstration
embarqué (`lib/data/demo.json`, régénéré depuis le seed par
`scripts/generer-demo.sh`). Le guide est entièrement navigable sans base : utile
pour montrer le produit, et pour développer les écrans hors ligne. Le
back-office, lui, exige une vraie base.

### Sécurité

La RLS est active sur les huit tables. Le contenu publié est lisible
anonymement ; `events` est en écriture seule ; aucune écriture directe n'est
possible sur `hotels` — un hôtelier passe par la fonction `update_hotel_info()`,
dont la liste blanche interdit de toucher au slug, au statut ou au plan.
L'administration passe par la clé `service_role`, côté serveur exclusivement.

Les statistiques agrégées vivent dans le schéma `analytics`, hors de portée de
PostgREST : une vue matérialisée ignore la RLS, elle ne doit donc jamais être
exposée directement. L'hôtelier les lit via `hotel_daily_stats()`, qui vérifie
son appartenance à l'hôtel.

## État d'avancement

- [x] **Phase 1** — schéma, RLS, seed, middleware multi-tenant, accueil guest
- [x] **Phase 2** — carte, fiches, avantages, itinéraires, infos, i18n, PWA
- [x] **Phase 3** — analytics et back-office CRUD
- [x] **Phase 4** — curation, duplication, QR codes en PDF
- [ ] **Phase 5** — dashboard hôtelier et magic link
- [ ] **Phase 6** — performance, accessibilité, SEO, crons, déploiement
