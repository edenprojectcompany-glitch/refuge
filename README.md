# Refuge

**Un mot pour ce que tu ressens.**

Application web de réconfort : on écrit ce qu'on ressent, l'app repère l'émotion et
renvoie un texte choisi pour cet état, dans la voie que la personne a choisie —
chrétienne, musulmane, ou philosophes et écrivains.

Gratuite, sans compte, sans serveur. Tout reste sur l'appareil.

## Ce que contient l'app

| Écran | Rôle |
|---|---|
| **Parole** | Saisie libre ou pastilles d'émotion → un texte, avec une note d'accompagnement. « Une autre parole » pour en tirer un autre. |
| **Journal** | Humeur du jour parmi 6 états, note facultative, historique daté. |
| **Respirer** | 4 exercices guidés : sérénité 5-5, anti-stress 4-7-8, colère 4-6, fatigue 4-2. |
| **Refuge** | Les paroles mises de côté. |
| **Aide / À propos** | Numéros d'écoute, limites de l'app, traitement des données, sources. |

## Sécurité

Deux garde-fous, à ne pas affaiblir sans y réfléchir :

- **Détection de détresse** — une cinquantaine d'expressions de risque suicidaire. Dès
  qu'une est reconnue, dans la saisie d'humeur **ou dans le journal**, l'app bascule sur
  un écran dédié : **3114** (prévention du suicide, 24 h/24), SAMU **15**, **112**, tous
  cliquables pour appeler. Aucune parole n'est proposée à la place.
- La comparaison passe par `estDetresse()`, qui neutralise majuscules, accents,
  apostrophes typographiques et espaces multiples. **Ne jamais comparer la saisie
  directement** : au clavier mobile on écrit « jai envie den finir ».

Une liste de mots-clés a des limites connues : elle ne reconnaît pas les euphémismes
qu'elle n'a pas appris. C'est un filet, pas un diagnostic — et l'app le dit.

## Les textes

275 textes tagués sur 15 émotions, **chacun avec sa propre note d'accompagnement**.

- **Chrétienne** (105) — Louis Segond 1910, domaine public. 7 par émotion, choisis un
  par un. Remplace 336 versets qui avaient été ramassés par mots-clés et partageaient
  14 notes : on y trouvait une prophétie de désolation rangée dans « fatigue ».
- **Musulmane** (86) — Coran et hadiths, avec l'arabe, la translittération et la
  référence complète.
- **Philosophe** (84) — auteurs du domaine public, cités avec leur source.

Le moteur privilégie, à nombre de correspondances égal, le texte le plus ciblé — un
texte tagué sur 3 émotions dont une seule correspond passe derrière un texte
entièrement sur le sujet.

> ⚠️ **Avant toute vente, deux points à régler.**
>
> 1. Le recueil n'a **pas été relu par une autorité religieuse**.
> 2. **Traductions du Coran** : le texte arabe est libre, mais les traductions
>    françaises courantes (Hamidullah, mort en 2002) restent protégées jusqu'en 2072.
>    Le droit de citation couvre mal un produit payant entièrement fait de citations.
>    Solution propre : reprendre une traduction du domaine public (Kazimirski, 1840)
>    ou faire établir des traductions originales. Segond et Darby ne posent aucun
>    problème.

## Confort et accessibilité

- **Thème sombre** — suit le réglage du système, forçable dans « À propos ». Contrastes
  mesurés : 13,2:1 pour le texte, 7,0:1 pour les références (niveau AAA).
- **Accessibilité** — parole annoncée aux lecteurs d'écran (`aria-live`), arabe balisé
  `lang="ar" dir="rtl"`, contours de focus visibles, respect de « réduire les
  animations ». La référence dorée est passée de 3,0:1 à 4,8:1 en mode clair.
- **Journal** — courbe d'humeur sur les 30 derniers relevés, décrite en texte pour les
  lecteurs d'écran.
- **Tes données** — export JSON complet et effacement définitif, depuis « À propos ».

## Technique

Un seul fichier `index.html` : HTML, CSS et JS en ligne, aucune dépendance, aucun build.
Les polices viennent de Google Fonts (repli système si le réseau manque).

- `sw.js` — service worker : l'app s'ouvre sans réseau, polices comprises.
- `manifest.webmanifest` — installable sur l'écran d'accueil (mobile et bureau).
- `partage.png` — aperçu du lien pour WhatsApp, SMS, réseaux.

### Développement

Aucune installation. Servir le dossier en statique :

```bash
py -m http.server 3805
```

Après modification, penser à monter `CACHE` dans `sw.js` (`refuge-v1` → `refuge-v2`),
sinon les visiteurs gardent l'ancienne version en cache.

### Mise en ligne

Hébergement statique, n'importe lequel. Sur GitHub Pages : *Settings → Pages → Branch:
main / root*.

Si l'app est hébergée ailleurs que sur `edenprojectcompany-glitch.github.io/refuge/`,
remplacer les deux URL absolues `og:url` et `og:image` en haut de `index.html` —
sinon l'aperçu du lien pointera vers le mauvais domaine.

## Reste à faire avant de vendre

1. Renseigner les mentions légales (éditeur, directeur de publication, contact) —
   les champs sont en place dans l'écran « À propos », marqués « à compléter ».
2. Régler la question des traductions du Coran (voir plus haut).
3. Faire relire le corpus par une autorité religieuse.
4. Selon le modèle retenu : un site statique **ne peut pas** protéger un contenu
   payant — tout est lisible dans le fichier. Un modèle payant suppose un back-end
   (comptes + paiement), ou une distribution par les magasins d'applications.

## Limites assumées

Refuge n'est ni un soin, ni une ligne d'écoute, ni une autorité religieuse. C'est un
recueil de textes avec un moteur de correspondance et un renvoi vers de vrais
interlocuteurs quand ça va mal.
