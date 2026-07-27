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

~505 textes tagués sur 15 émotions.

- **Chrétienne** (336) — Bible, Louis Segond 1910 et Darby, domaine public.
- **Musulmane** (86) — Coran et hadiths, chaque passage référencé (sourate/verset,
  recueil/numéro), avec l'arabe, la translittération et la traduction.
- **Philosophe** (84) — auteurs du domaine public, cités avec leur source.

> ⚠️ Le recueil n'a **pas encore été relu par une autorité religieuse**. À faire avant
> toute diffusion large.

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

## Limites assumées

Refuge n'est ni un soin, ni une ligne d'écoute, ni une autorité religieuse. C'est un
recueil de textes avec un moteur de correspondance et un renvoi vers de vrais
interlocuteurs quand ça va mal.
