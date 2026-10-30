# Actualités et événements réunis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une seule fiche (collection `actualites`) sert d'événement tant que sa date n'est pas passée, puis d'actualité dès qu'on y ajoute un compte rendu ; agenda `/agenda` avec abonnements `.ics` par univers.

**Architecture:** Les règles (à venir, dans le fil, heure, plage de dates) vivent dans `src/lib/agenda.ts`, pur et testé ; le flux iCalendar dans `src/lib/ics.ts`, pur et testé, exposé par des routes statiques `src/pages/agenda/[canal].ics.ts`. Les pages Astro ne font que lire la collection et appliquer ces règles. Les dates du CMS sont lues en « heure murale » (process en UTC au build). Une recompilation nocturne fait basculer les fiches passées ; un petit script masque côté navigateur ce qui est passé depuis.

**Tech Stack:** Astro 5 (content collections, routes statiques `.ics`), `@astrojs/markdown-remark` (rendu de la présentation), Vitest + `experimental_AstroContainer`, Sveltia CMS, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-30-actus-evenements-unifies-design.md`

## Global Constraints

- Univers : exactement `CATEGORIES_ACTU` (`competition`, `loisir`, `club`) ; les fermetures du club sont des fiches `club`.
- Canaux `.ics` : `tout`, `competition`, `loisir`, `club` ; fichiers `/agenda/<canal>.ics`.
- Fenêtre des flux : fiches à venir + fiches dont la fin date de **90 jours** au plus.
- Durée par défaut d'un rendez-vous avec heure : **2 h**.
- Recompilation : `cron: "15 2 * * *"` dans `.github/workflows/pages.yml`.
- **Heure murale :** les dates du CMS n'ont pas de fuseau ; `process.env.TZ = "UTC"` au build et dans Vitest ; toute lecture de jour/heure d'une date de fiche passe par `src/lib/agenda.ts` (accesseurs UTC). « Aujourd'hui » = jour civil à Europe/Paris.
- Valeurs vides du CMS (`''`, `null`) acceptées pour tous les nouveaux champs.
- Tout texte visible en français ; commits en français à l'impératif ; chaque tâche se termine par un commit de ses seuls fichiers.
- **Vérifications par code de sortie** (jamais en cherchant un mot dans la sortie) ; avant tout push : `git fetch`, intégrer `origin/main` si besoin, tests et build verts.

## Review Focus

1. **Rendez-vous le jour même** — une fiche dont la fin est aujourd'hui (Paris) doit rester « à venir » toute la journée, y compris à 23 h 30 Paris (= jour suivant en UTC). Test en tâche 1.
2. **Heure saisie le soir** — « 2026-10-27T19:00 » doit s'afficher « 19 h » et sortir `DTSTART;TZID=Europe/Paris:20261027T190000`, pas 20 h ni 21 h, quel que soit le fuseau de la machine de build. Tests en tâches 1, 2 et 6.
3. **Fiche passée sans compte rendu** — ni dans le fil des actualités, ni dans « Événements à venir » ; sa page reste accessible et dit « a eu lieu ». Tests en tâches 3 et 5.
4. **Texte avec `;` `,` retours à la ligne et accents dans un flux `.ics`** — échappement et repli à 75 octets sans couper un caractère UTF-8. Test en tâche 6.
5. **Champs vides écrits par le CMS** (`dateFin: ''`, `lien: ''`, `lieu: ''`) — la compilation ne doit pas casser. Test en tâche 2.

---

## File Structure

```
src/lib/agenda.ts                     # règles pures : jour mural, à venir, fil, heure, plage
src/lib/ics.ts                        # génération iCalendar pure + liste des canaux
src/scripts/masquer-passes.ts         # client : masque les [data-fin] dépassés
src/pages/agenda/index.astro          # page Agenda (mois, filtre, abonnement)
src/pages/agenda/[canal].ics.ts       # flux statiques
src/content.config.ts                 # actualiteSchema enrichi ; evenements supprimé
src/pages/index.astro                 # à venir + fil depuis la seule collection
src/components/SectionEvenements.astro# cartes cliquables, lien Agenda
src/pages/actualites/index.astro      # fil uniquement
src/pages/actualites/[slug].astro     # trois états de fiche
src/pages/infos-pratiques/calendrier.astro  # lit la seule collection
src/components/Nav.astro              # + Agenda
public/admin/config.yml               # collection « Actualités & événements »
astro.config.mjs, vitest.config.ts    # TZ=UTC
.github/workflows/pages.yml           # recompilation nocturne
src/content/evenements/               # supprimé (6 fiches migrées)
tests/lib/agenda.test.ts, tests/lib/ics.test.ts, tests/pages/agenda-index.test.ts,
tests/pages/actualites-slug.test.ts (adapté), tests/components/SectionEvenements.test.ts (adapté),
tests/pages/index.test.ts (adapté), tests/content-schemas.test.ts, tests/content-slugs.test.ts
```

---

### Task 1: Règles d'agenda et heure murale

**Files:**
- Create: `src/lib/agenda.ts`, `tests/lib/agenda.test.ts`
- Modify: `astro.config.mjs` (première ligne de code), `vitest.config.ts`, `tests/content-schemas.test.ts`

**Interfaces:**
- Produces: `interface Datee { date: Date; dateFin?: Date | null }` ; `aujourdhuiParis(maintenant?: Date): string` ; `jourMural(d: Date): string` ; `finDe(f: Datee): Date` ; `estAVenir(f: Datee, aujourdhui: string): boolean` ; `dansLeFil(f: Datee, corps: string | undefined, aujourdhui: string): boolean` ; `heureDe(d: Date): string | null` ; `plageDates(debut: Date, fin?: Date | null): string`.

- [ ] **Step 1: Tests qui échouent** — `tests/lib/agenda.test.ts` :

```ts
import { describe, expect, test } from 'vitest';
import {
  aujourdhuiParis, dansLeFil, estAVenir, finDe, heureDe, jourMural, plageDates,
} from '../../src/lib/agenda';

const d = (iso: string) => new Date(`${iso}Z`);

describe('jours', () => {
  test('le jour mural ignore le fuseau de la machine', () => {
    expect(jourMural(d('2026-10-27T19:00:00'))).toBe('2026-10-27');
    expect(jourMural(d('2026-10-27T23:59:00'))).toBe('2026-10-27');
  });
  test("aujourd'hui est jugé à Paris", () => {
    expect(aujourdhuiParis(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27'); // UTC+1 en hiver
    expect(aujourdhuiParis(new Date('2026-07-09T22:30:00Z'))).toBe('2026-07-10'); // UTC+2 en été
  });
  test('la fin est la date de fin, sinon la date', () => {
    expect(finDe({ date: d('2026-12-20T00:00:00'), dateFin: d('2027-01-03T00:00:00') }).getUTCDate()).toBe(3);
    expect(finDe({ date: d('2026-12-20T00:00:00') }).getUTCDate()).toBe(20);
  });
});

describe('à venir et fil', () => {
  const soir = { date: d('2026-10-27T19:00:00') };
  test('à venir toute la journée du rendez-vous, plus le lendemain', () => {
    expect(estAVenir(soir, '2026-10-27')).toBe(true);
    expect(estAVenir(soir, '2026-10-28')).toBe(false);
  });
  test('un rendez-vous sur plusieurs jours reste à venir jusqu\'à sa fin', () => {
    const fermeture = { date: d('2026-12-20T00:00:00'), dateFin: d('2027-01-03T00:00:00') };
    expect(estAVenir(fermeture, '2027-01-03')).toBe(true);
    expect(estAVenir(fermeture, '2027-01-04')).toBe(false);
  });
  test('le fil ne garde que les fiches passées qui ont un compte rendu', () => {
    expect(dansLeFil(soir, 'Récit', '2026-10-28')).toBe(true);
    expect(dansLeFil(soir, '', '2026-10-28')).toBe(false);
    expect(dansLeFil(soir, '  \n ', '2026-10-28')).toBe(false);
    expect(dansLeFil(soir, undefined, '2026-10-28')).toBe(false);
    expect(dansLeFil(soir, 'Récit', '2026-10-27')).toBe(false);
  });
});

describe('affichage', () => {
  test("l'heure n'apparaît que si elle est saisie", () => {
    expect(heureDe(d('2026-10-27T00:00:00'))).toBeNull();
    expect(heureDe(d('2026-10-27T19:00:00'))).toBe('19 h');
    expect(heureDe(d('2026-10-27T09:30:00'))).toBe('9 h 30');
  });
  test('plages de dates', () => {
    expect(plageDates(d('2026-06-14T00:00:00'))).toBe('14 juin 2026');
    expect(plageDates(d('2026-06-01T10:00:00'))).toBe('1er juin 2026');
    expect(plageDates(d('2026-07-11T00:00:00'), d('2026-07-12T00:00:00'))).toBe('11–12 juillet 2026');
    expect(plageDates(d('2026-06-30T00:00:00'), d('2026-07-02T00:00:00'))).toBe('30 juin – 2 juillet 2026');
    expect(plageDates(d('2026-12-20T00:00:00'), d('2027-01-03T00:00:00'))).toBe('20 décembre 2026 – 3 janvier 2027');
    expect(plageDates(d('2026-06-14T09:00:00'), d('2026-06-14T18:00:00'))).toBe('14 juin 2026');
  });
});
```

Ajouter dans le `describe('actualiteSchema', …)` de `tests/content-schemas.test.ts` :

```ts
  test('une date saisie sans fuseau dans le CMS garde son heure murale', () => {
    const a = actualiteSchema.parse({ titre: 'x', date: '2026-10-27T19:00', resume: 'x' });
    expect(a.date.getUTCHours()).toBe(19);
  });
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run tests/lib/agenda.test.ts tests/content-schemas.test.ts` → FAIL (module introuvable ; le test d'heure murale échoue sur une machine en heure de Paris : 17 ou 18 au lieu de 19).

- [ ] **Step 3: Implémenter** — `src/lib/agenda.ts` :

```ts
// Règles d'affichage des fiches « Actualités & événements »
// (docs/superpowers/specs/2026-10-30-actus-evenements-unifies-design.md).
//
// Heure murale : le CMS écrit des dates sans fuseau (« 2026-10-27T19:00 »),
// lues en UTC (process.env.TZ = "UTC" dans astro.config.mjs et
// vitest.config.ts). Une date de fiche porte donc l'heure de Paris dans ses
// champs UTC : on la lit avec les accesseurs UTC, jamais en Europe/Paris.

export interface Datee {
  date: Date;
  dateFin?: Date | null;
}

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
});

/** Jour civil d'aujourd'hui à Paris, « AAAA-MM-JJ ». */
export function aujourdhuiParis(maintenant: Date = new Date()): string {
  return JOUR_PARIS.format(maintenant);
}

/** Jour mural d'une date de fiche, « AAAA-MM-JJ ». */
export function jourMural(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function finDe(f: Datee): Date {
  return f.dateFin ?? f.date;
}

export function estAVenir(f: Datee, aujourdhui: string): boolean {
  return jourMural(finDe(f)) >= aujourdhui;
}

/** Fiche à montrer parmi les actualités : passée et dotée d'un compte rendu. */
export function dansLeFil(f: Datee, corps: string | undefined, aujourdhui: string): boolean {
  return !estAVenir(f, aujourdhui) && (corps ?? "").trim() !== "";
}

/** « 19 h », « 9 h 30 » ; null quand aucune heure n'a été saisie (minuit). */
export function heureDe(d: Date): string | null {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h === 0 && m === 0) return null;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jour = (n: number) => (n === 1 ? "1er" : String(n));

/** « 14 juin 2026 », « 11–12 juillet 2026 », « 30 juin – 2 juillet 2026 », « 20 décembre 2026 – 3 janvier 2027 ». */
export function plageDates(debut: Date, fin?: Date | null): string {
  const b = fin ?? debut;
  const [ja, ma, aa] = [debut.getUTCDate(), debut.getUTCMonth(), debut.getUTCFullYear()];
  const [jb, mb, ab] = [b.getUTCDate(), b.getUTCMonth(), b.getUTCFullYear()];
  if (jourMural(b) <= jourMural(debut)) return `${jour(ja)} ${MOIS[ma]} ${aa}`;
  if (aa !== ab) return `${jour(ja)} ${MOIS[ma]} ${aa} – ${jour(jb)} ${MOIS[mb]} ${ab}`;
  if (ma !== mb) return `${jour(ja)} ${MOIS[ma]} – ${jour(jb)} ${MOIS[mb]} ${ab}`;
  return `${jour(ja)}–${jour(jb)} ${MOIS[mb]} ${ab}`;
}
```

`astro.config.mjs`, juste après la ligne `import`, et `vitest.config.ts`, juste après ses imports :

```js
// Heure murale : les dates du CMS n'ont pas de fuseau ; on les lit en UTC
// pour qu'elles gardent l'heure saisie (voir src/lib/agenda.ts).
process.env.TZ = 'UTC';
```

- [ ] **Step 4: Vérifier** — `npx vitest run` (code de sortie 0) puis `npm run build` (code de sortie 0).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda.ts tests/lib/agenda.test.ts tests/content-schemas.test.ts astro.config.mjs vitest.config.ts
git commit -m "Ajoute les règles d'agenda et lit les dates du CMS en heure murale"
```

---

### Task 2: Champs d'événement et admin « Actualités & événements »

**Files:**
- Modify: `src/content.config.ts` (`actualiteSchema`), `public/admin/config.yml` (collection `actualites`), `tests/content-schemas.test.ts`

**Interfaces:**
- Produces: `actualiteSchema` accepte `dateFin?: Date`, `lieu?: string`, `presentation?: string`, `lien?: string` (URL), `''`/`null` → `undefined`.

- [ ] **Step 1: Tests qui échouent** — dans `describe('actualiteSchema', …)` :

```ts
  test('accepte les champs d\'événement', () => {
    const a = actualiteSchema.parse({
      titre: 'Fermeture', date: '2026-12-20', dateFin: '2027-01-03', resume: 'x',
      lieu: 'Club', presentation: '**Club fermé**', lien: 'https://exemple.fr/inscription',
    });
    expect(a.dateFin?.getUTCDate()).toBe(3);
    expect(a.lieu).toBe('Club');
    expect(a.presentation).toBe('**Club fermé**');
    expect(a.lien).toBe('https://exemple.fr/inscription');
  });
  test('les champs d\'événement laissés vides par le CMS sont ignorés', () => {
    const a = actualiteSchema.parse({ titre: 'x', date: '2026-12-20', resume: 'x', dateFin: '', lieu: '', presentation: '', lien: '' });
    expect([a.dateFin, a.lieu, a.presentation, a.lien]).toEqual([undefined, undefined, undefined, undefined]);
    expect(actualiteSchema.parse({ titre: 'x', date: '2026-12-20', resume: 'x', dateFin: null }).dateFin).toBeUndefined();
  });
  test('un lien d\'inscription doit être une adresse', () => {
    expect(() => actualiteSchema.parse({ titre: 'x', date: '2026-12-20', resume: 'x', lien: 'inscription' })).toThrow();
  });
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run tests/content-schemas.test.ts` → les 3 tests FAIL.

- [ ] **Step 3: Implémenter** — `src/content.config.ts`, avant `export const actualiteSchema` :

```ts
// Le CMS écrit '' (ou null) pour un champ laissé vide.
const sansVide = (v: unknown) => (v === "" || v === null ? undefined : v);
```

dans `actualiteSchema`, après `date: z.coerce.date(),` :

```ts
  // Rendez-vous : fin (plusieurs jours), lieu, présentation affichée avant la
  // date, lien d'inscription ou d'infos. Le corps Markdown est le compte rendu.
  dateFin: z.preprocess(sansVide, z.coerce.date().optional()),
  lieu: z.preprocess(sansVide, z.string().optional()),
  presentation: z.preprocess(sansVide, z.string().optional()),
  lien: z.preprocess(sansVide, z.string().url().optional()),
```

`public/admin/config.yml`, collection `actualites` :
- remplacer `    label: "Actualités"` / `    label_singular: "Actualité"` par :

```yaml
    label: "Actualités & événements"
    label_singular: "Actualité ou événement"
    description: "Une fiche par rendez-vous. AVANT la date : remplissez la présentation (et le lien d'inscription) — la fiche apparaît dans « Événements à venir » et l'agenda. APRÈS : rouvrez la même fiche et ajoutez le compte rendu et les photos — elle apparaît alors dans les actualités. Une fermeture du club est une fiche « Vie du club » avec date de fin."
    summary: "{{date | date('DD/MM/YYYY')}} — {{titre}}"
    sortable_fields: ["date", "titre"]
```
- après `      - { label: "Date", name: "date", widget: "datetime" }` (dans cette collection) :

```yaml
      - { label: "Date de fin", name: "dateFin", widget: "datetime", required: false, hint: "Pour un rendez-vous sur plusieurs jours (stage, fermeture du club…)." }
      - { label: "Lieu", name: "lieu", widget: "string", required: false }
```
- après `      - { label: "Résumé", name: "resume", widget: "text" }` :

```yaml
      - { label: "Présentation (avant le rendez-vous)", name: "presentation", widget: "markdown", required: false, hint: "Programme, horaires, infos pratiques. Affichée tant que la date n'est pas passée, et sur la page si aucun compte rendu n'est écrit." }
      - { label: "Lien d'inscription ou d'infos", name: "lien", widget: "string", required: false, hint: "Adresse complète (https://…). Bouton affiché tant que la date n'est pas passée." }
```
- remplacer la ligne `body` de cette collection (celle qui suit le champ `instagram`) par :

```yaml
      - { label: "Compte rendu (après le rendez-vous)", name: "body", widget: "markdown", required: false, hint: "Récit, résultats. Tant qu'il est vide, la fiche n'apparaît pas dans les actualités." }
```

- [ ] **Step 4: Vérifier** — `npx vitest run` (0) ; `ruby -ryaml -e 'c=YAML.load_file("public/admin/config.yml"); a=c["collections"].find{|x| x["name"]=="actualites"}; puts a["fields"].map{|f| f["name"]}.join(",")'` → contient `dateFin,lieu`, `presentation,lien` et `body` ; `npm run build` (0).

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts public/admin/config.yml tests/content-schemas.test.ts
git commit -m "Ajoute aux fiches les champs d'événement et renomme la collection de l'admin"
```

---

### Task 3: Migration des événements et lecture d'une seule collection

**Files:**
- Delete: `src/content/evenements/` (6 fichiers), collection `evenements` (schéma, admin)
- Create: `src/content/actualites/<même nom>.md` × 6
- Modify: `src/content.config.ts`, `public/admin/config.yml`, `src/pages/index.astro`, `src/components/SectionEvenements.astro` (interface seulement), `src/pages/actualites/index.astro`, `src/pages/infos-pratiques/calendrier.astro`
- Test: `tests/content-slugs.test.ts`, `tests/content-schemas.test.ts`, `tests/pages/index.test.ts`, `tests/components/SectionEvenements.test.ts`

**Interfaces:**
- Consumes: `aujourdhuiParis`, `estAVenir`, `dansLeFil`, `jourMural`, `finDe` (tâche 1) ; champs de la tâche 2.
- Produces: `SectionEvenements` prend `evenements: { titre: string; date: Date; dateFin?: Date; lieu?: string; resume: string; slug: string; categorie?: CategorieActu }[]`.

Correspondance des univers (à montrer au propriétaire avant commit) :

| Fichier | Univers |
| --- | --- |
| `41e-defi-cnf` | competition |
| `apero-after-row-l-aperow` | club |
| `championnats-france-masters-aviron-partage-2026` | competition |
| `coupe-de-france-des-regions-cnr` | competition |
| `nettoyage_berge_oct_2026` | club |
| `traversee-de-paris-2026` | loisir |

- [ ] **Step 1: Tests qui échouent**
  - `tests/content-slugs.test.ts` : boucle sur `['actualites']` seulement, et ajouter :

```ts
test('les événements sont des fiches de la collection actualités : plus de dossier séparé', () => {
  expect(existsSync('src/content/evenements')).toBe(false);
});
```
  - `tests/content-schemas.test.ts` : supprimer le `describe('evenementSchema', …)` et `evenementSchema` de l'import.
  - `tests/pages/index.test.ts` : dans le mock, supprimer la branche `evenements` et remplacer la branche `actualites` par :

```ts
      if (name === 'actualites') return [
        { id: '41e-defi-cnf', body: '', data: { titre: '41ème Défi CNF', date: new Date('2099-06-14T00:00:00Z'), lieu: 'Neuilly', resume: 'Régate' } },
        { id: 'randonnee-cote-bleue', body: 'Récit', data: { titre: 'Rando Côte Bleue', date: new Date('2026-05-18T00:00:00Z'), resume: 'Images' } },
        { id: 'annonce-passee', body: '', data: { titre: 'Annonce périmée', date: new Date('2026-01-10T00:00:00Z'), resume: 'x' } },
      ];
```
    et ajouter à l'assertion : `expect(html).not.toContain('Annonce périmée');`
  - `tests/components/SectionEvenements.test.ts` : dans les props, remplacer `description: '…'` par `resume: '…'` et ajouter `slug: 'x'` à chaque événement.

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run` → échecs sur content-slugs (dossier présent) et index (annonce périmée affichée / mock sans `evenements` : le Défi n'apparaît plus).

- [ ] **Step 3: Migrer le contenu** — script ponctuel, non commité (`/tmp/migrer-evenements.mjs`), lancé depuis la racine :

```js
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import yaml from "js-yaml";

const UNIVERS = {
  "41e-defi-cnf": "competition",
  "apero-after-row-l-aperow": "club",
  "championnats-france-masters-aviron-partage-2026": "competition",
  "coupe-de-france-des-regions-cnr": "competition",
  "nettoyage_berge_oct_2026": "club",
  "traversee-de-paris-2026": "loisir",
};
const q = (s) => JSON.stringify(s);
for (const f of readdirSync("src/content/evenements").filter((f) => f.endsWith(".md"))) {
  const nom = f.slice(0, -3);
  const brut = readFileSync(`src/content/evenements/${f}`, "utf8");
  const [, front, corps = ""] = brut.split(/^---$/m);
  const d = yaml.load(front, { schema: yaml.JSON_SCHEMA }); // dates gardées en texte
  const brutDate = (cle) => front.match(new RegExp(`^${cle}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "");
  if (!UNIVERS[nom]) throw new Error(`univers manquant : ${nom}`);
  const cible = existsSync(`src/content/actualites/${f}`) ? `src/content/actualites/${nom}-evenement.md` : `src/content/actualites/${f}`;
  const description = String(d.description ?? "").trim();
  const resume = description.split("\n").map((l) => l.trim()).find(Boolean) ?? d.titre;
  const presentation = [description, corps.trim()].filter(Boolean).join("\n\n");
  const lignes = ["---", `titre: ${q(d.titre)}`, `date: ${brutDate("date")}`];
  if (brutDate("dateFin")) lignes.push(`dateFin: ${brutDate("dateFin")}`);
  lignes.push(`categorie: ${UNIVERS[nom]}`, `resume: ${q(resume)}`);
  if (d.lieu) lignes.push(`lieu: ${q(d.lieu)}`);
  if (presentation) lignes.push(`presentation: ${q(presentation)}`);
  if (d.lien) lignes.push(`lien: ${q(d.lien)}`);
  if (d.image) lignes.push(`image: ${q(d.image)}`);
  lignes.push("---", "");
  writeFileSync(cible, lignes.join("\n"));
  console.log(`${f} → ${cible}`);
}
```

Puis : `git rm -rq src/content/evenements` et `git add src/content/actualites`.

- [ ] **Step 4: Retirer la collection et lire la seule collection**
  - `src/content.config.ts` : supprimer `evenementSchema`, la `const evenements = defineCollection(…)` et `evenements` dans `collections`.
  - `public/admin/config.yml` : supprimer le bloc qui commence à la ligne de séparation précédant `  # Événements — src/content/evenements/*.md` et s'arrête avant celle qui précède `  # Pages — src/content/pages/<section>/*.md`.
  - `src/pages/index.astro` : retirer `getCollection("evenements")` (et `evenementsArr`) ; ajouter `import { aujourdhuiParis, dansLeFil, estAVenir } from "../lib/agenda";` et remplacer les blocs « Événements » et « Actus » par :

```ts
// Une fiche par rendez-vous : à venir tant que sa date n'est pas passée, puis
// dans le fil des actualités dès qu'elle a un compte rendu.
const aujourdhui = aujourdhuiParis();
const fiches = actualitesArr.map((e) => ({ ...e.data, slug: e.id, corps: e.body ?? "" }));
const evenements = fiches
  .filter((f) => estAVenir(f, aujourdhui))
  .sort((a, b) => a.date.getTime() - b.date.getTime())
  .slice(0, 3);
const actus = fiches
  .filter((f) => dansLeFil(f, f.corps, aujourdhui))
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .slice(0, 3);
```
    (la galerie de l'accueil reste construite depuis `actualitesArr`).
  - `src/components/SectionEvenements.astro` : remplacer l'interface par

```ts
import type { CategorieActu } from "../lib/categories-actus";
interface Evenement { titre: string; date: Date; dateFin?: Date; lieu?: string; resume: string; slug: string; categorie?: CategorieActu; }
```
    et `{e.description}` par `{e.resume}`.
  - `src/pages/actualites/index.astro` : ajouter `import { aujourdhuiParis, dansLeFil } from "../../lib/agenda";` et remplacer la construction de `actus` par :

```ts
const aujourdhui = aujourdhuiParis();
const actus = entries
  .filter((e) => dansLeFil(e.data, e.body, aujourdhui))
  .map((e) => ({ ...e.data, slug: e.id }))
  .sort((a, b) => b.date.getTime() - a.date.getTime());
```
  - `src/pages/infos-pratiques/calendrier.astro` : remplacer le chargement et la construction de `events` et `prochains` par :

```ts
import { aujourdhuiParis, estAVenir, finDe, jourMural } from "../../lib/agenda";

const actualites = await getCollection("actualites");
const B = import.meta.env.BASE_URL.replace(/\/$/, "");
type Ev = { titre: string; debut: string; fin: string; type: "evenement" | "actualite" | "resultat"; lieu: string | null; href: string | null };
const aujourdhui = aujourdhuiParis();

// Couleurs : rouge = à venir, vert = compétition passée, bleu = autre fiche passée.
const events: Ev[] = actualites
  .map((e) => ({
    titre: e.data.titre,
    debut: jourMural(e.data.date),
    fin: jourMural(finDe(e.data)),
    type: estAVenir(e.data, aujourdhui) ? ("evenement" as const)
      : e.data.categorie === "competition" ? ("resultat" as const) : ("actualite" as const),
    lieu: e.data.lieu ?? null,
    href: `${B}/actualites/${e.id}`,
  }))
  .sort((a, b) => a.debut.localeCompare(b.debut));

const prochains = actualites
  .filter((e) => estAVenir(e.data, aujourdhui))
  .map((e) => ({
    titre: e.data.titre,
    debut: jourMural(e.data.date),
    fin: jourMural(finDe(e.data)),
    lieu: e.data.lieu ?? null,
    description: e.data.resume,
    lien: `${B}/actualites/${e.id}`,
  }))
  .sort((a, b) => a.debut.localeCompare(b.debut))
  .slice(0, 8);
```
    (supprimer l'ancienne fonction locale `isoParis`, la constante `aujourdhui` et l'ancien `B` en doublon ; dans le rendu des prochains, retirer `target="_blank" rel="noopener noreferrer"` du lien et remplacer son texte par `Voir le rendez-vous →` ; dans la légende, `Événement` devient `À venir`.)

- [ ] **Step 5: Vérifier** — `npx vitest run` (0), `npx astro check` (0 erreur), `npm run build` (0) ; `ls dist/actualites/apero-after-row-l-aperow/index.html`.

- [ ] **Step 6: Commit** (après validation de la correspondance des univers par le propriétaire)

```bash
git add -A src/content src/content.config.ts public/admin/config.yml src/pages src/components/SectionEvenements.astro tests
git commit -m "Fait des événements des fiches de la collection actualités"
```

---

### Task 4: Cartes de l'accueil et masquage des rendez-vous passés

**Files:**
- Create: `src/scripts/masquer-passes.ts`
- Modify: `src/components/SectionEvenements.astro`, `tests/components/SectionEvenements.test.ts`

**Interfaces:**
- Consumes: `plageDates`, `heureDe`, `jourMural`, `finDe` (tâche 1) ; `LIBELLES_CATEGORIE_ACTU`.
- Produces: script client « éléments `[data-fin]` dont la date est dépassée → `hidden` ; si un conteneur `[data-a-venir]` n'a plus d'enfant visible, son `[data-a-venir-vide]` est affiché ».

- [ ] **Step 1: Tests qui échouent** — remplacer `tests/components/SectionEvenements.test.ts` par :

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionEvenements from '../../src/components/SectionEvenements.astro';

const fermeture = {
  titre: 'Fermeture de fin d\'année', date: new Date('2026-12-20T00:00:00Z'), dateFin: new Date('2027-01-03T00:00:00Z'),
  resume: 'Club fermé', slug: 'fermeture-fin-annee', categorie: 'club' as const,
};
const aperow = { titre: 'Apérow', date: new Date('2026-11-14T19:00:00Z'), lieu: 'Au Huit', resume: 'Tous bienvenus', slug: 'aperow' };

test('chaque rendez-vous est une carte cliquable vers sa fiche, avec plage, heure, lieu et univers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, { props: { evenements: [fermeture, aperow] } });
  expect(html).toContain('href="/actualites/fermeture-fin-annee"');
  expect(html).toContain('20 décembre 2026 – 3 janvier 2027');
  expect(html).toContain('Vie du club');
  expect(html).toContain('14 novembre 2026 · 19 h');
  expect(html).toContain('Au Huit');
  expect(html).toContain('data-fin="2027-01-03"');
  expect(html).toContain('id="evenements"');
});

test('renvoie vers l\'agenda, qu\'il y ait des rendez-vous ou non', async () => {
  const container = await AstroContainer.create();
  for (const evenements of [[], [aperow]]) {
    const html = await container.renderToString(SectionEvenements, { props: { evenements } });
    expect(html).toContain('href="/agenda/"');
    expect(html).toContain('Voir tout l\'agenda');
  }
});

test('sans rendez-vous : message et lien vers l\'agenda', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, { props: { evenements: [] } });
  expect(html).toContain('Aucun rendez-vous annoncé pour le moment');
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run tests/components/SectionEvenements.test.ts` → FAIL.

- [ ] **Step 3: Implémenter** — `src/scripts/masquer-passes.ts` :

```ts
// Le site est statique : une fiche peut être passée depuis la dernière
// compilation (nocturne). On masque ce qui est dépassé, au jour près, à Paris.
const aujourdhui = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

document.querySelectorAll<HTMLElement>("[data-fin]").forEach((el) => {
  if ((el.dataset.fin ?? "") < aujourdhui) el.hidden = true;
});
document.querySelectorAll<HTMLElement>("[data-a-venir]").forEach((bloc) => {
  const restants = [...bloc.querySelectorAll<HTMLElement>("[data-fin]")].filter((el) => !el.hidden);
  if (restants.length > 0) return;
  bloc.hidden = true;
  const vide = bloc.parentElement?.querySelector<HTMLElement>("[data-a-venir-vide]");
  if (vide) vide.hidden = false;
});
```

`src/components/SectionEvenements.astro` (complet) :

```astro
---
import type { CategorieActu } from "../lib/categories-actus";
import { LIBELLES_CATEGORIE_ACTU } from "../lib/categories-actus";
import { finDe, heureDe, jourMural, plageDates } from "../lib/agenda";

interface Evenement { titre: string; date: Date; dateFin?: Date; lieu?: string; resume: string; slug: string; categorie?: CategorieActu; }
interface Props { evenements: Evenement[]; }
const { evenements } = Astro.props;
const quand = (e: Evenement) => {
  const h = heureDe(e.date);
  return h ? `${plageDates(e.date, e.dateFin)} · ${h}` : plageDates(e.date, e.dateFin);
};
---
<section id="evenements" class="evt">
  <div class="wrap">
    <div class="evt__head">
      <h2 class="evt__h">Événements à venir</h2>
      <a class="evt__all" href="/agenda/">Voir tout l'agenda →</a>
    </div>
    {evenements.length > 0 && (
      <div class="evt__grid" data-a-venir>
        {evenements.map((e) => (
          <a class="evt__card" href={`/actualites/${e.slug}`} data-fin={jourMural(finDe(e))}>
            <div class="evt__meta">
              <time class="evt__date" datetime={jourMural(e.date)}>{quand(e)}</time>
              {e.categorie && <span class={`badge badge--${e.categorie}`}>{LIBELLES_CATEGORIE_ACTU[e.categorie]}</span>}
            </div>
            <h3 class="evt__title">{e.titre}</h3>
            {e.lieu && <p class="evt__lieu">📍 {e.lieu}</p>}
            <p class="evt__desc">{e.resume}</p>
          </a>
        ))}
      </div>
    )}
    <p class="evt__vide" data-a-venir-vide hidden={evenements.length > 0}>
      Aucun rendez-vous annoncé pour le moment. <a href="/agenda/">Consulter l'agenda</a>.
    </p>
  </div>
</section>
<script>
  import "../scripts/masquer-passes";
</script>
<style>
  .evt { padding-block: 3.5rem; }
  .evt__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; margin-bottom: 1.8rem; gap: 0.4rem 1rem; }
  .evt__h { font-size: clamp(1.6rem, 3.5vw, 2.4rem); }
  .evt__all { font-weight: 700; color: var(--rouge); font-size: 0.9rem; }
  .evt__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.2rem; }
  .evt__card { display: block; color: inherit; text-decoration: none; background: var(--blanc); border: 1px solid var(--gris-bord); border-left: 4px solid var(--rouge); border-radius: var(--radius); padding: 1.3rem; transition: box-shadow .2s, transform .2s; }
  .evt__card:hover, .evt__card:focus-visible { box-shadow: 0 6px 18px rgba(0,0,0,.08); transform: translateY(-2px); }
  .evt__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.6rem; }
  .evt__date { font-weight: 700; color: var(--rouge); font-size: 0.85rem; text-transform: uppercase; }
  .evt__title { font-size: 1.2rem; margin: 0.4rem 0 0.3rem; }
  .evt__lieu { font-size: 0.85rem; color: var(--muted); margin-bottom: 0.5rem; }
  .evt__desc { font-size: 0.92rem; color: var(--texte); }
  .evt__vide { color: var(--muted); }
</style>
```

Les classes `badge badge--<univers>` existent déjà dans `SectionActus.astro` (styles scopés) : copier ses règles `.badge` et `.badge--*` dans ce `<style>` (même apparence que les actus).

- [ ] **Step 4: Vérifier** — `npx vitest run` (0) ; `npm run build` (0).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/masquer-passes.ts src/components/SectionEvenements.astro tests/components/SectionEvenements.test.ts
git commit -m "Rend cliquables les rendez-vous de l'accueil et masque ceux qui sont passés"
```

---

### Task 5: Page de fiche à trois états

**Files:**
- Modify: `src/pages/actualites/[slug].astro`, `package.json` (+ `@astrojs/markdown-remark`)
- Test: `tests/pages/actualites-slug.test.ts`

**Interfaces:**
- Consumes: `aujourdhuiParis`, `estAVenir`, `plageDates`, `heureDe` (tâche 1).

- [ ] **Step 1: Tests qui échouent** — dans `tests/pages/actualites-slug.test.ts`, le composant factice `Content` (`tests/fixtures/FakeContent.astro`) écrit « adhérents actifs ». Ajouter `body: 'Récit'` à l'`entry` du test existant (une actu racontée affiche son contenu), puis ajouter :

```ts
const rendre = async (entry: object) => (await AstroContainer.create()).renderToString(ActualiteDetail, { props: { entry } });

test('fiche à venir : statut, plage et heure, lieu, présentation, bouton d\'inscription', async () => {
  const html = await rendre({ id: 'aperow', body: '', data: {
    titre: 'Apérow', date: new Date('2099-11-14T19:00:00Z'), resume: 'Tous', lieu: 'Au Huit',
    presentation: '**Programme** du soir', lien: 'https://exemple.fr/inscription',
  } });
  expect(html).toContain('À venir');
  expect(html).toContain('14 novembre 2099 · 19 h');
  expect(html).toContain('Au Huit');
  expect(html).toContain('<strong>Programme</strong>');
  expect(html).toContain('href="https://exemple.fr/inscription"');
  expect(html).not.toContain('a eu lieu');
  expect(html).not.toContain('adhérents actifs');
});

test('fiche passée sans compte rendu : « a eu lieu », présentation, plus de bouton', async () => {
  const html = await rendre({ id: 'aperow', body: '', data: {
    titre: 'Apérow', date: new Date('2026-01-10T19:00:00Z'), resume: 'Tous',
    presentation: 'Programme du soir', lien: 'https://exemple.fr/inscription',
  } });
  expect(html).toContain('Ce rendez-vous a eu lieu le 10 janvier 2026');
  expect(html).toContain('Programme du soir');
  expect(html).not.toContain('href="https://exemple.fr/inscription"');
  expect(html).not.toContain('À venir');
});

test('fiche passée avec compte rendu : le récit remplace la présentation', async () => {
  const html = await rendre({ id: 'aperow', body: 'Récit', data: {
    titre: 'Apérow', date: new Date('2026-01-10T19:00:00Z'), resume: 'Tous', presentation: 'Programme du soir',
  } });
  expect(html).toContain('adhérents actifs');
  expect(html).not.toContain('Programme du soir');
  expect(html).not.toContain('À venir');
  expect(html).not.toContain('a eu lieu');
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run tests/pages/actualites-slug.test.ts` → les 3 nouveaux cas FAIL (le test existant passe toujours).

- [ ] **Step 3: Implémenter** — `npm install @astrojs/markdown-remark@^6` (déjà présent par Astro, on le rend explicite), puis dans `src/pages/actualites/[slug].astro` :

```astro
---
import { getCollection, render } from "astro:content";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import PageLayout from "../../layouts/PageLayout.astro";
import Carousel from "../../components/Carousel.astro";
import Videos from "../../components/Videos.astro";
import { LIBELLES_CATEGORIE_ACTU } from "../../lib/categories-actus";
import { aujourdhuiParis, estAVenir, heureDe, plageDates } from "../../lib/agenda";

export async function getStaticPaths() {
  const entries = await getCollection("actualites");
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const { titre, date, dateFin, image, resume, categorie, lieu, presentation, lien } = entry.data;
const photos = entry.data.photos ?? (image ? [image] : []);

const aVenir = estAVenir(entry.data, aujourdhuiParis());
const compteRendu = (entry.body ?? "").trim() !== "";
const plage = plageDates(date, dateFin);
const heure = heureDe(date);
const quand = heure ? `${plage} · ${heure}` : plage;
const presentationHtml = presentation && (aVenir || !compteRendu)
  ? (await (await createMarkdownProcessor()).render(presentation)).code
  : "";

const section = categorie ? `Actualités · ${LIBELLES_CATEGORIE_ACTU[categorie]}` : "Actualités";
---
<PageLayout titre={titre} section={section} chapo={quand} description={resume}>
  {aVenir && <p class="fiche__statut">À venir</p>}
  {!aVenir && !compteRendu && <p class="fiche__statut fiche__statut--passe">Ce rendez-vous a eu lieu le {plage}.</p>}
  {lieu && <p class="fiche__lieu">📍 {lieu}</p>}
  {photos.length > 0 && !aVenir && (
    <div class="article__carousel">
      <Carousel photos={photos} alt={titre} ratio="16 / 9" />
    </div>
  )}
  {presentationHtml && <div class="fiche__presentation" set:html={presentationHtml} />}
  {aVenir && lien && <p><a class="btn fiche__lien" href={lien} target="_blank" rel="noopener">S'inscrire / en savoir plus</a></p>}
  {compteRendu && !aVenir && <Videos videos={entry.data.videos} />}
  {compteRendu && !aVenir && <Content />}
</PageLayout>
<style>
  .article__carousel { margin-bottom: 1.5rem; }
  .fiche__statut { display: inline-block; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--blanc); background: var(--rouge); border-radius: 999px; padding: 0.25rem 0.8rem; margin-bottom: 1rem; }
  .fiche__statut--passe { background: var(--muted); text-transform: none; letter-spacing: 0; }
  .fiche__lieu { color: var(--muted); margin-bottom: 1rem; }
  .fiche__lien { margin-top: 0.5rem; }
</style>
```

Écart assumé à la spec (calendrier « couleur par univers ») : voir la tâche 3, le calendrier garde ses trois couleurs (à venir / compétition passée / autre passée), qui disent l'essentiel avec moins de changements.

Note : une fiche à venir qui a déjà des photos ne les affiche pas encore (le carrousel est réservé au compte rendu) ; l'image principale reste utilisée par les cartes et le partage.

- [ ] **Step 4: Vérifier** — `npx vitest run` (0) ; `npm run build` (0) ; `npx astro check` (0 erreur).

- [ ] **Step 5: Commit**

```bash
git add src/pages/actualites/[slug].astro package.json package-lock.json tests/pages/actualites-slug.test.ts
git commit -m "Affiche une fiche selon qu'elle est à venir, passée ou racontée"
```

---

### Task 6: Flux d'abonnement `.ics`

**Files:**
- Create: `src/lib/ics.ts`, `src/pages/agenda/[canal].ics.ts`, `tests/lib/ics.test.ts`

**Interfaces:**
- Consumes: `finDe`, `jourMural`, `heureDe` (tâche 1) ; `CATEGORIES_ACTU`, `LIBELLES_CATEGORIE_ACTU`.
- Produces: `type Canal = "tout" | CategorieActu` ; `CANAUX: { valeur: Canal; libelle: string }[]` ; `interface FicheIcs { slug: string; titre: string; date: Date; dateFin?: Date; lieu?: string; resume: string; categorie?: CategorieActu }` ; `plier(ligne: string): string` ; `echapper(texte: string): string` ; `genererIcs(fiches: FicheIcs[], o: { canal: Canal; site: string; maintenant: Date }): string`.

- [ ] **Step 1: Tests qui échouent** — `tests/lib/ics.test.ts` :

```ts
import { describe, expect, test } from 'vitest';
import { CANAUX, echapper, genererIcs, plier, type FicheIcs } from '../../src/lib/ics';

const maintenant = new Date('2026-10-30T10:00:00Z');
const site = 'https://www.cnfrance.fr';
const fiches: FicheIcs[] = [
  { slug: 'aperow', titre: 'Apérow', date: new Date('2026-11-14T19:00:00Z'), lieu: 'Au Huit', resume: 'Tous, bienvenus; venez', categorie: 'club' },
  { slug: 'fermeture', titre: 'Fermeture', date: new Date('2026-12-20T00:00:00Z'), dateFin: new Date('2027-01-03T00:00:00Z'), resume: 'Club fermé', categorie: 'club' },
  { slug: 'defi', titre: 'Défi', date: new Date('2026-11-21T00:00:00Z'), resume: 'Régate', categorie: 'competition' },
  { slug: 'sans-univers', titre: 'Sans univers', date: new Date('2026-11-22T00:00:00Z'), resume: 'x' },
  { slug: 'ancien', titre: 'Ancien', date: new Date('2026-07-01T00:00:00Z'), resume: 'x', categorie: 'club' },
];
const lignes = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('format', () => {
  test('échappe antislash, point-virgule, virgule et retours à la ligne', () => {
    expect(echapper('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
  test('replie à 75 octets sans couper un caractère UTF-8', () => {
    const plie = plier(`SUMMARY:${'é'.repeat(60)}`);
    for (const l of plie.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(plie.replace(/\r\n /g, '')).toBe(`SUMMARY:${'é'.repeat(60)}`);
  });
});

describe('genererIcs', () => {
  const club = genererIcs(fiches, { canal: 'club', site, maintenant });
  test('enveloppe et nom du calendrier, CRLF', () => {
    expect(club.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(club.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lignes(club)).toContain('X-WR-CALNAME:CNF — Vie du club');
    expect(club).toContain('BEGIN:VTIMEZONE');
  });
  test('rendez-vous avec heure : heure de Paris, 2 h', () => {
    const l = lignes(club);
    expect(l).toContain('DTSTART;TZID=Europe/Paris:20261114T190000');
    expect(l).toContain('DTEND;TZID=Europe/Paris:20261114T210000');
    expect(l).toContain('LOCATION:Au Huit');
    expect(l).toContain('DESCRIPTION:Tous\\, bienvenus\\; venez\\n\\nhttps://www.cnfrance.fr/actualites/aperow/');
    expect(l).toContain('UID:aperow@cnfrance.fr');
    expect(l).toContain('URL:https://www.cnfrance.fr/actualites/aperow/');
  });
  test('plusieurs jours : journées entières, fin exclusive', () => {
    const l = lignes(club);
    expect(l).toContain('DTSTART;VALUE=DATE:20261220');
    expect(l).toContain('DTEND;VALUE=DATE:20270104');
  });
  test('canal : seulement son univers ; tout : y compris sans univers', () => {
    expect(club).not.toContain('SUMMARY:Défi');
    const tout = genererIcs(fiches, { canal: 'tout', site, maintenant });
    expect(tout).toContain('SUMMARY:Défi');
    expect(tout).toContain('SUMMARY:Sans univers');
    expect(lignes(tout)).toContain('X-WR-CALNAME:CNF — Tout le club');
  });
  test('fenêtre : à venir et 90 derniers jours', () => {
    expect(club).not.toContain('SUMMARY:Ancien'); // 1er juillet : plus de 90 jours
    const recent = genererIcs([{ ...fiches[4], date: new Date('2026-09-01T00:00:00Z') }], { canal: 'club', site, maintenant });
    expect(recent).toContain('SUMMARY:Ancien');
  });
  test('les canaux couvrent tout et chaque univers', () => {
    expect(CANAUX.map((c) => c.valeur)).toEqual(['tout', 'competition', 'loisir', 'club']);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run tests/lib/ics.test.ts` → FAIL (module introuvable).

- [ ] **Step 3: Implémenter** — `src/lib/ics.ts` :

```ts
// Flux iCalendar (RFC 5545) des fiches, un par canal (voir la spec du
// 2026-10-30). Fonctions pures : la route statique ne fait que les appeler.
import { CATEGORIES_ACTU, LIBELLES_CATEGORIE_ACTU, type CategorieActu } from "./categories-actus";
import { finDe, heureDe, jourMural } from "./agenda";

export type Canal = "tout" | CategorieActu;
export const CANAUX: { valeur: Canal; libelle: string }[] = [
  { valeur: "tout", libelle: "Tout le club" },
  ...CATEGORIES_ACTU.map((c) => ({ valeur: c as Canal, libelle: LIBELLES_CATEGORIE_ACTU[c] })),
];

export interface FicheIcs {
  slug: string;
  titre: string;
  date: Date;
  dateFin?: Date;
  lieu?: string;
  resume: string;
  categorie?: CategorieActu;
}

const FENETRE_JOURS = 90;
const DUREE_MS = 2 * 3600 * 1000;

export function echapper(texte: string): string {
  return texte.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Replie une ligne à 75 octets (continuation : CRLF + espace), sans couper un caractère. */
export function plier(ligne: string): string {
  const enc = new TextEncoder();
  const morceaux: string[] = [];
  let courant = "";
  let taille = 0;
  for (const c of ligne) {
    const n = enc.encode(c).length;
    if (taille + n > 75) {
      morceaux.push(courant);
      courant = ` ${c}`;
      taille = 1 + n;
    } else {
      courant += c;
      taille += n;
    }
  }
  morceaux.push(courant);
  return morceaux.join("\r\n");
}

const jourIcs = (d: Date) => jourMural(d).replace(/-/g, "");
const heureIcs = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, "");
const lendemain = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));

const VTIMEZONE = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

export function genererIcs(fiches: FicheIcs[], o: { canal: Canal; site: string; maintenant: Date }): string {
  const libelle = CANAUX.find((c) => c.valeur === o.canal)?.libelle ?? o.canal;
  const limite = jourMural(new Date(o.maintenant.getTime() - FENETRE_JOURS * 86400000));
  const stamp = `${o.maintenant.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
  const site = o.site.replace(/\/$/, "");

  const lignes = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cercle Nautique de France//Agenda//FR",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:CNF — ${libelle}`, "X-WR-TIMEZONE:Europe/Paris",
    ...VTIMEZONE,
  ];
  const retenues = fiches
    .filter((f) => o.canal === "tout" || f.categorie === o.canal)
    .filter((f) => jourMural(finDe(f)) >= limite)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const f of retenues) {
    const url = `${site}/actualites/${f.slug}/`;
    const fin = finDe(f);
    const dates = heureDe(f.date)
      ? [
          `DTSTART;TZID=Europe/Paris:${heureIcs(f.date)}`,
          `DTEND;TZID=Europe/Paris:${heureIcs(f.dateFin && f.dateFin > f.date ? f.dateFin : new Date(f.date.getTime() + DUREE_MS))}`,
        ]
      : [`DTSTART;VALUE=DATE:${jourIcs(f.date)}`, `DTEND;VALUE=DATE:${jourIcs(lendemain(fin))}`];
    lignes.push(
      "BEGIN:VEVENT",
      `UID:${f.slug}@cnfrance.fr`,
      `DTSTAMP:${stamp}`,
      ...dates,
      `SUMMARY:${echapper(f.titre)}`,
      ...(f.lieu ? [`LOCATION:${echapper(f.lieu)}`] : []),
      `DESCRIPTION:${echapper(`${f.resume}\n\n${url}`)}`,
      `URL:${url}`,
      "END:VEVENT",
    );
  }
  lignes.push("END:VCALENDAR");
  return lignes.map(plier).join("\r\n") + "\r\n";
}
```

`src/pages/agenda/[canal].ics.ts` :

```ts
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { CANAUX, genererIcs, type Canal } from "../../lib/ics";

export const getStaticPaths = (() => CANAUX.map((c) => ({ params: { canal: c.valeur } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const fiches = (await getCollection("actualites")).map((e) => ({
    slug: e.id, titre: e.data.titre, date: e.data.date, dateFin: e.data.dateFin,
    lieu: e.data.lieu, resume: e.data.resume, categorie: e.data.categorie,
  }));
  const ics = genererIcs(fiches, {
    canal: params.canal as Canal,
    site: (site ?? new URL("https://www.cnfrance.fr")).toString(),
    maintenant: new Date(),
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
```

- [ ] **Step 4: Vérifier** — `npx vitest run` (0) ; `npm run build` (0) ; `ls dist/agenda/{tout,competition,loisir,club}.ics` ; `head -c 300 dist/agenda/club.ics | od -c | head -3` montre des `\r \n`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics.ts src/pages/agenda/[canal].ics.ts tests/lib/ics.test.ts
git commit -m "Publie l'agenda du club en flux iCalendar par univers"
```

---

### Task 7: Page Agenda, abonnement et menu

**Files:**
- Create: `src/pages/agenda/index.astro`, `tests/pages/agenda-index.test.ts`
- Modify: `src/components/Nav.astro`, `tests/components/Nav.test.ts`

**Interfaces:**
- Consumes: tâches 1, 4 (script `masquer-passes`), 6 (`CANAUX`).

- [ ] **Step 1: Tests qui échouent** — `tests/pages/agenda-index.test.ts` (même mock que `tests/pages/index.test.ts`, branche `actualites` seulement) :

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Agenda from '../../src/pages/agenda/index.astro';

vi.mock('astro:content', async () => ({
  getCollection: async (name: string) => name === 'actualites' ? [
    { id: 'aperow', body: '', data: { titre: 'Apérow', date: new Date('2099-11-14T19:00:00Z'), resume: 'Tous', lieu: 'Au Huit', categorie: 'club' } },
    { id: 'defi', body: '', data: { titre: 'Défi', date: new Date('2099-12-05T00:00:00Z'), resume: 'Régate', categorie: 'competition' } },
    { id: 'passe', body: 'Récit', data: { titre: 'Passé', date: new Date('2020-01-01T00:00:00Z'), resume: 'x' } },
  ] : [],
}));

test('liste les rendez-vous à venir par mois, avec lien vers la fiche', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Agenda);
  expect(html).toContain('Novembre 2099');
  expect(html).toContain('Décembre 2099');
  expect(html).toContain('href="/actualites/aperow"');
  expect(html).toContain('14 novembre 2099 · 19 h');
  expect(html).not.toContain('Passé');
});

test('propose l\'abonnement par canal : liste déroulante, agenda du téléphone, Google, copie', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Agenda);
  for (const v of ['tout', 'competition', 'loisir', 'club']) expect(html).toContain(`value="${v}"`);
  expect(html).toContain('webcal://www.cnfrance.fr/agenda/tout.ics');
  expect(html).toContain('https://calendar.google.com/calendar/r?cid=');
  expect(html).toContain('Copier le lien');
});
```

`tests/components/Nav.test.ts` : ajouter `'/agenda/'` à la liste des liens attendus.

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run tests/pages/agenda-index.test.ts tests/components/Nav.test.ts` → FAIL.

- [ ] **Step 3: Implémenter** — `src/pages/agenda/index.astro` :

```astro
---
import { getCollection } from "astro:content";
import PageLayout from "../../layouts/PageLayout.astro";
import { LIBELLES_CATEGORIE_ACTU } from "../../lib/categories-actus";
import { aujourdhuiParis, estAVenir, finDe, heureDe, jourMural, plageDates } from "../../lib/agenda";
import { CANAUX } from "../../lib/ics";

const aujourdhui = aujourdhuiParis();
const fiches = (await getCollection("actualites"))
  .filter((e) => estAVenir(e.data, aujourdhui))
  .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const parMois = new Map<string, typeof fiches>();
for (const f of fiches) {
  const cle = MOIS.format(f.data.date).replace(/^./, (c) => c.toUpperCase());
  parMois.set(cle, [...(parMois.get(cle) ?? []), f]);
}
const presentes = CANAUX.filter((c) => c.valeur !== "tout" && fiches.some((f) => f.data.categorie === c.valeur));

const hote = (Astro.site ?? new URL("https://www.cnfrance.fr")).host;
const webcal = (canal: string) => `webcal://${hote}/agenda/${canal}.ics`;
const google = (canal: string) => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal(canal))}`;
const quand = (d: Date, fin?: Date) => { const h = heureDe(d); return h ? `${plageDates(d, fin)} · ${h}` : plageDates(d, fin); };
---
<PageLayout titre="Agenda" section="Infos pratiques" chapo="Tous les rendez-vous à venir du club : compétitions, randonnées et vie du club.">
  <section class="abo" aria-labelledby="abo-titre" data-abo data-hote={hote}>
    <h2 id="abo-titre" class="abo__h">S'abonner à l'agenda</h2>
    <p class="abo__txt">Les rendez-vous du club s'ajoutent tout seuls à votre agenda et se mettent à jour.</p>
    <div class="abo__ligne">
      <label for="abo-canal">Canal</label>
      <select id="abo-canal" data-abo-canal>
        {CANAUX.map((c) => <option value={c.valeur}>{c.libelle}</option>)}
      </select>
    </div>
    <div class="abo__boutons">
      <a class="btn" data-abo-webcal href={webcal("tout")}>Ajouter à mon agenda</a>
      <a class="btn btn--ghost" data-abo-google href={google("tout")} target="_blank" rel="noopener">Google Agenda</a>
      <button type="button" class="btn btn--ghost" data-abo-copier>Copier le lien</button>
    </div>
  </section>

  {presentes.length > 1 && (
    <div class="filtres" role="group" aria-label="Filtrer l'agenda par univers">
      <button type="button" class="filtre is-actif" data-filtre="tout" aria-pressed="true">Tout</button>
      {presentes.map((c) => (
        <button type="button" class={`filtre filtre--${c.valeur}`} data-filtre={c.valeur} aria-pressed="false">{c.libelle}</button>
      ))}
    </div>
  )}

  <div data-a-venir>
    {[...parMois].map(([mois, liste]) => (
      <section class="mois" data-mois>
        <h2 class="mois__h">{mois}</h2>
        <ul class="mois__liste">
          {liste.map((f) => (
            <li class="rdv" data-fin={jourMural(finDe(f.data))} data-categorie={f.data.categorie ?? ""}>
              <a href={`/actualites/${f.id}`} class="rdv__lien">
                <span class="rdv__quand">{quand(f.data.date, f.data.dateFin)}</span>
                <span class="rdv__titre">{f.data.titre}</span>
                {f.data.lieu && <span class="rdv__lieu">📍 {f.data.lieu}</span>}
                <span class="rdv__resume">{f.data.resume}</span>
                {f.data.categorie && <span class={`badge badge--${f.data.categorie}`}>{LIBELLES_CATEGORIE_ACTU[f.data.categorie]}</span>}
              </a>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
  <p class="vide" data-a-venir-vide hidden={fiches.length > 0}>
    Aucun rendez-vous annoncé pour le moment. Le <a href="/infos-pratiques/calendrier">calendrier</a> retrace les rendez-vous passés.
  </p>
</PageLayout>
<script>
  import "../../scripts/masquer-passes";

  const abo = document.querySelector<HTMLElement>("[data-abo]");
  if (abo) {
    const hote = abo.dataset.hote ?? "www.cnfrance.fr";
    const canal = abo.querySelector<HTMLSelectElement>("[data-abo-canal]")!;
    const webcal = abo.querySelector<HTMLAnchorElement>("[data-abo-webcal]")!;
    const google = abo.querySelector<HTMLAnchorElement>("[data-abo-google]")!;
    const copier = abo.querySelector<HTMLButtonElement>("[data-abo-copier]")!;
    const url = () => `webcal://${hote}/agenda/${canal.value}.ics`;
    canal.addEventListener("change", () => {
      webcal.href = url();
      google.href = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url())}`;
    });
    copier.addEventListener("click", async () => {
      const lien = url().replace(/^webcal:/, "https:");
      try {
        await navigator.clipboard.writeText(lien);
        copier.textContent = "Lien copié ✓";
      } catch {
        window.prompt("Copiez ce lien :", lien);
      }
    });
  }

  // Filtre par univers (même principe que la liste des actualités).
  const boutons = [...document.querySelectorAll<HTMLButtonElement>("[data-filtre]")];
  for (const b of boutons) {
    b.addEventListener("click", () => {
      const choix = b.dataset.filtre ?? "tout";
      document.querySelectorAll<HTMLElement>(".rdv").forEach((r) => {
        const passe = (r.dataset.fin ?? "") < new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        r.hidden = passe || (choix !== "tout" && r.dataset.categorie !== choix);
      });
      document.querySelectorAll<HTMLElement>("[data-mois]").forEach((m) => {
        m.hidden = [...m.querySelectorAll<HTMLElement>(".rdv")].every((r) => r.hidden);
      });
      boutons.forEach((x) => { x.classList.toggle("is-actif", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    });
  }
</script>
<style>
  .abo { background: var(--blanc); border: 1px solid var(--gris-bord); border-radius: var(--radius); padding: 1.3rem; margin-bottom: 2rem; }
  .abo__h { font-size: 1.25rem; margin: 0 0 0.3rem; }
  .abo__txt { color: var(--muted); margin-bottom: 0.9rem; }
  .abo__ligne { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.9rem; }
  .abo__ligne select { font: inherit; padding: 0.4rem 0.6rem; border-radius: 8px; border: 1px solid var(--gris-bord); }
  .abo__boutons { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .mois__h { font-size: 1.3rem; margin: 1.8rem 0 0.8rem; }
  .mois__liste { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.8rem; }
  .rdv__lien { display: grid; gap: 0.25rem; padding: 1rem 1.2rem; background: var(--blanc); border: 1px solid var(--gris-bord); border-left: 4px solid var(--rouge); border-radius: var(--radius); color: inherit; text-decoration: none; }
  .rdv__lien:hover, .rdv__lien:focus-visible { box-shadow: 0 6px 18px rgba(0,0,0,.08); }
  .rdv__quand { font-weight: 700; color: var(--rouge); font-size: 0.85rem; text-transform: uppercase; }
  .rdv__titre { font-weight: 700; font-size: 1.1rem; }
  .rdv__lieu, .rdv__resume { font-size: 0.92rem; color: var(--muted); }
  .vide { color: var(--muted); }
</style>
```

Copier dans ce `<style>` les règles `.filtres`, `.filtre*` de `src/pages/actualites/index.astro` et `.badge*` de `src/components/SectionActus.astro` (styles scopés) ; si la classe `btn--ghost` n'existe pas dans `src/styles/global.css` (`grep -n "btn--ghost" src/styles/global.css`), l'y ajouter : `.btn--ghost { background: transparent; color: var(--rouge); border: 2px solid var(--rouge); }`.

`src/components/Nav.astro`, rubrique *Infos Pratiques* : juste avant `{ label: "Calendrier", href: "/infos-pratiques/calendrier" },`, ajouter `{ label: "Agenda", href: "/agenda/" },`.

- [ ] **Step 4: Vérifier** — `npx vitest run` (0) ; `npm run build` (0) ; `npx astro check` (0 erreur).

- [ ] **Step 5: Commit**

```bash
git add src/pages/agenda/index.astro src/components/Nav.astro src/styles/global.css tests/pages/agenda-index.test.ts tests/components/Nav.test.ts
git commit -m "Ajoute la page Agenda avec abonnement par univers"
```

---

### Task 8: Recompilation nocturne et vérification de bout en bout

**Files:**
- Modify: `.github/workflows/pages.yml`

- [ ] **Step 1: Planifier** — dans `pages.yml`, bloc `on:` :

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
  # Chaque nuit : les rendez-vous passés sortent des « à venir » et de
  # l'agenda, sans attendre une modification du site.
  schedule:
    - cron: "15 2 * * *"
```

Vérifier : `ruby -ryaml -e 'puts YAML.load_file(".github/workflows/pages.yml")[true].keys'` → `push`, `workflow_dispatch`, `schedule` (la clé `on` est lue `true` par YAML 1.1).

- [ ] **Step 2: Vérification navigateur (preview locale, Chrome headless)** — `npm run build && npx astro preview` puis contrôler :
  - accueil : cartes « Événements à venir » cliquables (ou message vide + lien agenda), lien « Voir tout l'agenda » ;
  - une fiche migrée passée sans compte rendu (`/actualites/apero-after-row-l-aperow/`) : « Ce rendez-vous a eu lieu le 27 octobre 2026 » ;
  - `/actualites/` : l'Apérow n'y figure pas ;
  - `/agenda/` : changer le canal met à jour les deux liens ; le filtre masque les autres univers ;
  - créer temporairement (non commité) une fiche à venir avec heure, présentation et lien : page « À venir », bouton d'inscription ; carte sur l'accueil et l'agenda ; présente dans `dist/agenda/tout.ics` avec `DTSTART;TZID=Europe/Paris:…T190000`. Supprimer la fiche ensuite.

- [ ] **Step 3: Valider un flux** — importer `dist/agenda/tout.ics` (avec la fiche temporaire) dans un validateur iCalendar en ligne ou dans l'app Calendrier macOS (`open dist/agenda/tout.ics`, puis annuler l'import) : aucun avertissement, l'heure affichée est 19 h.

- [ ] **Step 4: Commit et publication**

```bash
git add .github/workflows/pages.yml
git commit -m "Recompile le site chaque nuit pour faire basculer les rendez-vous passés"
```
Puis : `git fetch`, intégrer `origin/main` si besoin, `npx vitest run` et `npm run build` (codes de sortie 0), `git push origin main` ; attendre la publication (`gh run watch … --exit-status`) et vérifier en production `/agenda/`, `/agenda/tout.ics` (`Content-Type: text/calendar`) et l'accueil.
