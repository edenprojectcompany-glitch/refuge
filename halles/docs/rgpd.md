# Mesure d'audience et données personnelles

Ce document décrit ce que Halles mesure, ce qu'il ne mesure pas, et pourquoi
aucun bandeau de consentement n'est affiché. **Ce raisonnement n'a pas été
validé par un juriste : voir « Ce qui reste à faire valider » en fin de
document.**

## Ce qui est enregistré

Une ligne dans la table `events` par action mesurée, avec :

| Colonne | Contenu | Pourquoi |
|---|---|---|
| `hotel_id` | l'hôtel dont le guide est consulté | attribuer la mesure au bon abonné |
| `session_id` | UUID tiré au hasard, stocké en `sessionStorage` | distinguer deux visites simultanées |
| `type` | `session_start`, `page_view`, `outbound_click`… | savoir ce qui sert |
| `place_id`, `perk_id` | l'adresse ou l'avantage concerné | classement des lieux consultés |
| `source` | `chambre`, `reception`, `carte-cle` | savoir quel support fonctionne |
| `locale` | `fr` ou `en` | proportion de clientèle étrangère |
| `created_at` | horodatage | agrégation par jour |

## Ce qui n'est pas enregistré

- **Aucune adresse IP.** Elle n'est ni stockée, ni journalisée applicativement,
  ni utilisée pour dériver une géolocalisation.
- **Aucun user-agent**, complet ou tronqué.
- **Aucun cookie**, ni de mesure, ni technique, pour la surface guest.
- **Aucun identifiant persistant.** `session_id` vit en `sessionStorage` : il
  disparaît à la fermeture de l'onglet. Deux visites du même téléphone à deux
  jours d'intervalle sont deux sessions sans lien entre elles.
- **Aucun compte voyageur**, donc aucune donnée d'identité.
- **Aucune empreinte de navigateur** : pas de canvas, pas de liste de polices,
  pas de mesure d'écran, pas de calcul d'entropie.
- **Aucun partage avec un tiers.** Les données restent dans le Postgres du
  projet Supabase, hébergé en Europe.

## Pourquoi aucun bandeau

La CNIL admet une exemption de consentement pour les traceurs de mesure
d'audience à conditions strictes : finalité limitée à la mesure pour le compte
de l'éditeur, absence de recoupement avec d'autres traitements, absence de
transmission à des tiers, portée limitée à un seul site, données réduites au
strict nécessaire, et durée de conservation bornée.

La conception ci-dessus vise chacun de ces points :

- **Finalité unique.** Les chiffres servent au lien de statistiques de
  l'hôtelier et à la curation. Aucun usage publicitaire, aucun profilage, aucune segmentation
  d'audience.
- **Pas de recoupement.** `session_id` n'est rapproché d'aucune autre source :
  il n'existe nulle part ailleurs.
- **Pas de suivi entre sites.** Chaque guide est cloisonné par `hotel_id`, et
  rien ne relie deux guides pour un même visiteur.
- **Portée réduite.** `sessionStorage` n'est pas un cookie et n'est pas
  transmis au serveur ; il ne permet aucun suivi au-delà de l'onglet.
- **Conservation bornée.** Les lignes de plus de treize mois sont supprimées par
  le cron `/api/cron/purger`. Treize mois permettent une comparaison d'une
  saison à la précédente, pas davantage.

Un identifiant de session limité à l'onglet, sans cookie et sans donnée
d'identification, ne constitue pas à notre lecture un traitement nécessitant le
consentement au sens de l'article 82 de la loi Informatique et Libertés.

## Sécurité des données

- `events` est **en écriture seule** pour le public : la policy RLS autorise
  l'insertion, aucune policy n'autorise la lecture, et le privilège `SELECT`
  n'est pas accordé. La table ne peut donc pas être interrogée depuis le
  navigateur, même avec la clé anonyme.
- L'endpoint `/api/track` écrit avec la clé anonyme, donc sous le contrôle de la
  RLS : il refuse un `hotel_id` inconnu ou non publié.
- Les agrégats vivent dans le schéma privé `analytics`, que PostgREST n'expose
  pas. L'hôtelier les lit via `stats_par_jeton()`, qui filtre sur son seul hôtel
  et ne renvoie que des totaux par jour — aucune ligne d'événement, aucun
  `session_id`, donc aucune donnée personnelle même si le lien fuite. Les
  chiffres consolidés tous hôtels passent par `stats_globales()`, réservée au
  service role.
- `meta` est borné par un schéma Zod (clés courtes, valeurs courtes) pour qu'il
  ne devienne pas un fourre-tout où finiraient des données personnelles.

## Ce qui reste à faire valider

1. **Confirmation juridique de l'exemption.** L'analyse ci-dessus est celle du
   développeur, pas d'un avocat. À faire relire avant la première facturation.
2. **Journaux d'hébergement.** Vercel et Supabase journalisent des adresses IP
   pour leur propre exploitation. Cela relève de leur rôle de sous-traitant,
   mais doit apparaître dans le registre des traitements.
3. **Registre des traitements et politique de confidentialité.** À rédiger, avec
   une page accessible depuis le guide.
4. **Contrats de sous-traitance** (DPA) avec Vercel, Supabase et Resend.
5. **Mot de passe wifi affiché dans le guide.** Ce n'est pas une donnée
   personnelle, mais c'est un secret de l'hôtel exposé à toute personne ayant
   l'URL. Le guide est en `noindex`, ce qui n'est pas une protection. À arbitrer
   avec les hôteliers : accepter le risque, ou masquer le mot de passe derrière
   une action explicite.
6. **Durée de treize mois** : à confirmer comme proportionnée au besoin réel.
