# Déploiement en production (www.cnfrance.fr)

## En résumé

Chaque enregistrement dans l'espace d'administration (Sveltia CMS) crée un
commit sur `main`. Le workflow [`deploy-production.yml`](../.github/workflows/deploy-production.yml)
reconstruit le site et le synchronise sur l'hébergement par SFTP. Aucune action
manuelle n'est nécessaire.

On peut aussi relancer une publication à la main depuis l'onglet **Actions** du
dépôt (« Déploiement production » → *Run workflow*), avec deux options :

| Option | À quoi ça sert |
| --- | --- |
| `dry_run` | Simulation : liste les transferts sans rien modifier sur le serveur. |
| `force_full` | Retransfère **tous** les médias, et pas seulement ceux dont la taille a changé. |

## L'hébergement

Hébergeur : **Reverine**, serveur `arana.reverine.net`.

L'accès se fait **uniquement en SFTP** : une tentative de connexion SSH répond
`This service allows sftp connections only`. Il n'y a donc ni shell ni `rsync`
côté serveur, d'où l'utilisation de `lftp mirror` (même principe de
synchronisation incrémentale, mais au-dessus de SFTP).

Arborescence visible depuis le compte SFTP :

```
/websites/www.cnfrance.fr   ← racine web
/logs                        ← journaux d'accès (rotation ~150 jours)
/conf/php-fpm  /mysql  /run
```

Le serveur sert bien `index.html` comme index de répertoire (vérifié), ce qui
est indispensable pour un site statique Astro dont les routes sont des dossiers
(`/le-club/index.html`).

## Les restes de l'ancien site Joomla

La racine web contenait un **Joomla 3** (PHP 7.4, fichiers de 2020-2021). La
plupart de ses dossiers appartiennent à `root` et sont en lecture seule : notre
compte SFTP **ne peut ni y écrire ni les supprimer**.

```
administrator/  bin/  cache/  cli/  components/  includes/  language/
layouts/  libraries/  media/  modules/  plugins/  templates/  tmp/
LICENSE.txt  README.txt  configuration.php  htaccess.txt
robots.txt  robots.txt.dist
```

En revanche, le dossier racine lui-même nous appartient : on peut y **créer,
supprimer et renommer** des entrées. Deux entrées Joomla entraient en conflit
avec le nouveau site et ont donc été déplacées dans `_joomla-old/` :

- `images/` — le nouveau site a besoin de ce chemin exact ;
- `index.php` — sinon il l'emporte sur notre `index.html` à la racine.

Le script de déploiement **exclut explicitement** tous ces chemins de la
synchronisation, pour que l'option `--delete` n'essaie jamais d'y toucher (elle
échouerait) et pour ne pas les réveiller par erreur.

### ⚠️ À faire demander à l'hébergeur

Les fichiers Joomla restants sont toujours **servis publiquement et exécutés par
PHP**, y compris `/administrator/`, sur une version de Joomla non mise à jour
depuis 2021. C'est un risque de sécurité réel et nous ne pouvons pas le corriger
nous-mêmes faute de droits.

Il faut demander à Reverine de **vider `/websites/www.cnfrance.fr`** des
fichiers appartenant à `root` (tout sauf le nouveau site). Une fois fait, les
exclusions du script de déploiement deviendront inutiles mais restent inoffensives.

## Configuration GitHub

Environnement `production` du dépôt `cnfrance/site` :

| Nom | Type attendu | Valeur |
| --- | --- | --- |
| `SFTP_SERVER` | variable | `arana.reverine.net` |
| `SFTP_USER` | variable | `cnfrance` |
| `SFTP_PASSWORD` | **secret** | le mot de passe SFTP |

`SFTP_PASSWORD` doit être un **secret**, pas une variable : les variables sont
stockées en clair et lisibles par toute personne ayant accès au dépôt. Le
workflow accepte les deux (pour ne pas casser en cas d'erreur de configuration)
mais affiche un avertissement s'il ne trouve pas le secret.

## Comment la synchronisation évite de renvoyer 200 Mo à chaque fois

`dist/` pèse environ 208 Mo, dont 187 Mo d'images et 18 Mo de documents. Un
build Astro régénère tous les fichiers, donc leurs dates de modification sont
toujours plus récentes que celles du serveur : une comparaison par date
renverrait tout, à chaque publication.

Le script fait donc deux passes :

1. **`images/` et `documents/`** — comparaison **à la taille seule**
   (`--ignore-time`). Un média modifié change quasi toujours de taille, et le
   CMS crée de toute façon un nouveau nom de fichier.
2. **Le reste** (pages HTML, CSS, JS — environ 3 Mo pour 103 fichiers) —
   renvoyé systématiquement. C'est peu coûteux et cela garantit qu'une page
   modifiée sans changement de taille est bien publiée.

Si jamais un média doit être remplacé par un autre de taille strictement
identique, relancer le workflow à la main avec `force_full`.

## Revenir en arrière

Pour remettre l'ancien site Joomla en ligne, il suffit de replacer les deux
entrées déplacées :

```
rename _joomla-old/index.php index.php
rename images _joomla-new-images
rename _joomla-old/images images
```

(à exécuter dans une session `sftp` positionnée sur `/websites/www.cnfrance.fr`)
