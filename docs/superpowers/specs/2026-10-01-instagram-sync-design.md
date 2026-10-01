# Synchronisation hebdomadaire Instagram → actualités du site

Date : 2026-10-01 — statut : design validé, à planifier.

## Objectif

Chaque semaine, sans intervention, proposer en pull request les nouvelles
publications du compte Instagram @cerclenautiquedefrance sous forme
d'actualités du site (`src/content/actualites/`), avec leurs photos. Une IA
gratuite (GitHub Models) trie les publications et rédige titre, résumé et
catégorie ; un humain relit et fusionne la PR. Rien ne part en ligne sans cette
fusion (tout push sur `main` déploie la production).

## Décisions

| Sujet | Décision |
| --- | --- |
| Publication | PR à valider, jamais de commit direct sur `main` |
| PR | Une seule PR glissante, branche `sync/instagram`, mise à jour chaque semaine |
| Filtrage | L'IA classe « actu » / « à ignorer » ; les ignorées sont listées dans la PR avec leur raison |
| Point de départ | Publications postérieures au **2026-07-10** uniquement (pas de reprise d'historique) |
| Texte | **Légende brute**, seul le bloc de hashtags final est retiré (règle déterministe). L'IA ne touche pas au corps |
| IA | GitHub Models via le `GITHUB_TOKEN` (`models: read`), modèle `openai/gpt-4.1-mini` ; produit uniquement décision, raison, titre, résumé, catégorie |
| Vidéos | Miniature dans le carrousel + lecteur Instagram intégré **chargé au clic** |
| Jeton Instagram | Pas de jeton GitHub supplémentaire : rafraîchissement tenté à chaque run, **issue d'alerte** quand l'expiration approche |
| Copilot coding agent | Écarté (abonnement payant, résultat non déterministe) |

## Déroulé d'un run

Déclencheurs : `schedule` (`0 4 * * 1`, lundi 6 h heure d'été de Paris) et
`workflow_dispatch`.

1. **Jeton.** Appel `refresh_access_token` avec `INSTAGRAM_TOKEN`. Lire
   `expires_in`.
   - Échec (jeton expiré/révoqué) → ouvrir (ou commenter si déjà ouverte) une
     issue « Jeton Instagram à renouveler », faire échouer le run, pas de PR.
   - Expiration < 15 jours → même issue, mais le run continue.
   - À vérifier à l'implémentation : si le jeton renvoyé est identique à celui
     stocké, le rafraîchissement hebdomadaire suffit à le garder valide et
     l'alerte ne sert que de filet. S'il diffère, le nouveau jeton ne peut pas
     être réécrit (pas de droit sur les secrets) : l'alerte devient le
     mécanisme principal, la doc le dit.
2. **Lecture.** `GET /me/media` (champs : `id, caption, media_type,
   media_url, thumbnail_url, permalink, timestamp, children{media_type,
   media_url, thumbnail_url}`), pagination jusqu'à dépasser la date de départ.
3. **Sélection** des publications nouvelles : `timestamp` ≥ date de départ,
   code court absent des actus existantes (champ `instagram`, voir
   « Identification ») et absent de `instagram-ignores.json`.
4. **Classement IA**, une requête par publication (sortie JSON, schéma
   ci-dessous).
5. **Écriture** des actus et des photos ; ajout des ignorées au fichier
   d'ignorés.
6. **PR.** Si une PR `sync/instagram` est ouverte, le run repart de sa branche
   (en y fusionnant `main`) pour conserver les corrections faites à la main, et
   ajoute le rapport de la semaine en commentaire. Sinon, la branche est
   recréée depuis `main` (push forcé) et une PR est ouverte. Rien de changé →
   fin du run, sans PR.

## Contenu produit

### Actualité

`src/content/actualites/<slug>.md` :

```md
---
titre: "…"                    # IA
date: 2026-09-14              # date (jour, fuseau Europe/Paris) de la publication
categorie: "competition"      # IA : competition | loisir | club
resume: "…"                   # IA, une phrase
image: "/medias/actus/<slug>/01.jpg"
photos:
  - "/medias/actus/<slug>/01.jpg"
videos:                       # seulement si la publication contient une vidéo
  - lien: "https://www.instagram.com/reel/<code>/"
instagram: "https://www.instagram.com/p/<code>/"
---
<légende Instagram, hashtags finaux retirés>
```

- **Photos** : toutes les images de la publication (carrousel compris),
  téléchargées depuis `media_url` (URL signée et temporaire, donc copiée
  immédiatement) vers `public/medias/actus/<slug>/NN.<ext>`. Pour une vidéo,
  sa `thumbnail_url` sert de photo.
- **Vidéos** : une entrée `videos[].lien` par vidéo, avec le permalien de la
  publication (une publication carrousel contenant une vidéo pointe vers son
  permalien unique).
- **Slug** : titre IA translittéré (minuscules, sans accents, tirets). S'il
  existe déjà dans `src/content/actualites/`, suffixe `-AAAA-MM-JJ`, puis
  `-2`, `-3`.
- **Retrait des hashtags** : on supprime en fin de légende les lignes
  composées uniquement de hashtags/mentions et d'espaces. Les hashtags dans le
  corps d'une phrase restent.
- **Légende vide** : le corps reste vide ; titre et résumé sont produits par
  l'IA à partir de ce qu'elle a (type de média, date).

### Identification

Le champ `instagram` (permalien) est la clé de déduplication. Le script
extrait le code court (`/p/<code>/` ou `/reel/<code>/`) des actus existantes
et des publications lues, et compare les codes : les deux formes d'URL d'une
même publication sont donc reconnues.

### Fichier des ignorées

`src/content/site/instagram-ignores.json` :

```json
{ "ignores": [ { "code": "Cxyz…", "date": "2026-09-14", "raison": "Annonce de fermeture du club" } ] }
```

Ajouté au commit de la PR : une fois fusionnée, ces publications ne sont plus
proposées. Retirer une entrée la fait reproposer au run suivant. Ce fichier
n'est pas une collection Astro (lu seulement par le script).

### Description de la PR

- tableau des actus proposées (titre, catégorie, date, lien Instagram) ;
- liste des publications ignorées avec leur raison ;
- liste des publications reportées (erreur IA ou téléchargement), retentées
  au prochain run ;
- rappel : relire titres/catégories, la PR met en ligne à la fusion.

## Classement IA

Requête `POST https://models.github.ai/inference/chat/completions`,
`Authorization: Bearer $GITHUB_TOKEN`, `response_format` JSON. Entrée : la
légende, le type de média, la date, la liste des catégories avec leur libellé
(`LIBELLES_CATEGORIE_ACTU`). Consigne : ne rien inventer, titre court en
français à la manière des actus existantes (exemples fournis :
quelques titres et résumés réels du dépôt).

Sortie attendue :

```json
{ "garder": true, "raison": "…", "titre": "…", "resume": "…", "categorie": "competition" }
```

Validation stricte : `garder` booléen, `raison` non vide ; si
`garder`, `titre`, `resume` non vides et `categorie` ∈ `CATEGORIES_ACTU`.
Réponse invalide, erreur HTTP ou quota dépassé → publication **reportée** (ni
écrite, ni ignorée).

## Lecteur vidéo Instagram (site)

`src/components/Videos.astro` reconnaît les liens `instagram.com/p/<code>`
et `instagram.com/reel/<code>` :

- rendu initial : bouton plein cadre « Lire la vidéo » (aucune iframe,
  aucune requête vers Instagram), cadre vertical (ratio 4/5, largeur max
  ~420 px, centré) ;
- au clic : remplacement par `<iframe src="https://www.instagram.com/<p|reel>/<code>/embed/">` ;
- sans JavaScript : le bouton est un lien vers la publication ;
- YouTube, Vimeo et fichiers locaux : inchangés.

La miniature de la vidéo est déjà dans le carrousel de l'actu ; le bouton
porte une icône lecture sur fond sombre, sans image (pas de dépendance à une
URL Instagram temporaire).

## Schéma

`actualiteSchema` gagne `instagram: z.string().url().optional()`. Le CMS
(`public/admin/config.yml`, collection actualités) expose ce champ en
lecture-écriture, optionnel, avec un hint (« Lien de la publication
Instagram d'origine — renseigné par la synchro »).

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `scripts/instagram-sync/main.ts` | Point d'entrée : orchestre le run ; option `--dry-run` (n'écrit rien, affiche le résultat) |
| `scripts/instagram-sync/selection.ts` | Fonctions pures : codes depuis permaliens, filtrage des nouvelles publications |
| `scripts/instagram-sync/redaction.ts` | Fonctions pures : retrait des hashtags, slug + collisions, frontmatter, rendu du `.md` |
| `scripts/instagram-sync/ia.ts` | Construction du prompt, validation de la réponse |
| `scripts/instagram-sync/clients.ts` | Seuls appels réseau : API Instagram, GitHub Models, téléchargement d'images |
| `.github/workflows/instagram-sync.yml` | Planification, permissions, PR via `gh` |

Les modules sont en TypeScript « effaçable » (pas d'`enum` ni de
`namespace`, imports avec extension `.ts`) et s'exécutent directement par
**Node 24** (`node scripts/instagram-sync/main.ts`, typage retiré nativement),
sans dépendance ajoutée. Ils réutilisent `CATEGORIES_ACTU` et
`LIBELLES_CATEGORIE_ACTU` de `src/lib/categories-actus.ts`. La validation de
la réponse IA est écrite à la main (quelques vérifications), sans Zod. Vitest
les teste comme le reste du dépôt ; un script `npm run instagram:sync` est
ajouté.

## Workflow

```yaml
on:
  schedule: [{ cron: "0 4 * * 1" }]
  workflow_dispatch:
# job : runs-on ubuntu-latest, actions/setup-node avec node-version 24
permissions:
  contents: write
  pull-requests: write
  issues: write
  models: read
concurrency: { group: instagram-sync, cancel-in-progress: false }
env:
  INSTAGRAM_SYNC_DEPUIS: "2026-07-10"
  INSTAGRAM_SYNC_MODELE: "openai/gpt-4.1-mini"
```

Secret : `INSTAGRAM_TOKEN`. Réglage dépôt à activer : *Settings → Actions →
General → « Allow GitHub Actions to create and approve pull requests »*. La PR
créée par `GITHUB_TOKEN` ne déclenche pas d'autres workflows GitHub ; la
preview Netlify (application GitHub de Netlify) fonctionne normalement.

## Gestion d'erreurs

| Cas | Effet |
| --- | --- |
| Jeton refusé/expiré | Issue d'alerte, run en échec, pas de PR |
| Expiration < 15 jours | Issue d'alerte, run poursuivi |
| API Instagram en erreur | Run en échec (rien d'écrit) |
| Réponse IA invalide / quota | Publication reportée, mentionnée dans la PR |
| Téléchargement d'une photo en échec | Publication reportée (pas d'actu incomplète) ; fichiers partiels supprimés |
| Aucune nouveauté | Fin normale, pas de PR |

L'issue d'alerte est unique : le script cherche une issue ouverte portant le
libellé `instagram-jeton` avant d'en créer une.

## Tests

Vitest, sans réseau (`clients.ts` remplacé par des doublures) :

- sélection : date de départ, codes déjà présents (formes `/p/` et
  `/reel/`), ignorées ;
- rédaction : retrait des hashtags (fin de légende seulement), légende vide,
  slug, collisions, frontmatter conforme à `actualiteSchema` ;
- IA : réponse valide, JSON invalide, catégorie inconnue, `garder: false` ;
- orchestration : une publication reportée n'apparaît ni dans les actus ni
  dans les ignorées ;
- `Videos.astro` : lien Instagram → bouton « Lire », pas d'iframe ; YouTube
  inchangé ;
- schéma : champ `instagram` accepté.

Vérification manuelle avant activation : `--dry-run` en local avec `.env`,
puis un `workflow_dispatch`.

## Documentation

`docs/INSTAGRAM-SETUP.md` : remplacer « Cette automatisation n'est pas encore
en place » par une section « Synchro hebdomadaire » (secret à créer, réglage
du dépôt, que faire à l'issue d'alerte, comment reproposer une publication
ignorée).

## Hors périmètre

- Mise à jour d'une actu déjà importée si la légende Instagram change.
- Reprise des publications antérieures au 2026-07-10.
- Résultats (`src/content/resultats/`) : les publications de résultats vont en
  actus catégorie « Compétition ».
- Réécriture automatique du jeton dans les secrets.
