# Synchro hebdomadaire Instagram → actualités — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une GitHub Action hebdomadaire lit les nouvelles publications Instagram du club, fait trier et titrer chacune par GitHub Models, écrit les actus (légende brute + photos) et les propose dans une PR glissante à valider.

**Architecture:** Un script TypeScript exécuté nativement par Node 24 (`scripts/instagram-sync/`), découpé en modules purs testables (sélection, rédaction, IA), un module réseau isolé (`clients.ts`) et une orchestration (`sync.ts`) testée avec de faux clients sur un dossier temporaire. Le workflow GitHub ne fait que la plomberie : choisir la branche, lancer le script, ouvrir l'issue d'alerte du jeton, commiter et ouvrir/commenter la PR avec `gh`. Côté site, `Videos.astro` gagne un lecteur Instagram chargé au clic.

**Tech Stack:** Node 24 (type stripping natif, aucune dépendance ajoutée), Astro 5 content collections (Zod), Vitest 3 + `experimental_AstroContainer`, GitHub Actions, `gh`, `jq`, API Instagram (Instagram Login, lecture seule), GitHub Models (`models.github.ai`).

**Spec:** `docs/superpowers/specs/2026-10-01-instagram-sync-design.md`

## Global Constraints

- **Prérequis (avant la tâche 1) :** le travail en cours non commité du dépôt (campagne de dons, favicons, `scripts/instagram-token.mjs`, `docs/INSTAGRAM-SETUP.md`, script `instagram:token` de `package.json`) doit être commité par le propriétaire du dépôt. Plusieurs tâches modifient `src/content.config.ts`, `public/admin/config.yml` et `package.json`, qui contiennent ce travail ; ne jamais le commiter à sa place ni l'écraser. Vérifier avec `git status` : si ces fichiers sont modifiés au démarrage, s'arrêter et demander.
- **Date de départ :** `2026-07-10` (`INSTAGRAM_SYNC_DEPUIS`).
- **Modèle :** `openai/gpt-4.1-mini` (`INSTAGRAM_SYNC_MODELE`), endpoint `https://models.github.ai/inference/chat/completions`, authentification `GITHUB_TOKEN`.
- **Planification :** cron `0 4 * * 1` + `workflow_dispatch`.
- **Branche de PR :** `sync/instagram`, une seule PR ouverte à la fois.
- **Libellé de l'issue d'alerte :** `instagram-jeton` ; seuil d'alerte : expiration < **15 jours**.
- **Corps des actus : légende Instagram brute**, seules les lignes finales composées uniquement de hashtags/mentions sont retirées. L'IA ne produit que `garder`, `raison`, `titre`, `resume`, `categorie`.
- **Catégories :** exactement `CATEGORIES_ACTU` de `src/lib/categories-actus.ts` (`competition`, `loisir`, `club`).
- **TypeScript effaçable** dans `scripts/instagram-sync/` : pas d'`enum`, de `namespace`, de propriétés de paramètre ; imports relatifs avec extension `.ts` ; imports de types avec `import type` ou `type` inline. Aucune dépendance npm ajoutée.
- **Node 24** pour le workflow de synchro (le workflow `pages.yml` reste en Node 20).
- **Langue :** tout texte visible (site, PR, issue, logs) en français. Messages de commit en français, à l'impératif, comme l'historique récent (« Ajoute… », « Répare… »).
- **Aucun secret dans le dépôt ni dans les logs** (ne jamais afficher un jeton).
- **Chaque tâche se termine par un commit** des seuls fichiers de la tâche.

## Review Focus

1. **Corrections faites à la main dans la PR écrasées la semaine suivante** — si une PR est ouverte, le run doit repartir de sa branche (pas de `main` + push forcé) pour conserver les retouches. Écart assumé à la spec (« branche recréée depuis main, push forcé ») : corrigé dans la spec en tâche 8 ; vérifié manuellement en tâche 8.
2. **Jeton tout juste créé (< 24 h)** — Instagram refuse alors le rafraîchissement ; le run ne doit pas crier à l'expiration si la lecture des publications fonctionne. Test en tâche 6.
3. **Publication de 23 h 30 UTC le 9 juillet** — c'est le 10 juillet à Paris : elle doit être retenue (date jugée en heure de Paris). Test en tâche 2.
4. **Titre IA sans lettres (emojis seuls) ou deux publications du même jour au même titre** — le slug ne doit être ni vide ni en collision. Tests en tâche 3 et tâche 6.
5. **Guillemets, deux-points, `---` dans le titre, le résumé ou la légende** — le frontmatter doit rester valide pour `actualiteSchema`. Test en tâche 3.

---

## File Structure

```
scripts/instagram-sync/
  selection.ts      # pur : types API, code court d'un permalien, codes déjà importés, date Paris, filtrage
  redaction.ts      # pur : retrait des hashtags finaux, slug, médias d'une publication, chemins photos, rendu .md
  ia.ts             # pur : messages envoyés au modèle, validation de la réponse
  clients.ts        # réseau uniquement : Instagram (refresh, médias), GitHub Models, téléchargement
  sync.ts           # orchestration d'un run (fs + clients injectés) et corps de la PR
  main.ts           # point d'entrée CLI : .env, options, écriture du rapport, code de sortie
tests/instagram-sync/
  selection.test.ts
  redaction.test.ts
  ia.test.ts
  sync.test.ts
tests/components/Videos.test.ts           # nouveau
src/content.config.ts                     # + champ instagram
src/content/site/instagram-ignores.json   # nouveau, { "ignores": [] }
src/components/Videos.astro               # + lecteur Instagram au clic
public/admin/config.yml                   # + champ instagram, libellé du lien vidéo
package.json                              # + script instagram:sync
.github/workflows/instagram-sync.yml      # nouveau
docs/INSTAGRAM-SETUP.md                   # + section « Synchro hebdomadaire »
docs/superpowers/specs/2026-10-01-instagram-sync-design.md  # écart branche (Review Focus 1)
```

---

### Task 1: Champ `instagram` des actus et fichier des ignorées

**Files:**
- Modify: `src/content.config.ts` (objet `actualiteSchema`, ~ligne 28)
- Modify: `public/admin/config.yml` (collection `actualites`, après le champ `videos`)
- Create: `src/content/site/instagram-ignores.json`
- Test: `tests/content-schemas.test.ts`

**Interfaces:**
- Produces: `actualiteSchema` accepte `instagram?: string` (URL). Fichier `src/content/site/instagram-ignores.json` au format `{ "ignores": [] }` (le workflow de la tâche 8 fait `git add` dessus : il doit exister).

- [ ] **Step 1: Vérifier le prérequis**

Run: `git status --short src/content.config.ts public/admin/config.yml package.json`
Expected: aucune ligne. Sinon : s'arrêter et demander au propriétaire du dépôt de commiter son travail en cours.

- [ ] **Step 2: Écrire les tests qui échouent**

Ajouter dans le `describe('actualiteSchema', …)` de `tests/content-schemas.test.ts` :

```ts
  test('accepte le lien de la publication Instagram d\'origine', () => {
    const a = actualiteSchema.parse({
      titre: 'x', date: '2026-09-14', resume: 'x',
      instagram: 'https://www.instagram.com/p/C1a2B3c4D5e/',
    });
    expect(a.instagram).toBe('https://www.instagram.com/p/C1a2B3c4D5e/');
  });
  test('rejette un champ instagram qui n\'est pas une URL', () => {
    expect(() => actualiteSchema.parse({ titre: 'x', date: '2026-09-14', resume: 'x', instagram: 'C1a2B3' })).toThrow();
  });
```

- [ ] **Step 3: Vérifier qu'ils échouent**

Run: `npx vitest run tests/content-schemas.test.ts`
Expected: FAIL — le premier test reçoit `undefined` (Zod retire la clé inconnue), le second ne lève pas.

- [ ] **Step 4: Ajouter le champ**

Dans `src/content.config.ts`, dans `actualiteSchema`, après `photos` :

```ts
  photos: z.array(z.string()).optional(),
  // Lien de la publication Instagram d'origine : clé de déduplication de la
  // synchro hebdomadaire (scripts/instagram-sync).
  instagram: z.string().url().optional(),
```

Dans `public/admin/config.yml`, collection `actualites`, à la fin de la liste `fields` (après le bloc `videos` et ses sous-champs, même indentation que `- label: "Vidéos"`) :

```yaml
      - { label: "Publication Instagram", name: "instagram", widget: "string", required: false, hint: "Lien de la publication Instagram d'origine. Renseigné par la synchro automatique : ne pas modifier, il évite que la publication soit importée deux fois." }
```

Créer `src/content/site/instagram-ignores.json` :

```json
{
  "ignores": []
}
```

- [ ] **Step 5: Vérifier**

Run: `npx vitest run && npm run build 2>&1 | tail -2`
Expected: tous les tests PASS ; build `Complete!` (le fichier JSON n'est pas une collection : il ne doit produire ni erreur ni avertissement de collection).

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts public/admin/config.yml src/content/site/instagram-ignores.json tests/content-schemas.test.ts
git commit -m "Ajoute aux actus le lien de la publication Instagram d'origine"
```

---

### Task 2: Sélection des nouvelles publications

**Files:**
- Create: `scripts/instagram-sync/selection.ts`
- Test: `tests/instagram-sync/selection.test.ts`

**Interfaces:**
- Produces:
  - `type TypeMedia = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"`
  - `interface EnfantInstagram { id: string; media_type: "IMAGE" | "VIDEO"; media_url?: string; thumbnail_url?: string }`
  - `interface PublicationInstagram { id: string; caption?: string; media_type: TypeMedia; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string; children?: { data: EnfantInstagram[] } }`
  - `codeDepuisPermalien(url: string): string | null`
  - `codesDejaImportes(markdowns: string[]): Set<string>`
  - `dateParis(timestamp: string): string` (AAAA-MM-JJ, Europe/Paris)
  - `selectionnerNouvelles(pubs: PublicationInstagram[], o: { depuis: string; codesConnus: Set<string> }): PublicationInstagram[]` (triées de la plus ancienne à la plus récente)

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/instagram-sync/selection.test.ts` :

```ts
import { describe, expect, test } from 'vitest';
import {
  codeDepuisPermalien, codesDejaImportes, dateParis, selectionnerNouvelles,
  type PublicationInstagram,
} from '../../scripts/instagram-sync/selection.ts';

const pub = (code: string, timestamp: string): PublicationInstagram => ({
  id: `id-${code}`, media_type: 'IMAGE', media_url: `https://cdn.test/${code}.jpg`,
  permalink: `https://www.instagram.com/p/${code}/`, timestamp,
});

describe('codeDepuisPermalien', () => {
  test('lit le code des formes /p/, /reel/ et /reels/', () => {
    expect(codeDepuisPermalien('https://www.instagram.com/p/C1a2B3c4D5e/')).toBe('C1a2B3c4D5e');
    expect(codeDepuisPermalien('https://www.instagram.com/reel/DAbc_-12/?igsh=x')).toBe('DAbc_-12');
    expect(codeDepuisPermalien('https://instagram.com/reels/XyZ/')).toBe('XyZ');
  });
  test('renvoie null pour une URL qui n\'est pas une publication', () => {
    expect(codeDepuisPermalien('https://www.instagram.com/cerclenautiquedefrance/')).toBeNull();
  });
});

describe('codesDejaImportes', () => {
  test('lit le champ instagram du frontmatter, avec ou sans guillemets', () => {
    const codes = codesDejaImportes([
      '---\ntitre: "a"\ninstagram: "https://www.instagram.com/p/AAA/"\n---\nTexte',
      '---\ntitre: b\ninstagram: https://www.instagram.com/reel/BBB/\n---\n',
      '---\ntitre: "c"\n---\nPas de lien',
    ]);
    expect([...codes].sort()).toEqual(['AAA', 'BBB']);
  });
});

describe('dateParis', () => {
  test('juge le jour en heure de Paris (format +0000 de l\'API)', () => {
    expect(dateParis('2026-07-09T22:30:00+0000')).toBe('2026-07-10');
    expect(dateParis('2026-12-31T22:59:59+0000')).toBe('2026-12-31');
  });
  test('lève une erreur sur un horodatage illisible', () => {
    expect(() => dateParis('hier')).toThrow(/illisible/);
  });
});

describe('selectionnerNouvelles', () => {
  test('garde les publications depuis la date de départ, inconnues, de la plus ancienne à la plus récente', () => {
    const r = selectionnerNouvelles(
      [
        pub('RECENTE', '2026-09-20T08:00:00+0000'),
        pub('CONNUE', '2026-09-10T08:00:00+0000'),
        pub('LIMITE', '2026-07-09T22:30:00+0000'),
        pub('TROPVIEILLE', '2026-07-09T21:30:00+0000'),
      ],
      { depuis: '2026-07-10', codesConnus: new Set(['CONNUE']) },
    );
    expect(r.map((p) => codeDepuisPermalien(p.permalink))).toEqual(['LIMITE', 'RECENTE']);
  });
  test('écarte une publication sans code lisible', () => {
    const r = selectionnerNouvelles(
      [{ ...pub('X', '2026-09-20T08:00:00+0000'), permalink: 'https://www.instagram.com/' }],
      { depuis: '2026-07-10', codesConnus: new Set() },
    );
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx vitest run tests/instagram-sync/selection.test.ts`
Expected: FAIL — `Failed to load url ../../scripts/instagram-sync/selection.ts`.

- [ ] **Step 3: Implémenter**

`scripts/instagram-sync/selection.ts` :

```ts
// Sélection des publications Instagram à importer : fonctions pures, sans
// réseau ni système de fichiers.

export type TypeMedia = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export interface EnfantInstagram {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
}

// Champs demandés à GET /me/media (voir clients.ts).
export interface PublicationInstagram {
  id: string;
  caption?: string;
  media_type: TypeMedia;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data: EnfantInstagram[] };
}

const RE_CODE = /instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)/;

// Code court d'une publication : identique dans /p/<code>/ et /reel/<code>/,
// c'est lui qui sert de clé de déduplication.
export function codeDepuisPermalien(url: string): string | null {
  return url.match(RE_CODE)?.[1] ?? null;
}

const RE_CHAMP_INSTAGRAM = /^instagram:\s*["']?([^"'\s]+)["']?\s*$/m;

export function codesDejaImportes(markdowns: string[]): Set<string> {
  const codes = new Set<string>();
  for (const md of markdowns) {
    const url = md.match(RE_CHAMP_INSTAGRAM)?.[1];
    const code = url ? codeDepuisPermalien(url) : null;
    if (code) codes.add(code);
  }
  return codes;
}

// L'API renvoie « 2026-09-14T18:30:00+0000 » : on ajoute le « : » du décalage
// pour un ISO 8601 strict.
function instant(timestamp: string): Date {
  const d = new Date(timestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(d.getTime())) throw new Error(`Horodatage illisible : ${timestamp}`);
  return d;
}

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
});

export function dateParis(timestamp: string): string {
  return JOUR_PARIS.format(instant(timestamp));
}

export function selectionnerNouvelles(
  pubs: PublicationInstagram[],
  o: { depuis: string; codesConnus: Set<string> },
): PublicationInstagram[] {
  return pubs
    .filter((p) => dateParis(p.timestamp) >= o.depuis)
    .filter((p) => {
      const code = codeDepuisPermalien(p.permalink);
      return code !== null && !o.codesConnus.has(code);
    })
    .sort((a, b) => instant(a.timestamp).getTime() - instant(b.timestamp).getTime());
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run tests/instagram-sync/selection.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/instagram-sync/selection.ts tests/instagram-sync/selection.test.ts
git commit -m "Sélectionne les publications Instagram à importer"
```

---

### Task 3: Rédaction des actus (légende, slug, médias, markdown)

**Files:**
- Create: `scripts/instagram-sync/redaction.ts`
- Test: `tests/instagram-sync/redaction.test.ts`

**Interfaces:**
- Consumes: `PublicationInstagram`, `EnfantInstagram` (tâche 2) ; `type CategorieActu` de `src/lib/categories-actus.ts`.
- Produces:
  - `retirerHashtagsFinaux(legende: string): string`
  - `slugifier(texte: string): string`
  - `slugLibre(titre: string, date: string, existants: Set<string>): string`
  - `interface MediasPublication { sources: string[]; aUneVideo: boolean }`
  - `mediasDe(pub: PublicationInstagram): MediasPublication`
  - `cheminPhoto(slug: string, index: number, extension: string): string` → `/medias/actus/<slug>/01.jpg`
  - `interface ActuGeneree { slug: string; titre: string; date: string; categorie: CategorieActu; resume: string; photos: string[]; video?: string; instagram: string; corps: string }`
  - `rendreMarkdown(a: ActuGeneree): string`

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/instagram-sync/redaction.test.ts` :

```ts
import { describe, expect, test } from 'vitest';
import { actualiteSchema } from '../../src/content.config';
import {
  cheminPhoto, mediasDe, rendreMarkdown, retirerHashtagsFinaux, slugifier, slugLibre,
  type ActuGeneree,
} from '../../scripts/instagram-sync/redaction.ts';
import type { PublicationInstagram } from '../../scripts/instagram-sync/selection.ts';

describe('retirerHashtagsFinaux', () => {
  test('retire les lignes finales de hashtags et de mentions, et les lignes de points', () => {
    const legende = 'Belle régate !\n\nMerci @coach 💪\n.\n.\n#aviron #cnf\n@ffaviron #rowing';
    expect(retirerHashtagsFinaux(legende)).toBe('Belle régate !\n\nMerci @coach 💪');
  });
  test('garde les hashtags dans le corps du texte', () => {
    expect(retirerHashtagsFinaux('Victoire au #championnat\nBravo à tous')).toBe('Victoire au #championnat\nBravo à tous');
  });
  test('une légende faite uniquement de hashtags devient vide', () => {
    expect(retirerHashtagsFinaux('#aviron #cnf')).toBe('');
    expect(retirerHashtagsFinaux('')).toBe('');
  });
  test('normalise les fins de ligne Windows', () => {
    expect(retirerHashtagsFinaux('Ligne 1\r\nLigne 2\r\n#cnf')).toBe('Ligne 1\nLigne 2');
  });
});

describe('slug', () => {
  test('translittère et met en tirets', () => {
    expect(slugifier('Championnats de France U17 — Libourne !')).toBe('championnats-de-france-u17-libourne');
    expect(slugifier('Régate d\'Été à Mâcon')).toBe('regate-d-ete-a-macon');
  });
  test('limite la longueur sans tiret final', () => {
    const s = slugifier('a'.repeat(79) + ' b c');
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith('-')).toBe(false);
  });
  test('un titre sans lettres donne un slug de repli daté', () => {
    expect(slugLibre('🚣🔥', '2026-09-14', new Set())).toBe('actu-instagram-2026-09-14');
  });
  test('en cas de collision : suffixe de date, puis numéro', () => {
    const existants = new Set(['regate', 'regate-2026-09-14']);
    expect(slugLibre('Régate', '2026-09-14', new Set())).toBe('regate');
    expect(slugLibre('Régate', '2026-09-14', new Set(['regate']))).toBe('regate-2026-09-14');
    expect(slugLibre('Régate', '2026-09-14', existants)).toBe('regate-2026-09-14-2');
  });
});

describe('mediasDe', () => {
  const base = { id: '1', permalink: 'https://www.instagram.com/p/X/', timestamp: '2026-09-14T10:00:00+0000' };
  test('image seule', () => {
    const p: PublicationInstagram = { ...base, media_type: 'IMAGE', media_url: 'https://cdn/i.jpg' };
    expect(mediasDe(p)).toEqual({ sources: ['https://cdn/i.jpg'], aUneVideo: false });
  });
  test('vidéo : sa miniature sert de photo', () => {
    const p: PublicationInstagram = { ...base, media_type: 'VIDEO', media_url: 'https://cdn/v.mp4', thumbnail_url: 'https://cdn/v.jpg' };
    expect(mediasDe(p)).toEqual({ sources: ['https://cdn/v.jpg'], aUneVideo: true });
  });
  test('carrousel mixte, enfant vidéo sans miniature ignoré', () => {
    const p: PublicationInstagram = {
      ...base, media_type: 'CAROUSEL_ALBUM',
      children: { data: [
        { id: 'a', media_type: 'IMAGE', media_url: 'https://cdn/a.jpg' },
        { id: 'b', media_type: 'VIDEO', thumbnail_url: 'https://cdn/b.jpg' },
        { id: 'c', media_type: 'VIDEO' },
      ] },
    };
    expect(mediasDe(p)).toEqual({ sources: ['https://cdn/a.jpg', 'https://cdn/b.jpg'], aUneVideo: true });
  });
});

describe('rendreMarkdown', () => {
  const actu: ActuGeneree = {
    slug: 'regate', titre: 'Régate : le "huit" gagne', date: '2026-09-14', categorie: 'competition',
    resume: 'Résumé avec « guillemets » et : deux-points', photos: [cheminPhoto('regate', 0, 'jpg'), cheminPhoto('regate', 1, 'png')],
    video: 'https://www.instagram.com/reel/ABC/', instagram: 'https://www.instagram.com/reel/ABC/',
    corps: 'Ligne 1\n---\nLigne 2',
  };

  test('chemins des photos numérotés sur deux chiffres', () => {
    expect(cheminPhoto('regate', 0, 'jpg')).toBe('/medias/actus/regate/01.jpg');
    expect(cheminPhoto('regate', 11, 'webp')).toBe('/medias/actus/regate/12.webp');
  });

  test('produit un frontmatter conforme à actualiteSchema, valeurs intactes', () => {
    const md = rendreMarkdown(actu);
    const [, front] = md.split(/^---$/m);
    const donnees: Record<string, unknown> = {};
    let liste: string | null = null;
    for (const ligne of front.trim().split('\n')) {
      const item = ligne.match(/^  - (?:lien: )?(.*)$/);
      if (item && liste) {
        const v = JSON.parse(item[1]);
        (donnees[liste] as unknown[]).push(liste === 'videos' ? { lien: v } : v);
        continue;
      }
      const [, cle, valeur] = ligne.match(/^(\w+):\s*(.*)$/)!;
      if (valeur === '') { liste = cle; donnees[cle] = []; continue; }
      donnees[cle] = cle === 'date' ? valeur : JSON.parse(valeur);
    }
    const a = actualiteSchema.parse(donnees);
    expect(a.titre).toBe('Régate : le "huit" gagne');
    expect(a.resume).toBe('Résumé avec « guillemets » et : deux-points');
    expect(a.image).toBe('/medias/actus/regate/01.jpg');
    expect(a.photos).toEqual(['/medias/actus/regate/01.jpg', '/medias/actus/regate/02.png']);
    expect(a.videos).toEqual([{ lien: 'https://www.instagram.com/reel/ABC/' }]);
    expect(a.instagram).toBe('https://www.instagram.com/reel/ABC/');
    expect(md.endsWith('---\nLigne 1\n---\nLigne 2\n')).toBe(true);
  });

  test('sans vidéo ni corps : pas de bloc videos, pas de texte', () => {
    const md = rendreMarkdown({ ...actu, video: undefined, corps: '' });
    expect(md).not.toContain('videos:');
    expect(md.endsWith('---\n')).toBe(true);
  });
});
```

Note pour le test du frontmatter : `split(/^---$/m)` coupe aussi sur le `---` du corps ; seul le deuxième morceau (le frontmatter) est analysé, et `md.endsWith(...)` vérifie le corps complet.

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx vitest run tests/instagram-sync/redaction.test.ts`
Expected: FAIL — module `redaction.ts` introuvable.

- [ ] **Step 3: Implémenter**

`scripts/instagram-sync/redaction.ts` :

```ts
// Transformation d'une publication Instagram en actualité du site : fonctions
// pures. La légende reste brute (décision de la spec) : seul le bloc final de
// hashtags/mentions est retiré.
import type { CategorieActu } from "../../src/lib/categories-actus.ts";
import type { EnfantInstagram, PublicationInstagram } from "./selection.ts";

// Ligne « décorative » : rien d'autre que des hashtags, des mentions, des
// points ou des puces (les « . » empilés qu'on voit souvent avant les hashtags).
function estDecorative(ligne: string): boolean {
  return ligne.replace(/[#@][^\s]+/gu, "").replace(/[\s.·•…_-]/gu, "") === "";
}

export function retirerHashtagsFinaux(legende: string): string {
  const lignes = legende.replace(/\r\n/g, "\n").split("\n");
  while (lignes.length > 0 && estDecorative(lignes[lignes.length - 1])) lignes.pop();
  return lignes.join("\n").trim();
}

export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export function slugLibre(titre: string, date: string, existants: Set<string>): string {
  const base = slugifier(titre) || `actu-instagram-${date}`;
  if (!existants.has(base)) return base;
  const avecDate = base.endsWith(date) ? base : `${base}-${date}`;
  if (!existants.has(avecDate)) return avecDate;
  for (let n = 2; ; n++) {
    const candidat = `${avecDate}-${n}`;
    if (!existants.has(candidat)) return candidat;
  }
}

export interface MediasPublication {
  sources: string[];
  aUneVideo: boolean;
}

// Images à télécharger, dans l'ordre de la publication. Une vidéo contribue
// sa miniature (son media_url est un MP4 signé et temporaire).
export function mediasDe(pub: PublicationInstagram): MediasPublication {
  const elements: Array<PublicationInstagram | EnfantInstagram> =
    pub.media_type === "CAROUSEL_ALBUM" ? pub.children?.data ?? [] : [pub];
  const sources: string[] = [];
  let aUneVideo = false;
  for (const e of elements) {
    if (e.media_type === "VIDEO") {
      aUneVideo = true;
      if (e.thumbnail_url) sources.push(e.thumbnail_url);
    } else if (e.media_url) {
      sources.push(e.media_url);
    }
  }
  return { sources, aUneVideo };
}

export function cheminPhoto(slug: string, index: number, extension: string): string {
  return `/medias/actus/${slug}/${String(index + 1).padStart(2, "0")}.${extension}`;
}

export interface ActuGeneree {
  slug: string;
  titre: string;
  date: string;
  categorie: CategorieActu;
  resume: string;
  photos: string[];
  video?: string;
  instagram: string;
  corps: string;
}

// Les chaînes sont écrites en JSON : un JSON est un scalaire YAML entre
// guillemets valide, quels que soient les guillemets, deux-points ou emojis.
const q = (s: string) => JSON.stringify(s);

export function rendreMarkdown(a: ActuGeneree): string {
  const lignes = [
    "---",
    `titre: ${q(a.titre)}`,
    `date: ${a.date}`,
    `categorie: ${q(a.categorie)}`,
    `resume: ${q(a.resume)}`,
  ];
  if (a.photos.length > 0) {
    lignes.push(`image: ${q(a.photos[0])}`, "photos:", ...a.photos.map((p) => `  - ${q(p)}`));
  }
  if (a.video) lignes.push("videos:", `  - lien: ${q(a.video)}`);
  lignes.push(`instagram: ${q(a.instagram)}`, "---", "");
  return lignes.join("\n") + (a.corps ? `${a.corps}\n` : "");
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run tests/instagram-sync/redaction.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/instagram-sync/redaction.ts tests/instagram-sync/redaction.test.ts
git commit -m "Rédige les actus à partir des publications Instagram"
```

---

### Task 4: Messages et réponse de l'IA

**Files:**
- Create: `scripts/instagram-sync/ia.ts`
- Test: `tests/instagram-sync/ia.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES_ACTU`, `LIBELLES_CATEGORIE_ACTU`, `type CategorieActu` de `src/lib/categories-actus.ts`.
- Produces:
  - `interface MessageIA { role: "system" | "user"; content: string }`
  - `interface EntreeIA { legende: string; type: string; date: string }`
  - `interface ExempleActu { titre: string; resume: string }`
  - `type DecisionIA = { garder: false; raison: string } | { garder: true; raison: string; titre: string; resume: string; categorie: CategorieActu }`
  - `construireMessages(entree: EntreeIA, exemples: ExempleActu[]): MessageIA[]` (2 messages : `system` puis `user`)
  - `lireDecision(texte: string): DecisionIA | null` (`null` = réponse inexploitable)

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/instagram-sync/ia.test.ts` :

```ts
import { describe, expect, test } from 'vitest';
import { construireMessages, lireDecision } from '../../scripts/instagram-sync/ia.ts';

describe('construireMessages', () => {
  const m = construireMessages(
    { legende: 'Belle régate à Mâcon', type: 'CAROUSEL_ALBUM', date: '2026-05-08' },
    [{ titre: 'Yolecup 2025', resume: 'Le CNF 1 remporte la Yolecup.' }],
  );
  test('un message système puis un message utilisateur', () => {
    expect(m.map((x) => x.role)).toEqual(['system', 'user']);
  });
  test('le système liste les catégories, interdit d\'inventer, exige du JSON et cite les exemples', () => {
    expect(m[0].content).toContain('"competition"');
    expect(m[0].content).toContain('"loisir"');
    expect(m[0].content).toContain('"club"');
    expect(m[0].content).toContain("N'invente rien");
    expect(m[0].content).toContain('JSON');
    expect(m[0].content).toContain('Yolecup 2025');
  });
  test('l\'utilisateur porte la date, le type et la légende', () => {
    expect(m[1].content).toContain('2026-05-08');
    expect(m[1].content).toContain('CAROUSEL_ALBUM');
    expect(m[1].content).toContain('Belle régate à Mâcon');
  });
  test('légende vide signalée explicitement', () => {
    const v = construireMessages({ legende: '', type: 'IMAGE', date: '2026-05-08' }, []);
    expect(v[1].content).toContain('(aucune légende)');
  });
});

describe('lireDecision', () => {
  test('actu à garder', () => {
    expect(lireDecision('{"garder":true,"raison":"compte rendu","titre":" Régate ","resume":"Une régate.","categorie":"competition"}'))
      .toEqual({ garder: true, raison: 'compte rendu', titre: 'Régate', resume: 'Une régate.', categorie: 'competition' });
  });
  test('publication à ignorer : les autres champs sont facultatifs', () => {
    expect(lireDecision('{"garder":false,"raison":"annonce d\'horaires"}'))
      .toEqual({ garder: false, raison: "annonce d'horaires" });
  });
  test('accepte un JSON entouré d\'un bloc de code markdown', () => {
    expect(lireDecision('```json\n{"garder":false,"raison":"repost"}\n```')).toEqual({ garder: false, raison: 'repost' });
  });
  test.each([
    ['texte libre', 'Oui, c\'est une actu'],
    ['pas un objet', '[1,2]'],
    ['garder non booléen', '{"garder":"oui","raison":"x"}'],
    ['raison vide', '{"garder":false,"raison":"  "}'],
    ['titre manquant', '{"garder":true,"raison":"x","resume":"r","categorie":"club"}'],
    ['catégorie inconnue', '{"garder":true,"raison":"x","titre":"t","resume":"r","categorie":"peche"}'],
  ])('réponse inexploitable (%s) → null', (_cas, texte) => {
    expect(lireDecision(texte)).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx vitest run tests/instagram-sync/ia.test.ts`
Expected: FAIL — module `ia.ts` introuvable.

- [ ] **Step 3: Implémenter**

`scripts/instagram-sync/ia.ts` :

```ts
// Dialogue avec le modèle (GitHub Models) : construction des messages et
// validation stricte de la réponse. L'IA ne rédige que les métadonnées de
// l'actu ; le corps reste la légende brute.
import {
  CATEGORIES_ACTU, LIBELLES_CATEGORIE_ACTU, type CategorieActu,
} from "../../src/lib/categories-actus.ts";

export interface MessageIA {
  role: "system" | "user";
  content: string;
}

export interface EntreeIA {
  legende: string;
  type: string;
  date: string;
}

export interface ExempleActu {
  titre: string;
  resume: string;
}

export type DecisionIA =
  | { garder: false; raison: string }
  | { garder: true; raison: string; titre: string; resume: string; categorie: CategorieActu };

export function construireMessages(entree: EntreeIA, exemples: ExempleActu[]): MessageIA[] {
  const categories = CATEGORIES_ACTU.map((c) => `- "${c}" : ${LIBELLES_CATEGORIE_ACTU[c]}`).join("\n");
  const ex = exemples.map((e) => `- titre : ${e.titre}\n  résumé : ${e.resume}`).join("\n");
  const systeme = [
    "Tu aides le Cercle Nautique de France, club d'aviron de Neuilly-sur-Seine, à transformer ses publications Instagram en actualités de son site.",
    "Décide d'abord si la publication mérite une actualité : oui pour un compte rendu de compétition ou de randonnée, un événement, un moment de la vie du club ; non pour une annonce pratique ponctuelle (horaires, fermeture), un simple repost, un message sans contenu.",
    "Si oui, rédige en français :",
    "- un titre court et factuel (60 caractères au plus), dans le style des exemples ;",
    "- un résumé d'une phrase (200 caractères au plus) ;",
    "- une catégorie parmi :",
    categories,
    "N'invente rien : utilise uniquement les informations de la légende (noms, lieux, résultats, dates).",
    'Réponds uniquement par un objet JSON : {"garder": booléen, "raison": "…", "titre": "…", "resume": "…", "categorie": "…"}. Si garder vaut false, titre, resume et categorie peuvent être omis.',
    "",
    "Exemples d'actualités existantes :",
    ex || "(aucun)",
  ].join("\n");
  const utilisateur = `Date : ${entree.date}\nType : ${entree.type}\nLégende :\n${entree.legende || "(aucune légende)"}`;
  return [
    { role: "system", content: systeme },
    { role: "user", content: utilisateur },
  ];
}

const nonVide = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

export function lireDecision(texte: string): DecisionIA | null {
  let brut: unknown;
  try {
    brut = JSON.parse(texte.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
  } catch {
    return null;
  }
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return null;
  const { garder, raison, titre, resume, categorie } = brut as Record<string, unknown>;
  if (typeof garder !== "boolean" || !nonVide(raison)) return null;
  if (!garder) return { garder: false, raison: raison.trim() };
  if (!nonVide(titre) || !nonVide(resume)) return null;
  if (typeof categorie !== "string" || !(CATEGORIES_ACTU as readonly string[]).includes(categorie)) return null;
  return {
    garder: true,
    raison: raison.trim(),
    titre: titre.trim(),
    resume: resume.trim(),
    categorie: categorie as CategorieActu,
  };
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run tests/instagram-sync/ia.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/instagram-sync/ia.ts tests/instagram-sync/ia.test.ts
git commit -m "Prépare les messages et valide les réponses de l'IA de la synchro"
```

---

### Task 5: Lecteur vidéo Instagram chargé au clic

**Files:**
- Modify: `src/components/Videos.astro`
- Modify: `public/admin/config.yml` (libellé/hint du champ `lien` des vidéos, collections `actualites` et `resultats`)
- Test: `tests/components/Videos.test.ts` (nouveau)

**Interfaces:**
- Consumes: `videos[].lien` des actus, au format écrit par la tâche 3 (`https://www.instagram.com/p|reel/<code>/`).
- Produces: rendu `<div class="videos__ig" data-ig-embed="https://www.instagram.com/<p|reel>/<code>/embed/">` contenant un lien « Lire la vidéo » vers la publication ; aucune iframe Instagram au rendu serveur.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/components/Videos.test.ts` :

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Videos from '../../src/components/Videos.astro';

test('un lien Instagram donne un bouton « Lire la vidéo », sans iframe au premier rendu', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ lien: 'https://www.instagram.com/reel/DAbc_-12/' }] },
  });
  expect(html).toContain('data-ig-embed="https://www.instagram.com/reel/DAbc_-12/embed/"');
  expect(html).toContain('Lire la vidéo');
  expect(html).toContain('href="https://www.instagram.com/reel/DAbc_-12/"');
  expect(html).not.toContain('<iframe');
});

test('une publication /p/ garde la forme /p/ dans l\'URL d\'intégration', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ lien: 'https://www.instagram.com/p/C1a2B3/?igsh=abc' }] },
  });
  expect(html).toContain('data-ig-embed="https://www.instagram.com/p/C1a2B3/embed/"');
});

test('YouTube reste intégré directement', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ lien: 'https://youtu.be/dQw4w9WgXcQ' }] },
  });
  expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  expect(html).not.toContain('data-ig-embed');
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx vitest run tests/components/Videos.test.ts`
Expected: les deux premiers tests FAIL (le lien Instagram est rendu comme simple `<a>`), le troisième PASS.

- [ ] **Step 3: Implémenter**

Dans `src/components/Videos.astro`, frontmatter : ajouter après la fonction `embed` :

```ts
// Publication Instagram : le lecteur officiel (…/embed/) n'est chargé qu'au
// clic, pour ne contacter Instagram (et ses cookies) que si le visiteur le veut.
function instagram(url: string): { embed: string; lien: string } | null {
  const m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/);
  if (!m) return null;
  const type = m[1] === "p" ? "p" : "reel";
  return { embed: `https://www.instagram.com/${type}/${m[2]}/embed/`, lien: url };
}
```

Dans la boucle, remplacer :

```astro
      const emb = v.lien ? embed(v.lien) : null;
      return (
        <figure class="videos__item">
          {emb ? (
```

par :

```astro
      const emb = v.lien ? embed(v.lien) : null;
      const ig = v.lien ? instagram(v.lien) : null;
      return (
        <figure class="videos__item">
          {ig ? (
            <div class="videos__ig" data-ig-embed={ig.embed}>
              <a class="videos__ig-play" href={ig.lien} target="_blank" rel="noopener">
                <span class="videos__ig-icone" aria-hidden="true">▶</span>
                <span class="videos__ig-label">Lire la vidéo</span>
                <span class="videos__ig-note">Lecteur Instagram</span>
              </a>
            </div>
          ) : emb ? (
```

Après la fermeture `)}` du bloc principal (avant `<style>`), ajouter :

```astro
<script>
  // Au clic, le bouton est remplacé par l'iframe Instagram. Sans JS, le lien
  // ouvre la publication sur Instagram.
  document.querySelectorAll<HTMLElement>("[data-ig-embed]").forEach((cadre) => {
    cadre.querySelector("a")?.addEventListener("click", (e) => {
      e.preventDefault();
      const iframe = document.createElement("iframe");
      iframe.src = cadre.dataset.igEmbed ?? "";
      iframe.title = "Vidéo Instagram";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      cadre.replaceChildren(iframe);
    });
  });
</script>
```

Dans `<style>`, ajouter :

```css
  /* Cadre vertical : le lecteur Instagram (en-tête + vidéo + pied) est en portrait. */
  .videos__ig { position: relative; width: 100%; max-width: 380px; aspect-ratio: 9 / 16; margin-inline: auto; border-radius: 12px; overflow: hidden; background: #0a1f33; }
  .videos__ig iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; }
  .videos__ig-play { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; color: #fff; text-decoration: none; }
  .videos__ig-icone { display: grid; place-items: center; width: 4rem; height: 4rem; border-radius: 50%; background: rgba(255,255,255,.18); font-size: 1.6rem; padding-left: 0.25rem; transition: background .2s; }
  .videos__ig-play:hover .videos__ig-icone, .videos__ig-play:focus-visible .videos__ig-icone { background: rgba(255,255,255,.32); }
  .videos__ig-play:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
  .videos__ig-label { font-weight: 700; font-size: 1.05rem; }
  .videos__ig-note { font-size: 0.8rem; opacity: .75; }
```

Dans `public/admin/config.yml`, pour chaque champ `lien` des vidéos (collections `actualites` et `resultats`), remplacer label et hint :

```yaml
          - { label: "Lien YouTube / Vimeo / Instagram", name: "lien", widget: "string", required: false, hint: "Recommandé (léger) : collez un lien de partage YouTube, Vimeo ou d'une publication Instagram (le lecteur Instagram ne se charge qu'au clic)." }
```

(Repérer les lignes avec `grep -n 'Lien YouTube / Vimeo' public/admin/config.yml` ; garder l'indentation existante de chaque occurrence.)

Écart à la spec : celle-ci indique un cadre 4/5 ; le lecteur Instagram (en-tête + vidéo + pied) est plus haut, d'où un 9/16 de départ, à ajuster à l'œil au Step 4.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run && npm run build 2>&1 | tail -1`
Expected: tous les tests PASS ; `Complete!`.

Vérification visuelle : dans le serveur de dev (`npx astro dev`), ajouter temporairement `videos: [{ lien: "https://www.instagram.com/reel/<un reel public du club>/" }]` à une actu, ouvrir la page, cliquer « Lire la vidéo » : le lecteur Instagram doit apparaître et lire la vidéo. Si l'en-tête ou le pied du lecteur sont coupés, ajuster `aspect-ratio`/`max-width` de `.videos__ig`. **Retirer la modification temporaire de l'actu** avant de commiter.

- [ ] **Step 5: Commit**

```bash
git add src/components/Videos.astro public/admin/config.yml tests/components/Videos.test.ts
git commit -m "Intègre les vidéos Instagram avec un lecteur chargé au clic"
```

---

### Task 6: Orchestration d'un run et corps de la PR

**Files:**
- Create: `scripts/instagram-sync/clients.ts` (interface seulement à cette tâche ; implémentation réelle en tâche 7)
- Create: `scripts/instagram-sync/sync.ts`
- Test: `tests/instagram-sync/sync.test.ts`

**Interfaces:**
- Consumes: tâches 2, 3, 4 (`selectionnerNouvelles`, `codesDejaImportes`, `codeDepuisPermalien`, `dateParis`, `retirerHashtagsFinaux`, `slugLibre`, `mediasDe`, `cheminPhoto`, `rendreMarkdown`, `construireMessages`, `lireDecision`, `MessageIA`, `ExempleActu`, `PublicationInstagram`).
- Produces:
  - dans `clients.ts` : `interface Clients { rafraichirJeton(jeton: string): Promise<{ jeton: string; expireDansSecondes: number }>; listerPublications(jeton: string, depuis: string): Promise<PublicationInstagram[]>; demanderIA(messages: MessageIA[], modele: string): Promise<string>; telecharger(url: string): Promise<{ octets: Uint8Array; extension: string }> }`
  - dans `sync.ts` :
    - `interface OptionsSync { racine: string; depuis: string; modele: string; jeton: string; clients: Clients; ecrire: boolean; pauseMs?: number; seuilAlerteJours?: number }`
    - `interface IgnoreeInstagram { code: string; date: string; raison: string }`
    - `interface RapportSync { jeton: { ok: boolean; alerte: boolean; joursRestants?: number; identique?: boolean; erreur?: string }; actus: { slug: string; titre: string; categorie: CategorieActu; date: string; instagram: string }[]; ignorees: (IgnoreeInstagram & { instagram: string })[]; reportees: { instagram: string; raison: string }[] }`
    - `const FICHIER_IGNORES = "src/content/site/instagram-ignores.json"`
    - `synchroniser(o: OptionsSync): Promise<RapportSync>` — ne lève que si la lecture des publications échoue alors que le jeton a pu être rafraîchi.
    - `corpsPR(r: RapportSync): string`

- [ ] **Step 1: Créer l'interface des clients**

`scripts/instagram-sync/clients.ts` :

```ts
// Seuls appels réseau de la synchro. Tout le reste reçoit un objet Clients,
// remplacé par des doublures dans les tests.
import type { MessageIA } from "./ia.ts";
import type { PublicationInstagram } from "./selection.ts";

export interface Clients {
  rafraichirJeton(jeton: string): Promise<{ jeton: string; expireDansSecondes: number }>;
  listerPublications(jeton: string, depuis: string): Promise<PublicationInstagram[]>;
  demanderIA(messages: MessageIA[], modele: string): Promise<string>;
  telecharger(url: string): Promise<{ octets: Uint8Array; extension: string }>;
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

`tests/instagram-sync/sync.test.ts` :

```ts
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Clients } from '../../scripts/instagram-sync/clients.ts';
import type { PublicationInstagram } from '../../scripts/instagram-sync/selection.ts';
import {
  corpsPR, FICHIER_IGNORES, synchroniser, type OptionsSync, type RapportSync,
} from '../../scripts/instagram-sync/sync.ts';

async function depot(actus: Record<string, string> = {}): Promise<string> {
  const racine = await mkdtemp(path.join(tmpdir(), 'ig-sync-'));
  await mkdir(path.join(racine, 'src/content/actualites'), { recursive: true });
  await mkdir(path.join(racine, 'src/content/site'), { recursive: true });
  await writeFile(path.join(racine, FICHIER_IGNORES), '{\n  "ignores": []\n}\n');
  for (const [slug, md] of Object.entries(actus)) {
    await writeFile(path.join(racine, 'src/content/actualites', `${slug}.md`), md);
  }
  return racine;
}

const pub = (code: string, extra: Partial<PublicationInstagram> = {}): PublicationInstagram => ({
  id: `id-${code}`,
  caption: `Légende ${code}\n\n#aviron #cnf`,
  media_type: 'IMAGE',
  media_url: `https://cdn.test/${code}.jpg`,
  permalink: `https://www.instagram.com/p/${code}/`,
  timestamp: '2026-09-14T10:00:00+0000',
  ...extra,
});

const GARDER = JSON.stringify({ garder: true, raison: 'compte rendu', titre: 'Régate de test', resume: 'Une régate.', categorie: 'competition' });

function faux(o: {
  pubs?: PublicationInstagram[];
  ia?: (messageUtilisateur: string) => string;
  rafraichir?: Clients['rafraichirJeton'];
  lister?: Clients['listerPublications'];
  telecharger?: Clients['telecharger'];
} = {}): Clients {
  return {
    rafraichirJeton: o.rafraichir ?? (async (j) => ({ jeton: j, expireDansSecondes: 50 * 86400 })),
    listerPublications: o.lister ?? (async () => o.pubs ?? []),
    demanderIA: async (messages) => (o.ia ?? (() => GARDER))(messages[1].content),
    telecharger: o.telecharger ?? (async () => ({ octets: new Uint8Array([1, 2, 3]), extension: 'jpg' })),
  };
}

const options = (racine: string, clients: Clients, extra: Partial<OptionsSync> = {}): OptionsSync => ({
  racine, depuis: '2026-07-10', modele: 'test', jeton: 'JETON', clients, ecrire: true, ...extra,
});

const lire = (racine: string, rel: string) => readFile(path.join(racine, rel), 'utf8');

describe('synchroniser', () => {
  test('écrit l\'actu (légende sans hashtags) et ses photos', async () => {
    const racine = await depot();
    const r = await synchroniser(options(racine, faux({ pubs: [pub('AAA')] })));
    expect(r.actus).toEqual([{ slug: 'regate-de-test', titre: 'Régate de test', categorie: 'competition', date: '2026-09-14', instagram: 'https://www.instagram.com/p/AAA/' }]);
    const md = await lire(racine, 'src/content/actualites/regate-de-test.md');
    expect(md).toContain('instagram: "https://www.instagram.com/p/AAA/"');
    expect(md).toContain('image: "/medias/actus/regate-de-test/01.jpg"');
    expect(md.endsWith('---\nLégende AAA\n')).toBe(true);
    expect(await readdir(path.join(racine, 'public/medias/actus/regate-de-test'))).toEqual(['01.jpg']);
  });

  test('une publication importée n\'est pas reproposée au run suivant', async () => {
    const racine = await depot();
    await synchroniser(options(racine, faux({ pubs: [pub('AAA')] })));
    const r = await synchroniser(options(racine, faux({ pubs: [pub('AAA')] })));
    expect(r.actus).toEqual([]);
  });

  test('une publication écartée par l\'IA est notée dans les ignorées et n\'est plus reproposée', async () => {
    const racine = await depot();
    const ia = () => JSON.stringify({ garder: false, raison: 'annonce d\'horaires' });
    const r = await synchroniser(options(racine, faux({ pubs: [pub('BBB')], ia })));
    expect(r.ignorees).toEqual([{ code: 'BBB', date: '2026-09-14', raison: 'annonce d\'horaires', instagram: 'https://www.instagram.com/p/BBB/' }]);
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES))).toEqual({ ignores: [{ code: 'BBB', date: '2026-09-14', raison: 'annonce d\'horaires' }] });
    expect(await readdir(path.join(racine, 'src/content/actualites'))).toEqual([]);
    const r2 = await synchroniser(options(racine, faux({ pubs: [pub('BBB')] })));
    expect(r2.actus).toEqual([]);
  });

  test('réponse IA illisible ou IA en panne : publication reportée, ni écrite ni ignorée', async () => {
    const racine = await depot();
    const clients = faux({ pubs: [pub('CCC'), pub('DDD', { timestamp: '2026-09-15T10:00:00+0000' })] });
    clients.demanderIA = async (messages) => {
      if (messages[1].content.includes('CCC')) return 'pas du JSON';
      throw new Error('quota dépassé');
    };
    const r = await synchroniser(options(racine, clients));
    expect(r.reportees.map((x) => x.instagram)).toEqual(['https://www.instagram.com/p/CCC/', 'https://www.instagram.com/p/DDD/']);
    expect(r.reportees[1].raison).toContain('quota dépassé');
    expect(r.actus).toEqual([]);
    expect(r.ignorees).toEqual([]);
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES))).toEqual({ ignores: [] });
  });

  test('une photo impossible à télécharger reporte toute la publication, sans fichier partiel', async () => {
    const racine = await depot();
    const carrousel = pub('EEE', {
      media_type: 'CAROUSEL_ALBUM', media_url: undefined,
      children: { data: [
        { id: '1', media_type: 'IMAGE', media_url: 'https://cdn.test/ok.jpg' },
        { id: '2', media_type: 'IMAGE', media_url: 'https://cdn.test/ko.jpg' },
      ] },
    });
    const telecharger: Clients['telecharger'] = async (url) => {
      if (url.includes('ko')) throw new Error('HTTP 403');
      return { octets: new Uint8Array([1]), extension: 'jpg' };
    };
    const r = await synchroniser(options(racine, faux({ pubs: [carrousel], telecharger })));
    expect(r.reportees).toEqual([{ instagram: 'https://www.instagram.com/p/EEE/', raison: 'Téléchargement impossible : HTTP 403' }]);
    expect(await readdir(path.join(racine, 'src/content/actualites'))).toEqual([]);
    await expect(readdir(path.join(racine, 'public/medias/actus/regate-de-test'))).rejects.toThrow();
  });

  test('deux publications au même titre le même jour obtiennent deux slugs distincts', async () => {
    const racine = await depot();
    const r = await synchroniser(options(racine, faux({ pubs: [pub('F1'), pub('F2', { timestamp: '2026-09-14T12:00:00+0000' })] })));
    expect(r.actus.map((a) => a.slug)).toEqual(['regate-de-test', 'regate-de-test-2026-09-14']);
  });

  test('vidéo : la miniature va dans les photos et le permalien dans videos', async () => {
    const racine = await depot();
    const video = pub('GGG', { media_type: 'VIDEO', media_url: 'https://cdn.test/v.mp4', thumbnail_url: 'https://cdn.test/v.jpg', permalink: 'https://www.instagram.com/reel/GGG/' });
    await synchroniser(options(racine, faux({ pubs: [video] })));
    const md = await lire(racine, 'src/content/actualites/regate-de-test.md');
    expect(md).toContain('videos:\n  - lien: "https://www.instagram.com/reel/GGG/"');
  });

  test('essai à blanc : rapport complet, rien d\'écrit', async () => {
    const racine = await depot();
    const ia = (m: string) => (m.includes('HHH') ? GARDER : JSON.stringify({ garder: false, raison: 'repost' }));
    const r = await synchroniser(options(racine, faux({ pubs: [pub('HHH'), pub('III')], ia }), { ecrire: false }));
    expect(r.actus).toHaveLength(1);
    expect(r.ignorees).toHaveLength(1);
    expect(await readdir(path.join(racine, 'src/content/actualites'))).toEqual([]);
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES))).toEqual({ ignores: [] });
    await expect(readdir(path.join(racine, 'public'))).rejects.toThrow();
  });

  test('les actus existantes servent d\'exemples à l\'IA', async () => {
    const racine = await depot({ yolecup: '---\ntitre: "Yolecup 2025"\nresume: "Le CNF 1 gagne."\n---\n' });
    const clients = faux({ pubs: [pub('JJJ')] });
    let systeme = '';
    clients.demanderIA = async (messages) => { systeme = messages[0].content; return GARDER; };
    await synchroniser(options(racine, clients));
    expect(systeme).toContain('Yolecup 2025');
  });
});

describe('synchroniser — jeton', () => {
  test('jeton rafraîchi, identique, loin de l\'expiration : pas d\'alerte', async () => {
    const r = await synchroniser(options(await depot(), faux()));
    expect(r.jeton).toEqual({ ok: true, alerte: false, joursRestants: 50, identique: true });
  });

  test('expiration dans moins de 15 jours : alerte, mais le run continue', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => ({ jeton: 'NOUVEAU', expireDansSecondes: 10 * 86400 });
    const r = await synchroniser(options(await depot(), faux({ pubs: [pub('KKK')], rafraichir })));
    expect(r.jeton).toEqual({ ok: true, alerte: true, joursRestants: 10, identique: false });
    expect(r.actus).toHaveLength(1);
  });

  test('rafraîchissement refusé (jeton de moins de 24 h) mais lecture possible : pas d\'alerte', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => { throw new Error('token too young'); };
    const r = await synchroniser(options(await depot(), faux({ pubs: [pub('LLL')], rafraichir })));
    expect(r.jeton).toEqual({ ok: true, alerte: false, erreur: 'token too young' });
    expect(r.actus).toHaveLength(1);
  });

  test('rafraîchissement et lecture refusés : jeton invalide, alerte, aucun traitement', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => { throw new Error('expired'); };
    const lister: Clients['listerPublications'] = async () => { throw new Error('invalid token'); };
    const r = await synchroniser(options(await depot(), faux({ rafraichir, lister })));
    expect(r.jeton).toEqual({ ok: false, alerte: true, erreur: 'expired / invalid token' });
    expect(r.actus).toEqual([]);
  });

  test('jeton valide mais API en panne : le run échoue', async () => {
    const lister: Clients['listerPublications'] = async () => { throw new Error('HTTP 500'); };
    await expect(synchroniser(options(await depot(), faux({ lister })))).rejects.toThrow('HTTP 500');
  });
});

describe('corpsPR', () => {
  const rapport: RapportSync = {
    jeton: { ok: true, alerte: true, joursRestants: 9, identique: false },
    actus: [{ slug: 's', titre: 'Titre | avec barre', categorie: 'loisir', date: '2026-09-14', instagram: 'https://www.instagram.com/p/A/' }],
    ignorees: [{ code: 'B', date: '2026-09-15', raison: 'repost', instagram: 'https://www.instagram.com/p/B/' }],
    reportees: [{ instagram: 'https://www.instagram.com/p/C/', raison: 'Réponse de l\'IA illisible' }],
  };
  const corps = corpsPR(rapport);

  test('rappelle de relire avant de fusionner', () => {
    expect(corps).toContain('la fusion met le site en ligne');
  });
  test('tableau des actus avec libellé de catégorie et barre échappée', () => {
    expect(corps).toContain('| 2026-09-14 | Titre \\| avec barre | Loisir & randonnées | [voir](https://www.instagram.com/p/A/) |');
  });
  test('liste les ignorées, les reportées et l\'alerte du jeton', () => {
    expect(corps).toContain('[publication](https://www.instagram.com/p/B/) : repost');
    expect(corps).toContain('instagram-ignores.json');
    expect(corps).toContain('[publication](https://www.instagram.com/p/C/) : Réponse de l\'IA illisible');
    expect(corps).toContain('expire dans 9 jours');
  });
  test('sections vides signalées', () => {
    const vide = corpsPR({ jeton: { ok: true, alerte: false }, actus: [], ignorees: [], reportees: [] });
    expect(vide).toContain('Aucune.');
    expect(vide).not.toContain('expire dans');
  });
});
```

- [ ] **Step 3: Vérifier qu'ils échouent**

Run: `npx vitest run tests/instagram-sync/sync.test.ts`
Expected: FAIL — module `sync.ts` introuvable.

- [ ] **Step 4: Implémenter**

`scripts/instagram-sync/sync.ts` :

```ts
// Orchestration d'un run de synchro : lit le dépôt, interroge Instagram et
// l'IA via les clients injectés, écrit les actus, les photos et les ignorées,
// et rend un rapport (lu par le workflow pour la PR et l'issue d'alerte).
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LIBELLES_CATEGORIE_ACTU, type CategorieActu } from "../../src/lib/categories-actus.ts";
import type { Clients } from "./clients.ts";
import { construireMessages, lireDecision, type ExempleActu } from "./ia.ts";
import { cheminPhoto, mediasDe, rendreMarkdown, retirerHashtagsFinaux, slugLibre } from "./redaction.ts";
import { codeDepuisPermalien, codesDejaImportes, dateParis, selectionnerNouvelles } from "./selection.ts";

export interface OptionsSync {
  racine: string;
  depuis: string;
  modele: string;
  jeton: string;
  clients: Clients;
  ecrire: boolean;
  pauseMs?: number;
  seuilAlerteJours?: number;
}

export interface IgnoreeInstagram {
  code: string;
  date: string;
  raison: string;
}

export interface RapportSync {
  jeton: { ok: boolean; alerte: boolean; joursRestants?: number; identique?: boolean; erreur?: string };
  actus: { slug: string; titre: string; categorie: CategorieActu; date: string; instagram: string }[];
  ignorees: (IgnoreeInstagram & { instagram: string })[];
  reportees: { instagram: string; raison: string }[];
}

const DOSSIER_ACTUS = "src/content/actualites";
export const FICHIER_IGNORES = "src/content/site/instagram-ignores.json";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function lireActus(racine: string): Promise<{ slugs: Set<string>; markdowns: string[] }> {
  const dossier = path.join(racine, DOSSIER_ACTUS);
  const fichiers = (await readdir(dossier)).filter((f) => f.endsWith(".md")).sort();
  const markdowns = await Promise.all(fichiers.map((f) => readFile(path.join(dossier, f), "utf8")));
  return { slugs: new Set(fichiers.map((f) => f.slice(0, -3))), markdowns };
}

async function lireIgnores(racine: string): Promise<IgnoreeInstagram[]> {
  try {
    const contenu = JSON.parse(await readFile(path.join(racine, FICHIER_IGNORES), "utf8"));
    return Array.isArray(contenu.ignores) ? contenu.ignores : [];
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") return [];
    throw e;
  }
}

// Quelques titres/résumés réels pour donner le ton à l'IA.
function exemplesDepuis(markdowns: string[]): ExempleActu[] {
  const exemples: ExempleActu[] = [];
  for (const md of markdowns) {
    const titre = md.match(/^titre:\s*"(.*)"\s*$/m)?.[1];
    const resume = md.match(/^resume:\s*"(.*)"\s*$/m)?.[1];
    if (titre && resume) exemples.push({ titre, resume });
  }
  return exemples.slice(-5);
}

export async function synchroniser(o: OptionsSync): Promise<RapportSync> {
  const seuil = o.seuilAlerteJours ?? 15;
  const rapport: RapportSync = { jeton: { ok: false, alerte: true }, actus: [], ignorees: [], reportees: [] };

  // 1. Jeton. Instagram refuse le rafraîchissement d'un jeton de moins de
  // 24 h : on ne conclut à un jeton invalide que si la lecture échoue aussi.
  let erreurRafraichissement: string | undefined;
  try {
    const r = await o.clients.rafraichirJeton(o.jeton);
    const joursRestants = Math.floor(r.expireDansSecondes / 86400);
    rapport.jeton = { ok: true, alerte: joursRestants < seuil, joursRestants, identique: r.jeton === o.jeton };
  } catch (e) {
    erreurRafraichissement = message(e);
    rapport.jeton = { ok: true, alerte: false, erreur: erreurRafraichissement };
  }

  // 2. Lecture.
  let pubs;
  try {
    pubs = await o.clients.listerPublications(o.jeton, o.depuis);
  } catch (e) {
    if (erreurRafraichissement === undefined) throw e;
    rapport.jeton = { ok: false, alerte: true, erreur: `${erreurRafraichissement} / ${message(e)}` };
    return rapport;
  }

  // 3. Sélection.
  const actus = await lireActus(o.racine);
  const ignores = await lireIgnores(o.racine);
  const codesConnus = codesDejaImportes(actus.markdowns);
  for (const i of ignores) codesConnus.add(i.code);
  const nouvelles = selectionnerNouvelles(pubs, { depuis: o.depuis, codesConnus });
  const exemples = exemplesDepuis(actus.markdowns);
  const slugs = new Set(actus.slugs);

  for (const [n, pub] of nouvelles.entries()) {
    if (n > 0 && o.pauseMs) await new Promise((r) => setTimeout(r, o.pauseMs));
    const code = codeDepuisPermalien(pub.permalink) as string; // garanti par selectionnerNouvelles
    const date = dateParis(pub.timestamp);
    const legende = retirerHashtagsFinaux(pub.caption ?? "");

    // 4. Classement IA.
    let decision;
    try {
      const texte = await o.clients.demanderIA(construireMessages({ legende, type: pub.media_type, date }, exemples), o.modele);
      decision = lireDecision(texte);
    } catch (e) {
      rapport.reportees.push({ instagram: pub.permalink, raison: `IA indisponible : ${message(e)}` });
      continue;
    }
    if (!decision) {
      rapport.reportees.push({ instagram: pub.permalink, raison: "Réponse de l'IA illisible" });
      continue;
    }
    if (!decision.garder) {
      const ignoree = { code, date, raison: decision.raison };
      ignores.push(ignoree);
      rapport.ignorees.push({ ...ignoree, instagram: pub.permalink });
      continue;
    }

    // 5. Photos, toutes téléchargées en mémoire avant d'écrire quoi que ce
    // soit : jamais d'actu ni de dossier partiels.
    const { sources, aUneVideo } = mediasDe(pub);
    if (sources.length === 0) {
      rapport.reportees.push({ instagram: pub.permalink, raison: "Aucune image exploitable" });
      continue;
    }
    const slug = slugLibre(decision.titre, date, slugs);
    const fichiers: { chemin: string; octets: Uint8Array }[] = [];
    try {
      for (const [i, url] of sources.entries()) {
        const { octets, extension } = await o.clients.telecharger(url);
        fichiers.push({ chemin: cheminPhoto(slug, i, extension), octets });
      }
    } catch (e) {
      rapport.reportees.push({ instagram: pub.permalink, raison: `Téléchargement impossible : ${message(e)}` });
      continue;
    }

    slugs.add(slug);
    const markdown = rendreMarkdown({
      slug,
      titre: decision.titre,
      date,
      categorie: decision.categorie,
      resume: decision.resume,
      photos: fichiers.map((f) => f.chemin),
      video: aUneVideo ? pub.permalink : undefined,
      instagram: pub.permalink,
      corps: legende,
    });
    if (o.ecrire) {
      await mkdir(path.join(o.racine, "public/medias/actus", slug), { recursive: true });
      for (const f of fichiers) await writeFile(path.join(o.racine, "public", f.chemin), f.octets);
      await writeFile(path.join(o.racine, DOSSIER_ACTUS, `${slug}.md`), markdown);
    }
    rapport.actus.push({ slug, titre: decision.titre, categorie: decision.categorie, date, instagram: pub.permalink });
  }

  if (o.ecrire && rapport.ignorees.length > 0) {
    await writeFile(path.join(o.racine, FICHIER_IGNORES), `${JSON.stringify({ ignores }, null, 2)}\n`);
  }
  return rapport;
}

const cellule = (s: string) => s.replace(/\|/g, "\\|");

export function corpsPR(r: RapportSync): string {
  const l = [
    "Publications Instagram synchronisées automatiquement.",
    "",
    "**Relire les titres, résumés et catégories proposés par l'IA (et corriger directement dans cette PR si besoin) : la fusion met le site en ligne.**",
    "",
  ];
  if (r.jeton.ok && r.jeton.alerte) {
    l.push(`> ⚠️ Le jeton Instagram expire dans ${r.jeton.joursRestants} jours : voir l'issue « Jeton Instagram à renouveler ».`, "");
  }
  l.push(`### Actualités proposées (${r.actus.length})`, "");
  if (r.actus.length > 0) {
    l.push("| Date | Titre | Catégorie | Instagram |", "| --- | --- | --- | --- |");
    for (const a of r.actus) {
      l.push(`| ${a.date} | ${cellule(a.titre)} | ${LIBELLES_CATEGORIE_ACTU[a.categorie]} | [voir](${a.instagram}) |`);
    }
  } else {
    l.push("Aucune.");
  }
  l.push("", `### Publications ignorées (${r.ignorees.length})`, "");
  if (r.ignorees.length > 0) {
    for (const i of r.ignorees) l.push(`- ${i.date} — [publication](${i.instagram}) : ${i.raison}`);
    l.push("", "Pour en reproposer une : retirer sa ligne de `src/content/site/instagram-ignores.json` (dans cette PR ou après fusion).");
  } else {
    l.push("Aucune.");
  }
  if (r.reportees.length > 0) {
    l.push("", `### Publications reportées (${r.reportees.length})`, "", "Retentées au prochain passage :", "");
    for (const x of r.reportees) l.push(`- [publication](${x.instagram}) : ${x.raison}`);
  }
  return `${l.join("\n")}\n`;
}
```

- [ ] **Step 5: Vérifier**

Run: `npx vitest run tests/instagram-sync/`
Expected: PASS (tous les fichiers de la synchro, dont 18 tests dans `sync.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add scripts/instagram-sync/clients.ts scripts/instagram-sync/sync.ts tests/instagram-sync/sync.test.ts
git commit -m "Orchestre un passage de la synchro Instagram"
```

---

### Task 7: Clients réseau, point d'entrée et essai à blanc

**Files:**
- Modify: `scripts/instagram-sync/clients.ts` (ajout de `clientsReels`)
- Create: `scripts/instagram-sync/main.ts`
- Modify: `package.json` (script `instagram:sync`)

**Interfaces:**
- Consumes: `Clients` (tâche 6), `synchroniser`, `corpsPR`, `RapportSync` (tâche 6), `dateParis` (tâche 2).
- Produces:
  - `clientsReels(githubToken: string): Clients`
  - CLI `node scripts/instagram-sync/main.ts [--dry-run] [--rapport <fichier.json>] [--corps-pr <fichier.md>]` ; variables `INSTAGRAM_TOKEN` (requis), `GITHUB_TOKEN` (requis), `INSTAGRAM_SYNC_DEPUIS` (défaut `2026-07-10`), `INSTAGRAM_SYNC_MODELE` (défaut `openai/gpt-4.1-mini`) ; lit `.env` s'il existe sans écraser l'environnement. Code de sortie 1 si le jeton est invalide (rapport écrit quand même) ou en cas d'erreur.

Cette tâche n'a pas de test automatisé : `clients.ts` est le seul code réseau, volontairement isolé ; il est vérifié par l'essai à blanc réel du Step 4.

- [ ] **Step 1: Implémenter les clients réels**

Ajouter à la fin de `scripts/instagram-sync/clients.ts`, et ajouter `import { dateParis } from "./selection.ts";` aux imports :

```ts
const API_INSTAGRAM = "https://graph.instagram.com";
const VERSION_INSTAGRAM = process.env.INSTAGRAM_API_VERSION || "v23.0";
const CHAMPS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";
const URL_MODELS = "https://models.github.ai/inference/chat/completions";

// Réponse JSON ou erreur explicite (sans jamais reprendre l'URL, qui contient
// le jeton).
async function lireJson(res: Response, contexte: string): Promise<any> {
  const texte = await res.text();
  let corps: any;
  try {
    corps = JSON.parse(texte);
  } catch {
    corps = undefined;
  }
  if (!res.ok || corps === undefined || corps.error) {
    const detail = corps?.error?.message ?? texte.slice(0, 300);
    throw new Error(`${contexte} : HTTP ${res.status} — ${detail}`);
  }
  return corps;
}

export function clientsReels(githubToken: string): Clients {
  return {
    async rafraichirJeton(jeton) {
      const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: jeton });
      const r = await lireJson(await fetch(`${API_INSTAGRAM}/refresh_access_token?${params}`), "Rafraîchissement du jeton Instagram");
      return { jeton: String(r.access_token), expireDansSecondes: Number(r.expires_in) };
    },

    // L'API renvoie les publications de la plus récente à la plus ancienne :
    // on arrête de paginer dès qu'une page atteint la date de départ.
    async listerPublications(jeton, depuis) {
      const pubs: PublicationInstagram[] = [];
      const params = new URLSearchParams({ fields: CHAMPS, limit: "50", access_token: jeton });
      let url: string | undefined = `${API_INSTAGRAM}/${VERSION_INSTAGRAM}/me/media?${params}`;
      while (url) {
        const page = await lireJson(await fetch(url), "Lecture des publications Instagram");
        const data: PublicationInstagram[] = page.data ?? [];
        pubs.push(...data);
        const plusAncienne = data[data.length - 1];
        if (!plusAncienne || dateParis(plusAncienne.timestamp) < depuis) break;
        url = page.paging?.next;
      }
      return pubs;
    },

    async demanderIA(messages, modele) {
      const res = await fetch(URL_MODELS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ model: modele, messages, temperature: 0.2, response_format: { type: "json_object" } }),
      });
      const r = await lireJson(res, "GitHub Models");
      const contenu = r.choices?.[0]?.message?.content;
      if (typeof contenu !== "string") throw new Error("GitHub Models : réponse sans contenu");
      return contenu;
    },

    async telecharger(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      return { octets: new Uint8Array(await res.arrayBuffer()), extension };
    },
  };
}
```

- [ ] **Step 2: Écrire le point d'entrée**

`scripts/instagram-sync/main.ts` :

```ts
// Synchro Instagram → actualités du site (lancée chaque semaine par
// .github/workflows/instagram-sync.yml).
//
//   node scripts/instagram-sync/main.ts [--dry-run] [--rapport r.json] [--corps-pr pr.md]
//
// Variables (environnement ou .env, jamais committé) :
//   INSTAGRAM_TOKEN        jeton Instagram longue durée (voir docs/INSTAGRAM-SETUP.md)
//   GITHUB_TOKEN           jeton GitHub ayant accès à GitHub Models
//   INSTAGRAM_SYNC_DEPUIS  date de départ AAAA-MM-JJ (défaut 2026-07-10)
//   INSTAGRAM_SYNC_MODELE  modèle GitHub Models (défaut openai/gpt-4.1-mini)
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { clientsReels } from "./clients.ts";
import { corpsPR, synchroniser } from "./sync.ts";

// .env minimal (même règle que instagram-token.mjs) : ne surcharge jamais
// l'environnement réel.
try {
  for (const ligne of (await readFile(".env", "utf8")).split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const valeur = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!(m[1] in process.env)) process.env[m[1]] = valeur;
  }
} catch {
  // Pas de .env : cas de la CI.
}

function requis(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) {
    console.error(`[instagram-sync] ${nom} manquant (environnement ou .env).`);
    process.exit(1);
  }
  return valeur;
}

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    rapport: { type: "string" },
    "corps-pr": { type: "string" },
  },
});

const depuis = process.env.INSTAGRAM_SYNC_DEPUIS || "2026-07-10";
if (!/^\d{4}-\d{2}-\d{2}$/.test(depuis)) {
  console.error(`[instagram-sync] INSTAGRAM_SYNC_DEPUIS invalide : ${depuis} (attendu AAAA-MM-JJ).`);
  process.exit(1);
}
const essai = values["dry-run"] ?? false;

const rapport = await synchroniser({
  racine: process.cwd(),
  depuis,
  modele: process.env.INSTAGRAM_SYNC_MODELE || "openai/gpt-4.1-mini",
  jeton: requis("INSTAGRAM_TOKEN"),
  clients: clientsReels(requis("GITHUB_TOKEN")),
  ecrire: !essai,
  pauseMs: 4000, // reste sous la limite par minute de l'offre gratuite de GitHub Models
});

if (values.rapport) await writeFile(values.rapport, `${JSON.stringify(rapport, null, 2)}\n`);
if (values["corps-pr"]) await writeFile(values["corps-pr"], corpsPR(rapport));

const j = rapport.jeton;
if (!j.ok) {
  console.error(`[instagram-sync] jeton Instagram refusé : ${j.erreur}`);
  process.exit(1);
}
console.log(
  j.joursRestants === undefined
    ? `[instagram-sync] jeton non rafraîchi (${j.erreur}), lecture possible.`
    : `[instagram-sync] jeton valide ${j.joursRestants} jours, rafraîchissement ${j.identique ? "sans changement de jeton" : "avec un NOUVEAU jeton (à reporter dans les secrets)"}.`,
);
console.log(`[instagram-sync] ${essai ? "essai à blanc — rien n'est écrit." : "fichiers écrits."}`);
for (const a of rapport.actus) console.log(`  + ${a.date} ${a.titre} [${a.categorie}] → ${a.slug}`);
for (const i of rapport.ignorees) console.log(`  - ${i.date} ignorée : ${i.raison} (${i.instagram})`);
for (const x of rapport.reportees) console.log(`  ~ reportée : ${x.raison} (${x.instagram})`);
if (rapport.actus.length + rapport.ignorees.length + rapport.reportees.length === 0) {
  console.log("  aucune nouvelle publication.");
}
```

Dans `package.json`, `scripts`, après `"instagram:token"` :

```json
    "instagram:token": "node scripts/instagram-token.mjs",
    "instagram:sync": "node scripts/instagram-sync/main.ts"
```

- [ ] **Step 3: Vérifier le typage et les tests**

Run: `npx astro check 2>&1 | tail -5 && npx vitest run`
Expected: `astro check` sans erreur dans `scripts/instagram-sync/` (les `any` explicites de `lireJson` sont autorisés) ; tous les tests PASS.

Run: `node scripts/instagram-sync/main.ts --dry-run; echo "code=$?"` **sans** variables Instagram dans l'environnement ni `.env`
Expected: `[instagram-sync] INSTAGRAM_TOKEN manquant (environnement ou .env).` et `code=1` (prouve que Node 24 exécute le TypeScript directement).

- [ ] **Step 4: Essai à blanc réel (avec le propriétaire du dépôt)**

Prérequis : `.env` contient un `INSTAGRAM_TOKEN` valide (voir `docs/INSTAGRAM-SETUP.md`). Demander au propriétaire de lancer, ou lancer avec son accord :

```bash
GITHUB_TOKEN=$(gh auth token) npm run instagram:sync -- --dry-run --corps-pr /tmp/pr.md
```

Expected : une ligne `jeton valide N jours…` indiquant si le jeton rafraîchi est identique (noter la réponse : elle tranche le point « À vérifier » de la spec), puis la liste des publications depuis le 2026-07-10 avec la décision de l'IA, et `git status --short` inchangé. Relire `/tmp/pr.md`. Si GitHub Models refuse le jeton `gh` (HTTP 401/403), créer un jeton fine-grained personnel avec la permission « Models : lecture » et le passer en `GITHUB_TOKEN`.

- [ ] **Step 5: Commit**

```bash
git add scripts/instagram-sync/clients.ts scripts/instagram-sync/main.ts package.json
git commit -m "Branche la synchro Instagram sur l'API et GitHub Models"
```

---

### Task 8: Workflow hebdomadaire et documentation

**Files:**
- Create: `.github/workflows/instagram-sync.yml`
- Modify: `docs/INSTAGRAM-SETUP.md` (section 6 et nouvelle section)
- Modify: `docs/superpowers/specs/2026-10-01-instagram-sync-design.md` (étape 6 du déroulé)

**Interfaces:**
- Consumes: CLI de la tâche 7 (`--rapport`, `--corps-pr`, code de sortie), forme JSON de `RapportSync` (`.jeton.ok`, `.jeton.alerte`, `.jeton.joursRestants`, `.jeton.erreur`), fichier `src/content/site/instagram-ignores.json` (tâche 1).
- Produces: workflow « Synchro Instagram ».

- [ ] **Step 1: Écrire le workflow**

`.github/workflows/instagram-sync.yml` :

```yaml
name: Synchro Instagram

# Chaque lundi, propose en PR les nouvelles publications Instagram du club sous
# forme d'actualités. Voir docs/INSTAGRAM-SETUP.md (« Synchro hebdomadaire »).
on:
  schedule:
    - cron: "0 4 * * 1" # lundi 4 h UTC : 6 h à Paris en été, 5 h en hiver
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  issues: write
  models: read

concurrency:
  group: instagram-sync
  cancel-in-progress: false

env:
  INSTAGRAM_SYNC_DEPUIS: "2026-07-10"
  INSTAGRAM_SYNC_MODELE: "openai/gpt-4.1-mini"
  BRANCHE: sync/instagram

jobs:
  sync:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Si une PR de synchro est déjà ouverte, on repart de sa branche pour
      # garder les corrections faites à la main, en y fusionnant main.
      - name: Choisir la branche
        id: base
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          pr=$(gh pr list --head "$BRANCHE" --state open --json number --jq '.[0].number // ""')
          echo "pr=$pr" >> "$GITHUB_OUTPUT"
          if [ -n "$pr" ]; then
            git switch "$BRANCHE"
            git merge --no-edit origin/main
          else
            git switch -C "$BRANCHE"
          fi

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Synchroniser
        env:
          INSTAGRAM_TOKEN: ${{ secrets.INSTAGRAM_TOKEN }}
          GITHUB_TOKEN: ${{ github.token }}
        run: node scripts/instagram-sync/main.ts --rapport "$RUNNER_TEMP/rapport.json" --corps-pr "$RUNNER_TEMP/pr.md"

      - name: Alerter si le jeton Instagram faiblit
        if: always()
        run: |
          f="$RUNNER_TEMP/rapport.json"
          [ -f "$f" ] || exit 0
          [ "$(jq -r '.jeton.alerte' "$f")" = "true" ] || exit 0
          ok=$(jq -r '.jeton.ok' "$f")
          if [ "$ok" = "true" ]; then
            msg="Le jeton Instagram expire dans $(jq -r '.jeton.joursRestants' "$f") jours."
          else
            msg="Le jeton Instagram est refusé : $(jq -r '.jeton.erreur' "$f")"
          fi
          body=$(printf '%s\n\nRenouveler le jeton : voir docs/INSTAGRAM-SETUP.md, section « Synchro hebdomadaire ».\n\nRun : %s' \
            "$msg" "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID")
          gh label create instagram-jeton --color B60205 --description "Jeton Instagram à renouveler" --force
          issue=$(gh issue list --label instagram-jeton --state open --json number --jq '.[0].number // ""')
          if [ -z "$issue" ]; then
            gh issue create --title "Jeton Instagram à renouveler" --label instagram-jeton --body "$body"
          elif [ "$ok" != "true" ]; then
            gh issue comment "$issue" --body "$body"
          fi

      - name: Ouvrir ou compléter la PR
        run: |
          git add src/content/actualites public/medias/actus src/content/site/instagram-ignores.json
          if git diff --cached --quiet; then
            echo "Aucune nouveauté."
            exit 0
          fi
          git commit -m "Synchro Instagram du $(date -u +%F)"
          pr="${{ steps.base.outputs.pr }}"
          if [ -n "$pr" ]; then
            git push origin "$BRANCHE"
            gh pr comment "$pr" --body-file "$RUNNER_TEMP/pr.md"
          else
            git push --force origin "$BRANCHE"
            gh pr create --base main --head "$BRANCHE" \
              --title "Synchro Instagram : nouvelles actualités" --body-file "$RUNNER_TEMP/pr.md"
          fi
```

Notes : `git add` sur `public/medias/actus` ne lève pas d'erreur tant que le dossier existe (il existe dans le dépôt) ; le push forcé ne sert que lorsqu'aucune PR n'est ouverte (branche d'une ancienne PR fermée sans fusion) ; quand une PR est ouverte, le rapport de la semaine est ajouté en commentaire, la description d'origine reste.

- [ ] **Step 2: Vérifier la syntaxe**

Run: `ruby -ryaml -e 'YAML.load_file(".github/workflows/instagram-sync.yml"); puts "ok"'`
Expected: `ok`. Si `actionlint` est installé (`command -v actionlint`), lancer aussi `actionlint .github/workflows/instagram-sync.yml` : aucune erreur attendue.

- [ ] **Step 3: Documenter**

Dans `docs/INSTAGRAM-SETUP.md`, section « 6. Entretenir le jeton », remplacer le dernier paragraphe :

```md
Cette automatisation n'est pas encore en place — voir la suite du chantier
« sync Instagram ».
```

par :

```md
La synchro hebdomadaire (ci-dessous) tente ce rafraîchissement à chaque
passage et ouvre une issue « Jeton Instagram à renouveler » quand il reste
moins de 15 jours ou que le jeton est refusé.
```

Puis ajouter, avant la section « Révocation » :

~~~md
## 7. Synchro hebdomadaire

Le workflow `.github/workflows/instagram-sync.yml` tourne chaque lundi matin
(et à la demande : onglet `Actions` → `Synchro Instagram` → `Run workflow`).
Il lit les publications depuis le 10 juillet 2026, demande à GitHub Models de
trier et titrer chacune, puis ouvre une PR `sync/instagram` avec les nouvelles
actualités. **Rien n'est publié tant que la PR n'est pas fusionnée.**

### Mise en place (une fois)

1. Dépôt → `Settings` → `Secrets and variables` → `Actions` →
   `New repository secret` : `INSTAGRAM_TOKEN` = le jeton de l'étape 5.
2. Dépôt → `Settings` → `Actions` → `General` → cocher
   **« Allow GitHub Actions to create and approve pull requests »**.
3. Lancer le workflow à la main une première fois et vérifier la PR.

### Relire la PR

- Corriger titre, résumé ou catégorie directement dans les fichiers de la PR :
  la semaine suivante, la synchro repart de cette branche et garde les
  corrections.
- Une publication ignorée par erreur : retirer sa ligne de
  `src/content/site/instagram-ignores.json`, elle sera reproposée au passage
  suivant.
- Fermer la PR sans la fusionner : tout sera reproposé la semaine suivante.

### Issue « Jeton Instagram à renouveler »

1. En local : `npm run instagram:token refresh` (si le jeton n'a pas expiré),
   sinon refaire l'étape 5 avec le gestionnaire du compte.
2. Remplacer le secret `INSTAGRAM_TOKEN` du dépôt par le nouveau jeton.
3. Relancer le workflow à la main, puis fermer l'issue.

### Essai en local

```sh
GITHUB_TOKEN=$(gh auth token) npm run instagram:sync -- --dry-run
```

Affiche ce que la synchro proposerait, sans rien écrire (Node 24 requis).
~~~

Dans `docs/superpowers/specs/2026-10-01-instagram-sync-design.md`, remplacer l'étape 6 du déroulé :

```md
6. **PR.** Si des fichiers ont changé : commit sur `sync/instagram` (branche
   recréée depuis `main` à chaque run, push forcé), puis `gh pr create` ou mise
   à jour du corps de la PR ouverte. Rien de changé → fin du run, sans PR.
```

par :

```md
6. **PR.** Si une PR `sync/instagram` est ouverte, le run repart de sa branche
   (en y fusionnant `main`) pour conserver les corrections faites à la main, et
   ajoute le rapport de la semaine en commentaire. Sinon, la branche est
   recréée depuis `main` (push forcé) et une PR est ouverte. Rien de changé →
   fin du run, sans PR.
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/instagram-sync.yml docs/INSTAGRAM-SETUP.md docs/superpowers/specs/2026-10-01-instagram-sync-design.md
git commit -m "Planifie la synchro Instagram chaque semaine"
```

- [ ] **Step 5: Vérification de bout en bout (après fusion sur main, avec le propriétaire du dépôt)**

Le déclencheur manuel n'existe qu'une fois le workflow sur la branche par défaut. Après push :

1. Le propriétaire crée le secret `INSTAGRAM_TOKEN` et coche le réglage « Allow GitHub Actions to create and approve pull requests ».
2. `gh workflow run "Synchro Instagram"` puis `gh run watch` : le run doit passer.
3. Une PR « Synchro Instagram : nouvelles actualités » est ouverte (ou le log affiche « Aucune nouveauté. »). Vérifier la preview Netlify d'une actu proposée.
4. **Review Focus 1** : modifier un titre directement dans la PR (commit sur `sync/instagram`), relancer `gh workflow run "Synchro Instagram"` : la correction doit être conservée et un commentaire de rapport ajouté à la PR.
```
