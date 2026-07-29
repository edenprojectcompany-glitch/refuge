# Décisions

Les arbitrages qui engagent la suite, avec leur raison. À relire avant de
revenir sur l'un d'eux.

## Produit

**Nom : Halles** — « Halles You Need ». Les Halles, le ventre de Paris, et un
jeu de mots que les clients anglophones attrapent immédiatement.

**Photos des lieux : copiées une fois dans Supabase Storage.** La source reste
le site du commerçant, mais l'admin la télécharge à la saisie et la range dans
notre bucket. Un lien direct casserait à chaque refonte de son site, subirait
sa protection anti-hotlink, imposerait son poids d'origine sur le wifi d'un
hôtel, et obligerait à autoriser tous les domaines dans `remotePatterns` — ce
qui transformerait notre optimiseur d'images en proxy public.
*À faire en phase 3, avec l'écran de saisie des lieux.* Ne rapatrier que des
photos de commerçants déjà partenaires.

**Aucun mécanisme de validation d'avantage.** Ni code, ni scan, ni compteur.
L'écran montré au commerçant porte une horloge qui avance et un balayage
lumineux : une capture d'écran se reconnaît. C'est un garde-fou social, pas un
contrôle technique, et c'est assumé — la friction d'un vrai contrôle ferait
chuter l'usage, or l'usage est ce que l'hôtelier achète.

## Architecture

**Les guides vivent sous `app/h/[slug]`, pas `app/_sites/[slug]`.** En App
Router, un dossier préfixé par un souligné est exclu du routage : la route
n'existerait pas. Effet secondaire heureux, c'est aussi le mode chemin de
secours prévu au brief.

**Les liens internes sont préfixés `/h/{slug}`.** Un lien relatif se résoudrait
mal en mode chemin. Le prix est une URL moins jolie sur le sous-domaine ; la
contrepartie est un rendu qui reste cacheable.

**`daily_stats` vit dans le schéma privé `analytics`.** Une vue matérialisée
ignore la RLS : laissée dans `public`, un hôtelier aurait pu lire les
statistiques de ses concurrents. L'accès passe par `hotel_daily_stats()`, qui
vérifie l'appartenance à l'hôtel.

**Aucun UPDATE direct sur `hotels`.** L'hôtelier passe par
`update_hotel_info()`, dont la liste blanche interdit de toucher au slug, au
statut ou au plan. Une policy UPDATE colonne par colonne se contrôle mal.

**`POST /api/track` écrit avec la clé anonyme.** Un endpoint public qui
écrirait avec le service role serait une porte ouverte ; ici la RLS reste le
dernier rempart.

## Interface

**Le contraste prime sur la couleur de l'hôtel.** Sur un ton moyen, ni le blanc
ni l'encre n'atteignent 4,5:1 : le fond de l'en-tête est alors assombri ou
éclairci de quelques crans. Les couleurs franches ressortent intactes.

**Le plan d'itinéraire est un SVG rendu côté serveur**, pas une seconde carte
MapLibre. Il répond à la seule question utile — dans quel sens ça tourne, quelle
étape est loin — pour zéro kilo-octet de JavaScript.

**Les dimensions du conteneur de carte sont en style inline.** La feuille de
style de MapLibre déclare une position relative sur `.maplibregl-map` et,
chargée après Tailwind, écrase les classes utilitaires de position. Ne pas
repasser en classes.

## Écarts de planning assumés

**`/api/track` a été livré en phase 2** alors qu'il relève de la phase 3 : sans
lui, les boutons sortants de la fiche lieu n'auraient rien mesuré. L'agrégation,
le tableau de bord et les crons restent en phase 3.

## À vérifier dès que possible

**Le style de carte n'a jamais rencontré de vraies tuiles.** `lib/carte/style.ts`
suit le schéma Protomaps v4 de mémoire documentaire ; les noms de couches
(`earth`, `roads`, `places`…) sont à confirmer sur le premier `.pmtiles`.

**L'exemption de consentement CNIL** pour la mesure d'audience reste à faire
valider. Voir `docs/rgpd.md`, à écrire en phase 3.
