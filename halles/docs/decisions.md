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

**Aucun UPDATE direct sur `hotels`.** `update_hotel_info()` reste en base avec
sa liste blanche, qui interdit de toucher au slug, au statut ou au plan. Elle
n'est plus appelée depuis l'application (voir « L'hôtelier n'a pas de compte »)
mais reste le seul chemin correct si un jour il reprend la main.

**Le jeton de statistiques n'est pas une colonne de `hotels`.** Il l'a été
pendant une heure, et c'était une fuite : `hotels` est en lecture anonyme — le
guide en dépend — donc un `select=stats_token` rendait publics les jetons de
tous les hôtels publiés. Un privilège de colonne aurait corrigé le symptôme,
au prix de casser le `select *` du guide et de se re-percer à la première
colonne ajoutée. `hotel_stats_tokens`, sans policy ni grant public, ne se perce
pas par distraction. Un trigger sur `hotels` garantit qu'aucun hôtel n'existe
sans jeton.

**Le lien de statistiques n'est pas authentifié.** `stats_par_jeton()` et
`classements_par_jeton()` sont exécutables par le rôle anonyme, en `security
definer`, et ne renvoient que des agrégats d'un seul hôtel publié. Le jeton
tient lieu de mot de passe : 122 bits d'aléa, indevinable, révocable en un clic.
Ce que fuite un lien perdu, c'est un histogramme de scans — pas une donnée
personnelle, pas un droit d'écriture. La fonction ne distingue pas un jeton
inconnu d'un hôtel dépublié : dans les deux cas, aucune ligne.

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

**La duplication de curation ne recopie pas les notes.** Le brief demandait de
dupliquer la curation d'un hôtel voisin ; recopier aussi les notes ferait dire à
un hôtelier ce qu'un autre a écrit, et rendrait deux guides interchangeables —
en détruisant exactement ce qui distingue le produit d'une carte. Positions et
mises en avant suivent, les notes restent à écrire. La copie explicite reste
possible (case à cocher) pour repartir d'une base à réécrire.

**Quatre incontournables au maximum.** L'accueil n'en affiche pas plus : au-delà,
l'admin serait fondé à croire que le cinquième apparaît. Le refus est explicite.

**Le QR est tracé en vectoriel, pas en image.** 4 ko par chevalet, net à
n'importe quelle taille d'impression, et l'URL en clair en pied de page comme
repli si le code est abîmé.

## Référencement

**Les guides ne sont pas indexés.** Ils sont publics par leur URL, mais un
avantage négocié pour les clients d'un hôtel qui remonte sur « apéritif offert
Marais » devient une promotion ouverte à tous — le commerçant serait fondé à le
retirer, et c'est le réseau qui se déliterait. La vitrine seule est indexée.

**Le `noindex` est dans les métadonnées, pas dans `robots.txt`.** Interdire
l'exploration paraît plus fort et fait l'inverse : Google peut indexer une URL
interdite sur la seule foi des liens entrants, et surtout ne lira jamais le
`noindex` d'une page qu'il n'a pas le droit de charger. `robots.txt` n'écarte
donc que ce qui n'a rien à donner à un moteur : `/admin`, `/api`, `/connexion`.

**La vitrine est `force-static` et sans JavaScript.** C'est la seule page qu'un
hôtelier ouvre depuis un ordinateur, et la seule qu'un moteur lit. La FAQ est
dupliquée en `schema.org` : c'est la partie qui peut apparaître seule dans un
résultat de recherche.

## Écarts au brief assumés

**L'hôtelier n'a pas de compte.** Le brief prévoyait une surface hôtelier
authentifiée par lien magique : statistiques en lecture, QR à télécharger,
infos pratiques éditables. Il n'a finalement rien à gérer — il colle le QR code
en chambre, le client scanne. Créer un compte pour ça, c'était demander une
adresse, envoyer un courriel, encaisser les liens expirés, les boîtes qui
filtrent, les réceptionnistes qui changent, et une table `hotel_users` à tenir à
jour pour un usage mensuel.

Ce qui reste utile est devenu `/s/{jeton}` : un lien privé transmis une fois,
qui montre ses chiffres et rien d'autre. Le QR est imprimé par nos soins (les
chevalets A5 de la phase 4), et les infos pratiques sont saisies au back-office
— à l'installation, puis au téléphone quand le mot de passe wifi change. Un
appel par an contre une brique d'authentification à maintenir : le calcul est
vite fait tant qu'on parle de dizaines d'hôtels. À revoir à partir de quelques
centaines, où l'appel devient le coût dominant.

La conséquence : `hotel_users`, `is_hotel_member()`, `update_hotel_info()` et
`hotel_daily_stats()` restent en base, testés, inutilisés. Ils ne coûtent rien
et évitent une migration si la décision s'inverse.

**Les statistiques sont rendues sans JavaScript.** Pas de bibliothèque de
graphiques : trente barres se dessinent en vingt lignes de SVG côté serveur. La
page s'ouvre sur un téléphone de réception, en 4G, une fois par mois — c'est le
seul critère qui compte.

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
