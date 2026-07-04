# Fondations + Page d'accueil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un site Astro déployable sur Netlify avec une page d'accueil complète (hero photo parallax + 8 sections), le design system CNF, et un modèle de contenu prêt pour le CMS.

**Architecture:** Site statique Astro 5. Le contenu éditorial (chiffres clés, infos pratiques, événements, actualités, partenaires) vit dans des **Content Collections** (fichiers Markdown/JSON sous `src/content/`), lus de façon typée via l'API `astro:content`. Ces mêmes fichiers seront édités par le CMS Sveltia au Plan 3. La page d'accueil assemble des composants `.astro` autonomes, un par section. Déploiement continu via `git push` → Netlify.

**Tech Stack:** Astro 5, TypeScript, Vitest + `experimental_AstroContainer` (tests de rendu de composants), Zod (schémas de contenu via `astro:content`), CSS natif (design tokens + scroll-driven animations), Netlify.

## Global Constraints

- **Langue du contenu et de l'UI : français.** Tout texte visible est en français.
- **Node : ≥ 20.** (requis par Astro 5)
- **Package manager : npm** (lockfile `package-lock.json` committé).
- **Astro output : `static`** (pas de SSR pour cette v1).
- **Couleurs de marque (design tokens, valeurs exactes) :** rouge principal `#c0392b`, rouge sombre `#8a0c0c`, rouge vif `#b01010`, texte `#2a0505`, fond clair `#f7f4f2`, blanc `#ffffff`.
- **Slogan officiel :** « L'aviron aux portes de Paris ».
- **Identité :** Cercle Nautique de France · fondé en 1875 · 150 ans en 2025 · Neuilly-sur-Seine · affilié FFA.
- **Rubriques de navigation (ordre exact) :** Le club, Pratiquer, Infos pratiques, Actualités, Galerie, + CTA « Nous rejoindre ». (Les pages cibles arrivent au Plan 2 ; en v1 les liens pointent vers des ancres `#` ou `/#section`.)
- **Chaque tâche se termine par un commit.** Messages de commit en français, format `type: description`.
- **Aucun secret dans le repo.**

---

## File Structure

```
cnfrance-2/
  package.json                     # deps + scripts
  package-lock.json
  astro.config.mjs                 # config Astro (output static, site url)
  tsconfig.json                    # extends astro/tsconfigs/strict
  vitest.config.ts                 # config test via getViteConfig
  netlify.toml                     # build command + publish dir
  .gitignore
  src/
    content.config.ts              # schémas des Content Collections (Zod)
    styles/
      tokens.css                   # design tokens (couleurs, typo, espacements)
      global.css                   # reset + base + import tokens
    layouts/
      BaseLayout.astro             # <html>, <head>, slots header/footer
    components/
      Nav.astro                    # barre de navigation + CTA
      Footer.astro                 # pied de page (contact, réseaux, légal)
      Hero.astro                   # section 1 — hero photo parallax (direction A)
      SectionChiffres.astro        # section 2 — accroche + chiffres clés
      SectionDisciplines.astro     # section 3 — cartes disciplines
      SectionEvenements.astro      # section 4 — événements à venir
      SectionActus.astro           # section 5 — 3 dernières actus
      SectionGalerie.astro         # section 6 — mosaïque photos
      SectionInfosPratiques.astro  # section 7 — infos + « Nous rejoindre »
      SectionPartenaires.astro     # section 8 — logos partenaires
    content/
      site/
        reglages.json              # chiffres clés + infos pratiques + accroche (1 entrée)
      evenements/
        41e-defi-cnf.md
      actualites/
        randonnee-cote-bleue.md
      partenaires/
        partenaires.json           # liste de partenaires (loader file)
    pages/
      index.astro                  # assemble hero + 8 sections
    assets/
      hero/                         # photos hero (placeholders au départ)
  public/
    favicon.svg
  tests/
    content-schemas.test.ts        # valide les schémas Zod
    components/
      Nav.test.ts
      Footer.test.ts
      Hero.test.ts
      SectionChiffres.test.ts
      SectionDisciplines.test.ts
      SectionEvenements.test.ts
      SectionActus.test.ts
      SectionPartenaires.test.ts
    pages/
      index.test.ts
```

---

### Task 1 : Scaffold du projet Astro + pipeline Netlify

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `netlify.toml`, `.gitignore`
- Create: `src/pages/index.astro` (placeholder), `public/favicon.svg`

**Interfaces:**
- Consumes: rien.
- Produces: un projet Astro qui build (`npm run build`) et une commande de test (`npm test`) exécutable. Scripts npm : `dev`, `build`, `preview`, `test`, `check`.

- [ ] **Step 1 : Initialiser git et le package.json**

Run:
```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git init
```

Create `package.json`:
```json
{
  "name": "cnfrance",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2 : Installer les dépendances**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm install`
Expected: `package-lock.json` créé, dossier `node_modules/` présent, aucune erreur.

- [ ] **Step 3 : Créer les fichiers de config**

Create `astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.cnfrance.fr',
  output: 'static',
});
```

Create `tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

Create `.gitignore`:
```
node_modules/
dist/
.astro/
.DS_Store
*.log
.env
.env.*
```

- [ ] **Step 4 : Créer une page d'accueil placeholder + favicon**

Create `src/pages/index.astro`:
```astro
---
---
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cercle Nautique de France</title>
  </head>
  <body>
    <main>
      <h1>Cercle Nautique de France</h1>
      <p>L'aviron aux portes de Paris</p>
    </main>
  </body>
</html>
```

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#c0392b"/><text x="16" y="21" font-family="sans-serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">CNF</text></svg>
```

- [ ] **Step 5 : Vérifier le build**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm run build`
Expected: build réussi, `dist/index.html` généré contenant « L'aviron aux portes de Paris ».

- [ ] **Step 6 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "chore: scaffold Astro + config Netlify"
```

---

### Task 2 : Test runner Vitest + Container API

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: le projet Astro de la Task 1.
- Produces: un harnais de test capable de rendre des composants `.astro` en chaîne HTML via `experimental_AstroContainer`. Toutes les tâches suivantes s'appuient dessus. Pattern de test réutilisé partout :
  ```ts
  import { experimental_AstroContainer as AstroContainer } from 'astro/container';
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component, { props: {...} });
  ```

- [ ] **Step 1 : Écrire le test smoke (échec attendu)**

Create `tests/smoke.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';

test('AstroContainer rend du HTML', async () => {
  const container = await AstroContainer.create();
  expect(container).toBeDefined();
  expect(typeof container.renderToString).toBe('function');
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test`
Expected: FAIL — pas de config Vitest / impossible de résoudre l'environnement Astro.

- [ ] **Step 3 : Créer la config Vitest**

Create `vitest.config.ts`:
```ts
/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test`
Expected: PASS (1 test).

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "test: config Vitest + Container API"
```

---

### Task 3 : Design system (tokens + global)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`

**Interfaces:**
- Consumes: rien.
- Produces: variables CSS globales utilisées par tous les composants. Noms de variables exacts (les tâches suivantes s'y réfèrent) :
  `--rouge`, `--rouge-sombre`, `--rouge-vif`, `--texte`, `--fond`, `--blanc`, `--gris-bord`, `--muted`, `--font-titre`, `--font-corps`, `--maxw`, `--radius`, `--space`.

- [ ] **Step 1 : Créer les tokens**

Create `src/styles/tokens.css`:
```css
:root {
  /* Couleurs de marque */
  --rouge: #c0392b;
  --rouge-sombre: #8a0c0c;
  --rouge-vif: #b01010;
  --texte: #2a0505;
  --fond: #f7f4f2;
  --blanc: #ffffff;
  --gris-bord: #e6dcd8;
  --muted: #6b5d5a;

  /* Typographie (polices système, aucune requête réseau) */
  --font-titre: "Oswald", "Arial Narrow", system-ui, sans-serif;
  --font-corps: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Layout */
  --maxw: 1180px;
  --radius: 12px;
  --space: 1.25rem;
}
```

- [ ] **Step 2 : Créer le global (reset + base)**

Create `src/styles/global.css`:
```css
@import "./tokens.css";

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-corps);
  color: var(--texte);
  background: var(--fond);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--font-titre); line-height: 1.1; font-weight: 700; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
.wrap { max-width: var(--maxw); margin-inline: auto; padding-inline: var(--space); }
.btn {
  display: inline-block; background: var(--rouge); color: var(--blanc);
  font-weight: 700; padding: 0.7em 1.3em; border-radius: 999px; transition: background .15s;
}
.btn:hover { background: var(--rouge-sombre); }
```

- [ ] **Step 3 : Vérifier que le build passe toujours**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm run build`
Expected: build réussi (les CSS ne sont pas encore importés, on vérifie juste l'absence d'erreur de syntaxe au prochain import).

- [ ] **Step 4 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: design system (tokens + global css)"
```

---

### Task 4 : Schémas de contenu (Content Collections)

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/site/reglages.json`, `src/content/evenements/41e-defi-cnf.md`, `src/content/actualites/randonnee-cote-bleue.md`, `src/content/partenaires/partenaires.json`
- Create: `tests/content-schemas.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: 4 collections typées, chargées via `getCollection` / `getEntry` dans les pages. Formes exactes (les composants des tâches 8-12 en dépendent) :
  - `reglages` (collection `file`, entrée id `"reglages"`) → `{ accroche: string, chiffres: {valeur: string, label: string}[], infos: {horaires: string, tarifs: string, adresse: string, email: string, telephone?: string} }`
  - `evenements` → `{ titre: string, date: Date, lieu?: string, description: string, image?: string }`
  - `actualites` → `{ titre: string, date: Date, resume: string, image?: string }` (+ corps Markdown)
  - `partenaires` (collection `file`) → `{ nom: string, url?: string, logo?: string }[]`
- Les schémas Zod sont **exportés nommément** (`reglagesSchema`, `evenementSchema`, `actualiteSchema`, `partenaireSchema`) pour être testés unitairement.

- [ ] **Step 1 : Écrire les tests de schéma (échec attendu)**

Create `tests/content-schemas.test.ts`:
```ts
import { expect, test, describe } from 'vitest';
import {
  reglagesSchema, evenementSchema, actualiteSchema, partenaireSchema,
} from '../src/content.config';

describe('reglagesSchema', () => {
  test('accepte des réglages valides', () => {
    const r = reglagesSchema.parse({
      accroche: 'Bienvenue au CNF',
      chiffres: [{ valeur: '1875', label: 'fondé en' }],
      infos: { horaires: '7j/7', tarifs: '300€/an', adresse: 'Neuilly', email: 'a@b.fr' },
    });
    expect(r.chiffres[0].valeur).toBe('1875');
  });
  test('rejette si email manquant', () => {
    expect(() => reglagesSchema.parse({
      accroche: 'x', chiffres: [], infos: { horaires: 'x', tarifs: 'x', adresse: 'x' },
    })).toThrow();
  });
});

describe('evenementSchema', () => {
  test('coerce une date string', () => {
    const e = evenementSchema.parse({ titre: 'Défi', date: '2026-06-14', description: 'x' });
    expect(e.date instanceof Date).toBe(true);
  });
  test('rejette sans titre', () => {
    expect(() => evenementSchema.parse({ date: '2026-06-14', description: 'x' })).toThrow();
  });
});

describe('actualiteSchema', () => {
  test('accepte une actu valide', () => {
    const a = actualiteSchema.parse({ titre: 'Rando', date: '2026-05-01', resume: 'court' });
    expect(a.titre).toBe('Rando');
  });
});

describe('partenaireSchema', () => {
  test('accepte un partenaire avec juste un nom', () => {
    expect(partenaireSchema.parse({ nom: 'FFA' }).nom).toBe('FFA');
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/content-schemas.test.ts`
Expected: FAIL — `src/content.config` n'exporte pas ces schémas (module introuvable).

- [ ] **Step 3 : Écrire la config de contenu**

Create `src/content.config.ts`:
```ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

export const reglagesSchema = z.object({
  accroche: z.string(),
  chiffres: z.array(z.object({ valeur: z.string(), label: z.string() })),
  infos: z.object({
    horaires: z.string(),
    tarifs: z.string(),
    adresse: z.string(),
    email: z.string(),
    telephone: z.string().optional(),
  }),
});

export const evenementSchema = z.object({
  titre: z.string(),
  date: z.coerce.date(),
  lieu: z.string().optional(),
  description: z.string(),
  image: z.string().optional(),
});

export const actualiteSchema = z.object({
  titre: z.string(),
  date: z.coerce.date(),
  resume: z.string(),
  image: z.string().optional(),
});

export const partenaireSchema = z.object({
  nom: z.string(),
  url: z.string().optional(),
  logo: z.string().optional(),
});

const reglages = defineCollection({
  loader: file('src/content/site/reglages.json'),
  schema: reglagesSchema,
});

const evenements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/evenements' }),
  schema: evenementSchema,
});

const actualites = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/actualites' }),
  schema: actualiteSchema,
});

const partenaires = defineCollection({
  loader: file('src/content/partenaires/partenaires.json'),
  schema: partenaireSchema,
});

export const collections = { reglages, evenements, actualites, partenaires };
```

> Note : le loader `file` sur `reglages.json` attend un **objet unique** → une seule entrée d'id `reglages`. Pour `partenaires.json`, le loader `file` sur un **tableau d'objets** exige que chaque objet ait un champ identifiant ; on utilise `nom` comme clé implicite via un tableau — voir le format ci-dessous.

- [ ] **Step 4 : Créer les fichiers de contenu (seed)**

Create `src/content/site/reglages.json`:
```json
{
  "accroche": "Depuis 1875, le Cercle Nautique de France fait ramer Paris sur la Seine. Compétition, loisir ou découverte : venez pousser sur les avirons dans un cadre de verdure aux portes de la capitale.",
  "chiffres": [
    { "valeur": "1875", "label": "fondé en" },
    { "valeur": "150 ans", "label": "en 2025" },
    { "valeur": "+300", "label": "adhérents" },
    { "valeur": "FFA", "label": "club affilié" }
  ],
  "infos": {
    "horaires": "Séances le midi, le soir et le week-end, toute l'année.",
    "tarifs": "À partir de 300 €/an. Tarifs réduits étudiants et jeunes.",
    "adresse": "Île de la Jatte, Neuilly-sur-Seine",
    "email": "contact@cnfrance.fr",
    "telephone": ""
  }
}
```

Create `src/content/evenements/41e-defi-cnf.md`:
```md
---
titre: "41ème Défi CNF"
date: 2026-06-14
lieu: "Île de la Jatte, Neuilly-sur-Seine"
description: "Notre régate annuelle ouverte à tous les équipages. Une journée de courses sur la Seine suivie d'un déjeuner convivial au club."
---

Le Défi CNF est le rendez-vous incontournable de la saison.
```

Create `src/content/actualites/randonnee-cote-bleue.md`:
```md
---
titre: "Randonnée de la Côte Bleue"
date: 2026-05-18
resume: "Retour en images sur notre randonnée aviron le long de la Côte Bleue, entre Marseille et Martigues."
---

Trois jours de navigation en yolette dans un décor méditerranéen exceptionnel.
```

Create `src/content/partenaires/partenaires.json`:
```json
[
  { "nom": "Fédération Française d'Aviron", "url": "https://www.ffaviron.fr" },
  { "nom": "Ville de Neuilly-sur-Seine", "url": "https://www.neuillysurseine.fr" },
  { "nom": "Ligue Île-de-France d'Aviron" },
  { "nom": "Mairie de Paris 1er" }
]
```

- [ ] **Step 5 : Lancer les tests + le build**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/content-schemas.test.ts && npm run build`
Expected: tests PASS, build réussi (les collections sont chargées sans erreur de schéma).

> Si le loader `file` sur le tableau de partenaires réclame un id explicite au build, ajouter `"id"` à chaque objet du JSON (`{"id":"ffa","nom":"..."}`) et laisser le schéma tel quel (l'id est géré par le loader, hors schéma).

- [ ] **Step 6 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: modèle de contenu (réglages, événements, actus, partenaires)"
```

---

### Task 5 : BaseLayout

**Files:**
- Create: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: `src/styles/global.css`.
- Produces: layout par défaut. Props : `{ title: string, description?: string }`. Expose des slots nommés `header` et `footer` + slot par défaut pour le `<main>`.

- [ ] **Step 1 : Créer le layout**

Create `src/layouts/BaseLayout.astro`:
```astro
---
import "../styles/global.css";
interface Props { title: string; description?: string; }
const { title, description = "Cercle Nautique de France — l'aviron aux portes de Paris. Club d'aviron à Neuilly-sur-Seine depuis 1875." } = Astro.props;
---
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
  </head>
  <body>
    <slot name="header" />
    <main>
      <slot />
    </main>
    <slot name="footer" />
  </body>
</html>
```

- [ ] **Step 2 : Vérifier le build**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm run build`
Expected: build réussi.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: BaseLayout avec meta SEO et slots"
```

---

### Task 6 : Nav

**Files:**
- Create: `src/components/Nav.astro`
- Create: `tests/components/Nav.test.ts`

**Interfaces:**
- Consumes: tokens CSS.
- Produces: `<Nav />` (aucune prop). Rend les 5 rubriques + le CTA « Nous rejoindre ».

- [ ] **Step 1 : Écrire le test (échec attendu)**

Create `tests/components/Nav.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Nav from '../../src/components/Nav.astro';

test('la nav rend les rubriques et le CTA', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Nav);
  for (const item of ['Le club', 'Pratiquer', 'Infos pratiques', 'Actualités', 'Galerie', 'Nous rejoindre']) {
    expect(html).toContain(item);
  }
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/Nav.test.ts`
Expected: FAIL — composant introuvable.

- [ ] **Step 3 : Créer le composant**

Create `src/components/Nav.astro`:
```astro
---
const liens = [
  { label: "Le club", href: "/#club" },
  { label: "Pratiquer", href: "/#disciplines" },
  { label: "Infos pratiques", href: "/#infos" },
  { label: "Actualités", href: "/#actus" },
  { label: "Galerie", href: "/#galerie" },
];
---
<header class="nav">
  <div class="wrap nav__inner">
    <a class="nav__brand" href="/">
      <span class="nav__logo">CNF</span>
      <span class="nav__name">Cercle Nautique de France</span>
    </a>
    <nav class="nav__links" aria-label="Navigation principale">
      {liens.map((l) => <a href={l.href}>{l.label}</a>)}
      <a class="btn nav__cta" href="/#infos">Nous rejoindre</a>
    </nav>
  </div>
</header>
<style>
  .nav { position: sticky; top: 0; z-index: 100; background: color-mix(in srgb, var(--blanc) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--gris-bord); }
  .nav__inner { display: flex; align-items: center; gap: 1.5rem; padding-block: 0.6rem; }
  .nav__brand { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; }
  .nav__logo { width: 34px; height: 34px; border-radius: 50%; background: var(--rouge); color: var(--blanc); display: grid; place-items: center; font-family: var(--font-titre); font-size: 0.8rem; }
  .nav__name { font-family: var(--font-titre); font-size: 0.95rem; }
  .nav__links { margin-left: auto; display: flex; align-items: center; gap: 1.1rem; font-weight: 600; font-size: 0.92rem; }
  .nav__links a:not(.btn):hover { color: var(--rouge); }
  @media (max-width: 820px) {
    .nav__name { display: none; }
    .nav__links { gap: 0.7rem; font-size: 0.8rem; flex-wrap: wrap; }
  }
</style>
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/Nav.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: composant Nav"
```

---

### Task 7 : Footer

**Files:**
- Create: `src/components/Footer.astro`
- Create: `tests/components/Footer.test.ts`

**Interfaces:**
- Consumes: tokens CSS.
- Produces: `<Footer />` (aucune prop). Contient contact, réseaux sociaux (Facebook, Instagram, LinkedIn), liens légaux.

- [ ] **Step 1 : Écrire le test (échec attendu)**

Create `tests/components/Footer.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Footer from '../../src/components/Footer.astro';

test('le footer rend réseaux et mentions', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Footer);
  expect(html).toContain('Facebook');
  expect(html).toContain('Instagram');
  expect(html).toContain('LinkedIn');
  expect(html).toContain('Mentions légales');
  expect(html).toContain('Cercle Nautique de France');
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/Footer.test.ts`
Expected: FAIL — composant introuvable.

- [ ] **Step 3 : Créer le composant**

Create `src/components/Footer.astro`:
```astro
---
const annee = 2026;
const reseaux = [
  { label: "Facebook", href: "https://www.facebook.com/cerclenautiquedefrance" },
  { label: "Instagram", href: "https://www.instagram.com/cerclenautiquedefrance" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/cercle-nautique-de-france" },
];
---
<footer class="ft">
  <div class="wrap ft__inner">
    <div>
      <div class="ft__title">Cercle Nautique de France</div>
      <p class="ft__muted">Île de la Jatte, Neuilly-sur-Seine<br />contact@cnfrance.fr</p>
    </div>
    <nav class="ft__col" aria-label="Réseaux sociaux">
      <span class="ft__h">Suivez-nous</span>
      {reseaux.map((r) => <a href={r.href} rel="noopener" target="_blank">{r.label}</a>)}
    </nav>
    <nav class="ft__col" aria-label="Informations légales">
      <span class="ft__h">Le site</span>
      <a href="/plan-du-site">Plan du site</a>
      <a href="/mentions-legales">Mentions légales</a>
    </nav>
  </div>
  <div class="wrap ft__base">© {annee} Cercle Nautique de France — L'aviron aux portes de Paris</div>
</footer>
<style>
  .ft { background: var(--texte); color: color-mix(in srgb, var(--blanc) 82%, transparent); margin-top: 4rem; padding-block: 2.5rem 1.5rem; }
  .ft__inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 2rem; }
  .ft__title { font-family: var(--font-titre); font-size: 1.15rem; color: var(--blanc); margin-bottom: 0.4rem; }
  .ft__muted { font-size: 0.9rem; opacity: 0.8; }
  .ft__col { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
  .ft__h { font-family: var(--font-titre); color: var(--blanc); margin-bottom: 0.3rem; }
  .ft__col a:hover { color: var(--blanc); }
  .ft__base { margin-top: 2rem; padding-top: 1.2rem; border-top: 1px solid color-mix(in srgb, var(--blanc) 15%, transparent); font-size: 0.82rem; opacity: 0.7; }
  @media (max-width: 700px) { .ft__inner { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/Footer.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: composant Footer"
```

---

### Task 8 : Hero (section 1 — photo parallax, direction A)

**Files:**
- Create: `src/components/Hero.astro`
- Create: `tests/components/Hero.test.ts`
- Create: `src/assets/hero/README.md` (note sur le pool de photos)

**Interfaces:**
- Consumes: tokens CSS.
- Produces: `<Hero />`. Props : `{ photos: string[] }` (URLs des photos du pool ; la première sert d'image LCP). Rend le slogan, le titre, un CTA « Nous rejoindre », et applique un parallax scroll-driven en CSS avec fallback.

- [ ] **Step 1 : Écrire le test (échec attendu)**

Create `tests/components/Hero.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Hero from '../../src/components/Hero.astro';

test('le hero rend le titre, le slogan et une image du pool', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Hero, {
    props: { photos: ['/img/seine-1.jpg', '/img/seine-2.jpg'] },
  });
  expect(html).toContain('portes de Paris');
  expect(html).toContain('Cercle Nautique de France');
  expect(html).toContain('/img/seine-1.jpg');
  expect(html).toContain('Nous rejoindre');
});

test('le hero gère un pool vide sans planter', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Hero, { props: { photos: [] } });
  expect(html).toContain('portes de Paris');
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/Hero.test.ts`
Expected: FAIL — composant introuvable.

- [ ] **Step 3 : Créer le composant**

Create `src/components/Hero.astro`:
```astro
---
interface Props { photos: string[]; }
const { photos } = Astro.props;
const principale = photos[0] ?? "";
// Le pool complet est exposé en JSON pour une rotation client optionnelle (progressive enhancement).
const poolJson = JSON.stringify(photos);
---
<section class="hero">
  <div class="hero__media">
    {principale
      ? <img class="hero__img" src={principale} alt="Aviron sur la Seine près de Neuilly" fetchpriority="high" data-pool={poolJson} />
      : <div class="hero__img hero__img--placeholder" data-pool={poolJson}></div>}
    <div class="hero__overlay"></div>
  </div>
  <div class="wrap hero__copy">
    <p class="hero__kicker">Cercle Nautique de France · depuis 1875</p>
    <h1 class="hero__title">L'aviron aux<br />portes de Paris</h1>
    <a class="btn hero__cta" href="/#infos">Nous rejoindre</a>
  </div>
</section>
<script>
  // Rotation aléatoire du pool côté client (n'affecte pas le LCP : l'image initiale est déjà rendue).
  const el = document.querySelector<HTMLElement>(".hero__img");
  if (el) {
    try {
      const pool: string[] = JSON.parse(el.dataset.pool || "[]");
      if (pool.length > 1 && el instanceof HTMLImageElement) {
        el.src = pool[Math.floor(Math.random() * pool.length)];
      }
    } catch {}
  }
</script>
<style>
  .hero { position: relative; height: min(82vh, 680px); overflow: hidden; display: flex; align-items: flex-end; }
  .hero__media { position: absolute; inset: 0; }
  .hero__img { width: 100%; height: 120%; object-fit: cover; will-change: transform; }
  .hero__img--placeholder { background: linear-gradient(#0a3d62, #1e6091 70%, #2a7fb0); }
  .hero__overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(6,30,50,.72), rgba(6,30,50,.15) 55%, transparent); }
  .hero__copy { position: relative; padding-bottom: 3rem; color: var(--blanc); }
  .hero__kicker { text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; font-weight: 700; color: #cfe6f4; }
  .hero__title { font-size: clamp(2.2rem, 6vw, 4.2rem); margin: 0.4rem 0 1.4rem; text-shadow: 0 2px 18px rgba(0,0,0,.45); }
  .hero__cta { font-size: 1.05rem; }

  /* Parallax : scroll-driven animation native, avec fallback silencieux */
  @supports (animation-timeline: scroll()) {
    @media (prefers-reduced-motion: no-preference) {
      .hero__img { animation: hero-parallax linear both; animation-timeline: scroll(root); animation-range: 0 600px; }
      @keyframes hero-parallax { to { transform: translateY(-16%); } }
    }
  }
</style>
```

Create `src/assets/hero/README.md`:
```md
# Pool de photos du hero

Déposez ici les photos HD réutilisées du site existant (paysage, ≥ 1600px de large).
Elles sont référencées par la page d'accueil via un tableau d'URLs (voir `src/pages/index.astro`).
Au Plan 3, ce pool sera géré depuis le CMS Sveltia.
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/Hero.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: Hero photo parallax (direction A)"
```

---

### Task 9 : SectionChiffres (section 2)

**Files:**
- Create: `src/components/SectionChiffres.astro`
- Create: `tests/components/SectionChiffres.test.ts`

**Interfaces:**
- Consumes: tokens CSS.
- Produces: `<SectionChiffres />`. Props : `{ accroche: string, chiffres: {valeur: string, label: string}[] }`. Ancre `id="club"`.

- [ ] **Step 1 : Écrire le test (échec attendu)**

Create `tests/components/SectionChiffres.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionChiffres from '../../src/components/SectionChiffres.astro';

test('rend accroche et chiffres', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionChiffres, {
    props: {
      accroche: 'Bienvenue au club',
      chiffres: [{ valeur: '1875', label: 'fondé en' }, { valeur: '+300', label: 'adhérents' }],
    },
  });
  expect(html).toContain('Bienvenue au club');
  expect(html).toContain('1875');
  expect(html).toContain('fondé en');
  expect(html).toContain('+300');
  expect(html).toContain('id="club"');
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionChiffres.test.ts`
Expected: FAIL — composant introuvable.

- [ ] **Step 3 : Créer le composant**

Create `src/components/SectionChiffres.astro`:
```astro
---
interface Props { accroche: string; chiffres: { valeur: string; label: string }[]; }
const { accroche, chiffres } = Astro.props;
---
<section id="club" class="chiffres">
  <div class="wrap chiffres__inner">
    <p class="chiffres__accroche">{accroche}</p>
    <ul class="chiffres__grid">
      {chiffres.map((c) => (
        <li class="chiffres__item">
          <span class="chiffres__val">{c.valeur}</span>
          <span class="chiffres__lab">{c.label}</span>
        </li>
      ))}
    </ul>
  </div>
</section>
<style>
  .chiffres { padding-block: 3.5rem; }
  .chiffres__accroche { font-size: clamp(1.15rem, 2.4vw, 1.5rem); max-width: 60ch; margin-inline: auto; text-align: center; color: var(--texte); }
  .chiffres__grid { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-top: 2.5rem; }
  .chiffres__item { text-align: center; }
  .chiffres__val { display: block; font-family: var(--font-titre); font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--rouge); }
  .chiffres__lab { display: block; font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  @media (max-width: 640px) { .chiffres__grid { grid-template-columns: repeat(2, 1fr); } }
</style>
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionChiffres.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: section accroche + chiffres clés"
```

---

### Task 10 : SectionDisciplines (section 3)

**Files:**
- Create: `src/components/SectionDisciplines.astro`
- Create: `tests/components/SectionDisciplines.test.ts`

**Interfaces:**
- Consumes: tokens CSS.
- Produces: `<SectionDisciplines />` (aucune prop — liste des disciplines codée en dur, structure fixe). Ancre `id="disciplines"`. Disciplines : Compétition, Loisir / Rando, Indoor / Ergo, Aviron santé, Découverte.

- [ ] **Step 1 : Écrire le test (échec attendu)**

Create `tests/components/SectionDisciplines.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionDisciplines from '../../src/components/SectionDisciplines.astro';

test('rend les disciplines', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionDisciplines);
  for (const d of ['Compétition', 'Loisir', 'Indoor', 'santé', 'Découverte']) {
    expect(html).toContain(d);
  }
  expect(html).toContain('id="disciplines"');
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionDisciplines.test.ts`
Expected: FAIL — composant introuvable.

- [ ] **Step 3 : Créer le composant**

Create `src/components/SectionDisciplines.astro`:
```astro
---
const disciplines = [
  { titre: "Compétition", desc: "Régates régionales et championnats de France, en équipage ou en solo.", href: "/pratiquer#competition" },
  { titre: "Loisir / Rando", desc: "Sorties sur la Seine et randonnées aviron partout en France.", href: "/pratiquer#loisir" },
  { titre: "Indoor / Ergo", desc: "L'aviron toute l'année sur ergomètre, en salle.", href: "/pratiquer#indoor" },
  { titre: "Aviron santé", desc: "Une pratique douce et encadrée, adaptée à chacun.", href: "/pratiquer#sante" },
  { titre: "Découverte", desc: "Séances d'initiation et stages pour débuter l'aviron.", href: "/pratiquer#decouverte" },
];
---
<section id="disciplines" class="disc">
  <div class="wrap">
    <h2 class="disc__h">Pratiquer l'aviron</h2>
    <div class="disc__grid">
      {disciplines.map((d) => (
        <a class="disc__card" href={d.href}>
          <h3 class="disc__title">{d.titre}</h3>
          <p class="disc__desc">{d.desc}</p>
          <span class="disc__more">En savoir plus →</span>
        </a>
      ))}
    </div>
  </div>
</section>
<style>
  .disc { padding-block: 3.5rem; background: var(--blanc); }
  .disc__h { font-size: clamp(1.6rem, 3.5vw, 2.4rem); margin-bottom: 1.8rem; }
  .disc__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.1rem; }
  .disc__card { border: 1px solid var(--gris-bord); border-radius: var(--radius); padding: 1.3rem; transition: transform .15s, box-shadow .15s; background: var(--fond); }
  .disc__card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(138,12,12,.1); }
  .disc__title { color: var(--rouge); font-size: 1.15rem; margin-bottom: 0.4rem; }
  .disc__desc { font-size: 0.9rem; color: var(--muted); }
  .disc__more { display: inline-block; margin-top: 0.8rem; font-weight: 700; font-size: 0.85rem; color: var(--rouge-sombre); }
</style>
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionDisciplines.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: section disciplines"
```

---

### Task 11 : SectionEvenements (section 4) + SectionActus (section 5)

**Files:**
- Create: `src/components/SectionEvenements.astro`, `src/components/SectionActus.astro`
- Create: `tests/components/SectionEvenements.test.ts`, `tests/components/SectionActus.test.ts`

**Interfaces:**
- Consumes: tokens CSS.
- Produces:
  - `<SectionEvenements />` — props `{ evenements: {titre: string, date: Date, lieu?: string, description: string}[] }`. Ancre `id="evenements"`. Le tri/filtre (à venir uniquement) est fait par l'appelant (index.astro).
  - `<SectionActus />` — props `{ actus: {titre: string, date: Date, resume: string, slug: string}[] }`. Ancre `id="actus"`.

- [ ] **Step 1 : Écrire les tests (échec attendu)**

Create `tests/components/SectionEvenements.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionEvenements from '../../src/components/SectionEvenements.astro';

test('rend les événements avec date formatée', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, {
    props: { evenements: [{ titre: '41ème Défi CNF', date: new Date('2026-06-14'), lieu: 'Neuilly', description: 'Régate annuelle' }] },
  });
  expect(html).toContain('41ème Défi CNF');
  expect(html).toContain('Régate annuelle');
  expect(html).toContain('juin');
  expect(html).toContain('id="evenements"');
});

test('affiche un message si aucun événement', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, { props: { evenements: [] } });
  expect(html).toContain('Aucun événement');
});
```

Create `tests/components/SectionActus.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionActus from '../../src/components/SectionActus.astro';

test('rend les actualités avec lien vers article', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionActus, {
    props: { actus: [{ titre: 'Randonnée Côte Bleue', date: new Date('2026-05-18'), resume: 'Retour en images', slug: 'randonnee-cote-bleue' }] },
  });
  expect(html).toContain('Randonnée Côte Bleue');
  expect(html).toContain('Retour en images');
  expect(html).toContain('/actualites/randonnee-cote-bleue');
  expect(html).toContain('id="actus"');
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionEvenements.test.ts tests/components/SectionActus.test.ts`
Expected: FAIL — composants introuvables.

- [ ] **Step 3 : Créer les composants**

Create `src/components/SectionEvenements.astro`:
```astro
---
interface Evenement { titre: string; date: Date; lieu?: string; description: string; }
interface Props { evenements: Evenement[]; }
const { evenements } = Astro.props;
const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
---
<section id="evenements" class="evt">
  <div class="wrap">
    <h2 class="evt__h">Événements à venir</h2>
    {evenements.length === 0
      ? <p class="evt__vide">Aucun événement à venir pour le moment. Revenez bientôt !</p>
      : <div class="evt__grid">
          {evenements.map((e) => (
            <article class="evt__card">
              <time class="evt__date" datetime={e.date.toISOString()}>{fmt.format(e.date)}</time>
              <h3 class="evt__title">{e.titre}</h3>
              {e.lieu && <p class="evt__lieu">📍 {e.lieu}</p>}
              <p class="evt__desc">{e.description}</p>
            </article>
          ))}
        </div>}
  </div>
</section>
<style>
  .evt { padding-block: 3.5rem; }
  .evt__h { font-size: clamp(1.6rem, 3.5vw, 2.4rem); margin-bottom: 1.8rem; }
  .evt__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.2rem; }
  .evt__card { background: var(--blanc); border: 1px solid var(--gris-bord); border-left: 4px solid var(--rouge); border-radius: var(--radius); padding: 1.3rem; }
  .evt__date { font-weight: 700; color: var(--rouge); font-size: 0.85rem; text-transform: uppercase; }
  .evt__title { font-size: 1.2rem; margin: 0.3rem 0; }
  .evt__lieu { font-size: 0.85rem; color: var(--muted); margin-bottom: 0.5rem; }
  .evt__desc { font-size: 0.92rem; color: var(--texte); }
  .evt__vide { color: var(--muted); }
</style>
```

Create `src/components/SectionActus.astro`:
```astro
---
interface Actu { titre: string; date: Date; resume: string; slug: string; }
interface Props { actus: Actu[]; }
const { actus } = Astro.props;
const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
---
<section id="actus" class="act">
  <div class="wrap">
    <div class="act__head">
      <h2 class="act__h">Actualités</h2>
      <a class="act__all" href="/actualites">Toutes les actus →</a>
    </div>
    {actus.length === 0
      ? <p class="act__vide">Pas encore d'article publié.</p>
      : <div class="act__grid">
          {actus.map((a) => (
            <a class="act__card" href={`/actualites/${a.slug}`}>
              <time class="act__date" datetime={a.date.toISOString()}>{fmt.format(a.date)}</time>
              <h3 class="act__title">{a.titre}</h3>
              <p class="act__resume">{a.resume}</p>
            </a>
          ))}
        </div>}
  </div>
</section>
<style>
  .act { padding-block: 3.5rem; background: var(--blanc); }
  .act__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1.8rem; gap: 1rem; }
  .act__h { font-size: clamp(1.6rem, 3.5vw, 2.4rem); }
  .act__all { font-weight: 700; color: var(--rouge); font-size: 0.9rem; }
  .act__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.2rem; }
  .act__card { border: 1px solid var(--gris-bord); border-radius: var(--radius); padding: 1.3rem; transition: transform .15s; background: var(--fond); }
  .act__card:hover { transform: translateY(-3px); }
  .act__date { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; }
  .act__title { font-size: 1.15rem; color: var(--rouge-sombre); margin: 0.3rem 0; }
  .act__resume { font-size: 0.9rem; color: var(--muted); }
  .act__vide { color: var(--muted); }
</style>
```

- [ ] **Step 4 : Lancer les tests pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionEvenements.test.ts tests/components/SectionActus.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: sections événements et actualités"
```

---

### Task 12 : SectionGalerie (section 6) + SectionInfosPratiques (section 7) + SectionPartenaires (section 8)

**Files:**
- Create: `src/components/SectionGalerie.astro`, `src/components/SectionInfosPratiques.astro`, `src/components/SectionPartenaires.astro`
- Create: `tests/components/SectionPartenaires.test.ts`

**Interfaces:**
- Consumes: tokens CSS.
- Produces:
  - `<SectionGalerie />` — props `{ photos: string[] }`. Ancre `id="galerie"`. Affiche jusqu'à 8 vignettes ; si vide, placeholders.
  - `<SectionInfosPratiques />` — props `{ horaires: string, tarifs: string, adresse: string, email: string }`. Ancre `id="infos"`. Contient le bloc « Nous rejoindre » (CTA mailto).
  - `<SectionPartenaires />` — props `{ partenaires: {nom: string, url?: string}[] }`. Ancre `id="partenaires"`.

- [ ] **Step 1 : Écrire le test partenaires (échec attendu)**

Create `tests/components/SectionPartenaires.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionPartenaires from '../../src/components/SectionPartenaires.astro';

test('rend les partenaires, avec lien quand url présente', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionPartenaires, {
    props: { partenaires: [{ nom: 'FFA', url: 'https://ffaviron.fr' }, { nom: 'Ville de Neuilly' }] },
  });
  expect(html).toContain('FFA');
  expect(html).toContain('https://ffaviron.fr');
  expect(html).toContain('Ville de Neuilly');
  expect(html).toContain('id="partenaires"');
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionPartenaires.test.ts`
Expected: FAIL — composant introuvable.

- [ ] **Step 3 : Créer les trois composants**

Create `src/components/SectionGalerie.astro`:
```astro
---
interface Props { photos: string[]; }
const { photos } = Astro.props;
const vignettes = photos.slice(0, 8);
const manquantes = Math.max(0, 8 - vignettes.length);
---
<section id="galerie" class="gal">
  <div class="wrap">
    <div class="gal__head">
      <h2 class="gal__h">En images</h2>
      <a class="gal__all" href="/galerie">Toute la galerie →</a>
    </div>
    <div class="gal__grid">
      {vignettes.map((p) => <img class="gal__img" src={p} alt="Photo du club" loading="lazy" />)}
      {Array.from({ length: manquantes }).map(() => <div class="gal__ph"></div>)}
    </div>
  </div>
</section>
<style>
  .gal { padding-block: 3.5rem; }
  .gal__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; }
  .gal__h { font-size: clamp(1.6rem, 3.5vw, 2.4rem); }
  .gal__all { font-weight: 700; color: var(--rouge); font-size: 0.9rem; }
  .gal__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
  .gal__img, .gal__ph { aspect-ratio: 1; border-radius: 8px; object-fit: cover; width: 100%; }
  .gal__ph { background: var(--gris-bord); }
  @media (max-width: 640px) { .gal__grid { grid-template-columns: repeat(2, 1fr); } }
</style>
```

Create `src/components/SectionInfosPratiques.astro`:
```astro
---
interface Props { horaires: string; tarifs: string; adresse: string; email: string; }
const { horaires, tarifs, adresse, email } = Astro.props;
---
<section id="infos" class="infos">
  <div class="wrap infos__inner">
    <div class="infos__col">
      <h2 class="infos__h">Nous rejoindre</h2>
      <p class="infos__lead">Envie d'essayer l'aviron ? Le club accueille débutants comme confirmés toute l'année.</p>
      <a class="btn" href={`mailto:${email}`}>Écrire au club</a>
    </div>
    <ul class="infos__list">
      <li><span class="infos__ic">🕐</span><div><b>Horaires</b><p>{horaires}</p></div></li>
      <li><span class="infos__ic">💶</span><div><b>Tarifs</b><p>{tarifs}</p></div></li>
      <li><span class="infos__ic">📍</span><div><b>Où nous trouver</b><p>{adresse}</p></div></li>
      <li><span class="infos__ic">✉️</span><div><b>Contact</b><p><a class="infos__mail" href={`mailto:${email}`}>{email}</a></p></div></li>
    </ul>
  </div>
</section>
<style>
  .infos { padding-block: 3.5rem; background: var(--blanc); }
  .infos__inner { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: start; }
  .infos__h { font-size: clamp(1.6rem, 3.5vw, 2.4rem); color: var(--rouge); }
  .infos__lead { margin: 0.8rem 0 1.4rem; color: var(--muted); max-width: 40ch; }
  .infos__list { list-style: none; display: grid; gap: 1.1rem; }
  .infos__list li { display: flex; gap: 0.8rem; }
  .infos__ic { font-size: 1.3rem; }
  .infos__list b { font-family: var(--font-titre); }
  .infos__list p { font-size: 0.92rem; color: var(--muted); }
  .infos__mail { color: var(--rouge); font-weight: 600; }
  @media (max-width: 700px) { .infos__inner { grid-template-columns: 1fr; } }
</style>
```

Create `src/components/SectionPartenaires.astro`:
```astro
---
interface Partenaire { nom: string; url?: string; }
interface Props { partenaires: Partenaire[]; }
const { partenaires } = Astro.props;
---
<section id="partenaires" class="part">
  <div class="wrap">
    <h2 class="part__h">Nos partenaires</h2>
    <ul class="part__grid">
      {partenaires.map((p) => (
        <li class="part__item">
          {p.url
            ? <a href={p.url} rel="noopener" target="_blank">{p.nom}</a>
            : <span>{p.nom}</span>}
        </li>
      ))}
    </ul>
  </div>
</section>
<style>
  .part { padding-block: 3rem; }
  .part__h { text-align: center; font-size: 1.3rem; color: var(--muted); margin-bottom: 1.5rem; }
  .part__grid { list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem 2.5rem; }
  .part__item { font-family: var(--font-titre); font-size: 1.05rem; color: var(--texte); opacity: 0.75; transition: opacity .15s; }
  .part__item:hover { opacity: 1; }
  .part__item a:hover { color: var(--rouge); }
</style>
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/components/SectionPartenaires.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: sections galerie, infos pratiques, partenaires"
```

---

### Task 13 : Assemblage de la page d'accueil

**Files:**
- Modify: `src/pages/index.astro` (remplace le placeholder de la Task 1)
- Create: `tests/pages/index.test.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `Nav`, `Footer`, `Hero`, et les 8 composants de section ; les collections `reglages`, `evenements`, `actualites`, `partenaires` via `astro:content`.
- Produces: la page `/` complète. C'est le livrable final du plan.

- [ ] **Step 1 : Écrire le test de rendu de page (échec attendu)**

Create `tests/pages/index.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Index from '../../src/pages/index.astro';

// getCollection est appelé dans le frontmatter de la page ; on le mocke pour un rendu isolé.
import { vi } from 'vitest';
vi.mock('astro:content', async () => {
  return {
    getCollection: async (name: string) => {
      if (name === 'reglages') return [{ id: 'reglages', data: {
        accroche: 'Bienvenue', chiffres: [{ valeur: '1875', label: 'fondé en' }],
        infos: { horaires: '7j/7', tarifs: '300€', adresse: 'Neuilly', email: 'contact@cnfrance.fr' },
      } }];
      if (name === 'evenements') return [{ id: '41e-defi-cnf', data: { titre: '41ème Défi CNF', date: new Date('2030-06-14'), lieu: 'Neuilly', description: 'Régate' } }];
      if (name === 'actualites') return [{ id: 'randonnee-cote-bleue', data: { titre: 'Rando Côte Bleue', date: new Date('2026-05-18'), resume: 'Images' } }];
      if (name === 'partenaires') return [{ id: 'ffa', data: { nom: 'FFA', url: 'https://ffaviron.fr' } }];
      return [];
    },
  };
});

test('la home assemble hero, sections et footer', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Index);
  expect(html).toContain('portes de Paris');       // hero
  expect(html).toContain('Bienvenue');              // chiffres
  expect(html).toContain('Pratiquer');              // disciplines/nav
  expect(html).toContain('41ème Défi CNF');         // événements
  expect(html).toContain('Rando Côte Bleue');       // actus
  expect(html).toContain('FFA');                    // partenaires
  expect(html).toContain('Mentions légales');       // footer
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/pages/index.test.ts`
Expected: FAIL — la page ne contient encore que le placeholder.

- [ ] **Step 3 : Écrire la page d'accueil**

Replace `src/pages/index.astro` entirely with:
```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Footer from "../components/Footer.astro";
import Hero from "../components/Hero.astro";
import SectionChiffres from "../components/SectionChiffres.astro";
import SectionDisciplines from "../components/SectionDisciplines.astro";
import SectionEvenements from "../components/SectionEvenements.astro";
import SectionActus from "../components/SectionActus.astro";
import SectionGalerie from "../components/SectionGalerie.astro";
import SectionInfosPratiques from "../components/SectionInfosPratiques.astro";
import SectionPartenaires from "../components/SectionPartenaires.astro";

const [reglagesArr, evenementsArr, actualitesArr, partenairesArr] = await Promise.all([
  getCollection("reglages"),
  getCollection("evenements"),
  getCollection("actualites"),
  getCollection("partenaires"),
]);

const reglages = reglagesArr[0]?.data;

// Événements : uniquement à venir, triés par date croissante, max 3.
const maintenant = new Date();
const evenements = evenementsArr
  .map((e) => e.data)
  .filter((e) => e.date >= maintenant)
  .sort((a, b) => a.date.getTime() - b.date.getTime())
  .slice(0, 3);

// Actus : 3 plus récentes, avec slug depuis l'id de collection.
const actus = actualitesArr
  .map((e) => ({ ...e.data, slug: e.id }))
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .slice(0, 3);

const partenaires = partenairesArr.map((p) => p.data);

// Pool de photos hero : à alimenter avec les vraies photos (Plan 4). Vide = fallback dégradé.
const poolHero: string[] = [];
const poolGalerie: string[] = [];
---
<BaseLayout title="Cercle Nautique de France — L'aviron aux portes de Paris">
  <Nav slot="header" />
  <Hero photos={poolHero} />
  {reglages && <SectionChiffres accroche={reglages.accroche} chiffres={reglages.chiffres} />}
  <SectionDisciplines />
  <SectionEvenements evenements={evenements} />
  <SectionActus actus={actus} />
  <SectionGalerie photos={poolGalerie} />
  {reglages && <SectionInfosPratiques horaires={reglages.infos.horaires} tarifs={reglages.infos.tarifs} adresse={reglages.infos.adresse} email={reglages.infos.email} />}
  <SectionPartenaires partenaires={partenaires} />
  <Footer slot="footer" />
</BaseLayout>
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm test tests/pages/index.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier build + check + suite complète**

Run: `cd /Users/jbwatenberg/perso/cnfrance-2 && npm run check && npm test && npm run build`
Expected: `astro check` sans erreur, tous les tests PASS, build réussi, `dist/index.html` contient toutes les sections.

- [ ] **Step 6 : Commit**

```bash
cd /Users/jbwatenberg/perso/cnfrance-2
git add -A
git commit -m "feat: assemblage de la page d'accueil"
```

---

### Task 14 : Déploiement Netlify

**Files:**
- Modify: aucun fichier de code. Vérifie le pipeline de déploiement.

**Interfaces:**
- Consumes: `netlify.toml` (Task 1), le repo git avec la home fonctionnelle.
- Produces: un site en ligne (URL `*.netlify.app`), prêt à recevoir le domaine `cnfrance.fr`.

- [ ] **Step 1 : Créer le dépôt distant et pousser**

Créer un repo GitHub (privé) et pousser. Si `gh` est disponible :
```bash
cd /Users/jbwatenberg/perso/cnfrance-2
gh repo create cnfrance --private --source=. --remote=origin --push
```
Expected: repo créé, branche `main` poussée.

> Ce plan ne pousse/déploie que sur action explicite de l'utilisateur. Confirmer avant d'exécuter cette étape.

- [ ] **Step 2 : Connecter Netlify au repo**

Dans l'UI Netlify : « Add new site » → « Import an existing project » → sélectionner le repo `cnfrance`. Netlify lit `netlify.toml` (build `npm run build`, publish `dist`, Node 20). Lancer le déploiement.
Expected: build Netlify vert, site accessible sur une URL `*.netlify.app` affichant la page d'accueil.

- [ ] **Step 3 : Vérifier le site en ligne**

Ouvrir l'URL `*.netlify.app`. Vérifier visuellement : hero + slogan, chiffres, disciplines, événement « 41ème Défi CNF », actu « Randonnée de la Côte Bleue », partenaires, footer avec réseaux.

- [ ] **Step 4 : (Optionnel, sur validation) Brancher le domaine**

Dans Netlify → Domain settings → ajouter `cnfrance.fr` et `www.cnfrance.fr`, suivre les instructions DNS. HTTPS auto (Let's Encrypt).

> Ne PAS repointer le domaine tant que le site v1 (avec les vraies photos et pages intérieures) n'est pas validé — le site existant reste en ligne jusque-là. Cette étape est probablement à repousser après les Plans 2-4.

---

## Self-Review

**1. Couverture du spec (structure de la home, 9 sections) :**
- Section 1 Hero → Task 8 ✅
- Section 2 Accroche + chiffres → Task 9 ✅
- Section 3 Disciplines → Task 10 ✅
- Section 4 Événements → Task 11 ✅
- Section 5 Actualités → Task 11 ✅
- Section 6 Galerie → Task 12 ✅
- Section 7 Infos pratiques + Nous rejoindre → Task 12 ✅
- Section 8 Partenaires → Task 12 ✅
- Section 9 Footer → Task 7 ✅
- Nav → Task 6 ✅ · Design system → Task 3 ✅ · Modèle de contenu (admin-ready) → Task 4 ✅ · Déploiement → Task 14 ✅

**2. Placeholders :** aucun « TODO » de code non résolu. Le pool de photos est intentionnellement vide (`poolHero: []`) avec fallback dégradé testé — les vraies photos arrivent au Plan 4 (documenté dans `src/assets/hero/README.md`).

**3. Cohérence des types :**
- Formes de données identiques entre `content.config.ts` (schémas), les props des composants, et le mock de `tests/pages/index.test.ts`.
- `slug` d'actu = `id` de collection, cohérent entre `SectionActus` (prop `slug`) et `index.astro` (`slug: e.id`).
- Ancres cohérentes avec les `href` de la Nav : `#club`, `#disciplines`, `#infos`, `#actus`, `#galerie`.

**Risques connus à surveiller à l'exécution :**
- API loaders `file()` pour un tableau (partenaires) : si Astro exige un id explicite, ajouter `"id"` à chaque objet (noté en Task 4 Step 5).
- Versions exactes des paquets (`^5`, `^2`) : `npm install` prendra la dernière ; si une API de test (`experimental_AstroContainer`) diffère, adapter l'import.
