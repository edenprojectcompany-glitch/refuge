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

### 5. Lancement

```bash
npm run dev
```

- Guide de démonstration : http://lemarais.localhost:3000
  (`*.localhost` est résolu par les navigateurs modernes sans toucher au fichier
  `hosts` ; sinon, ajouter `127.0.0.1 lemarais.localhost`)
- Même guide en mode chemin : http://localhost:3000/h/lemarais
- Vitrine : http://localhost:3000

### 6. Tuiles cartographiques (phase 2)

La carte lira un fichier `.pmtiles` auto-hébergé. Pour Paris :

```bash
# Extrait de la couverture mondiale Protomaps, limité à Paris intra-muros
npx pmtiles extract \
  https://build.protomaps.com/20260601.pmtiles paris.pmtiles \
  --bbox=2.224,48.815,2.470,48.902 --maxzoom=16
```

Déposer `paris.pmtiles` dans un bucket public Supabase Storage (ou Cloudflare R2)
et renseigner `NEXT_PUBLIC_PMTILES_URL` avec son URL. Le fichier pèse quelques
dizaines de mégaoctets et se sert par requêtes de plage : aucun coût à la vue.

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
- [ ] **Phase 2** — carte, fiches, avantages, itinéraires, infos, i18n, PWA
- [ ] **Phase 3** — analytics et back-office CRUD
- [ ] **Phase 4** — curation, duplication, QR codes en PDF
- [ ] **Phase 5** — dashboard hôtelier et magic link
- [ ] **Phase 6** — performance, accessibilité, SEO, crons, déploiement
