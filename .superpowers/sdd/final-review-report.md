# Revue finale — branche `build/site-cnf` (Cercle Nautique de France, Astro 5)

Revue du CODE uniquement (contenu md/json migré et images binaires exclus). État de départ confirmé sain : 26/26 tests, `astro check` 0 erreur, build 88 pages. Les points connus (email/tel placeholders, logo Paris 1er→92, sponsors 404→fallback, pages sautées) ne sont PAS re-signalés.

Vérifications faites qui NE sont PAS des bugs (pour info) :
- `reglages.json` enveloppe tout dans une clé `reglages` : le loader `file()` en fait une entrée d'id `reglages`, dont `.data` est l'objet interne → cohérent avec `reglagesArr[0].data` et le schéma. OK.
- Route rest `[...slug]` + `entry.id` incluant le sous-dossier (`le-club/nos-valeurs`) → slugs multi-segments corrects, pas de collision avec `/actualites`, `/resultats`, `/galerie`. OK.
- Tris de dates (home events croissant filtré `>= now`, listes décroissant) corrects.
- Sous-menus Nav : accessibles au clavier en navigation séquentielle (Tab). `display:none` rend les enfants non focusables, mais focuser le lien parent (enfant de `.nav__item`) déclenche `:focus-within` → le dropdown passe en `display:flex` et les liens deviennent focusables. Le pattern fonctionne au clavier sur desktop.
- Échappement : Astro échappe les expressions et attributs (`alt={titre}` avec guillemets `"BOAT RACE"` OK).

---

## Critique
Aucun finding critique. Pas de bug bloquant runtime/build identifié.

---

## Important

### I1 — Meta description des pages de détail = une simple date
`src/pages/actualites/[slug].astro:20` et `src/pages/resultats/[slug].astro:20`
Les pages de détail appellent `<PageLayout titre=... section=... chapo={fmt.format(date)}>` sans `description`. Or `PageLayout` fait `description={description ?? chapo}` → `BaseLayout` reçoit comme meta description **la date formatée seule** (ex. « 11 avril 2026 »), aussi bien pour `<meta name="description">` que pour `og:description`. Contenu SEO/partage social sans valeur, et quasi identique d'une page à l'autre.
Correctif : passer le résumé en description. Dans `actualites/[slug].astro`, destructurer `resume` puis `description={resume}` (garder la date en `chapo`). Idem `resultats/[slug].astro` avec `description={resume}` (resume optionnel → fallback possible sur `titre`).

### I2 — Toutes les pages de contenu partagent la même meta description générique
`src/layouts/BaseLayout.astro:4` (+ `src/layouts/PageLayout.astro:14`, frontmatter des 34 pages)
Aucune des 34 pages de la collection `pages` ne définit `chapo` (vérifié : 34/34 sans `chapo:`). `[...slug].astro` ne passe donc ni `description` ni `chapo` → `BaseLayout` retombe sur la description par défaut. Résultat : les 34 pages ont **exactement la même `<meta name="description">` et le même `og:description`**. Mauvais pour le SEO d'un site vitrine (la tâche liste explicitement « description/og par page »). Le bloc `page__chapo` du PageLayout est par ailleurs mort sur toutes ces pages.
Correctif : ajouter un `chapo` (ou `description`) au frontmatter des pages migrées, ou dériver une description par défaut plus spécifique (ex. `${titre} — ${section} du Cercle Nautique de France`) dans `[...slug].astro`.

### I3 — Sous-menus de Nav inutilisables au toucher (mobile/tablette)
`src/components/Nav.astro:267-270` (+ media query `:298`)
Les dropdowns ne s'ouvrent que sur `:hover`/`:focus-within`. Sur écran tactile il n'y a pas de hover persistant, et taper le lien parent (`<a href={r.href}>`) **navigue** au lieu d'ouvrir le sous-menu. En `max-width:820px` le dropdown reste `display:none` par défaut : les liens de sous-menu ne sont donc jamais atteignables directement au doigt (seulement en atterrissant d'abord sur la page parente). Manque aussi la gestion d'état ARIA (`aria-expanded`).
Correctif : ajouter un bouton/disclosure JS (toggle `aria-expanded`) pour le tactile, ou rendre les sous-liens visibles/dépliés en layout mobile. À défaut, s'assurer que chaque page parente liste ses sous-pages en corps de page.

---

## Mineur

### M1 — Pas de `og:image` ni de canonical
`src/layouts/BaseLayout.astro:11-19` : `og:title/description/type` présents mais pas `og:image` ni `<link rel="canonical">`. Partages sociaux sans visuel. Ajouter une image OG par défaut (photo hero) et un canonical basé sur `Astro.url`/`site`.

### M2 — Token `--rouge-vif` défini mais jamais utilisé
`src/styles/tokens.css:5` : `--rouge-vif: #b01010` n'est référencé nulle part (vérifié par grep). Dead token → supprimer (YAGNI).

### M3 — `--font-titre` liste « Oswald » qui n'est jamais chargée
`src/styles/tokens.css:13` : le commentaire indique « polices système, aucune requête réseau » mais la stack commence par `"Oswald"`, absente des systèmes et sans `@font-face` → toujours fallback `Arial Narrow`. Retirer Oswald (ou l'assumer via `@font-face`) pour lever l'ambiguïté.

### M4 — Année du footer figée
`src/components/Footer.astro:2` : `const annee = 2026;` deviendra périmé. Utiliser `new Date().getFullYear()`.

### M5 — Duplication des cartes liste + styles
`src/components/SectionActus.astro:24-31`, `src/pages/actualites/index.astro:18-25`, `src/pages/resultats/index.astro:18-27` : markup de carte (time/titre/résumé) et bloc `<style>` quasi identiques triplés. Extraire un composant `CarteArticle`/`CarteResultat` mutualisé.

### M6 — Liste de photos galerie dupliquée et divergente
`src/pages/index.astro:45-54` (poolGalerie, 8 photos) vs `src/pages/galerie/index.astro:5-24` (18 photos) : deux listes codées en dur qui peuvent diverger. Centraliser dans un module partagé (`src/data/photos.ts`) importé par les deux.

### M7 — `alt` génériques et répétés sur la galerie
`src/pages/galerie/index.astro:33` et `src/components/SectionGalerie.astro:16` : 18 images avec `alt="Photo du club"` identique. Peu utile pour lecteurs d'écran. Fournir des alts descriptifs (issus du contenu) ou `alt=""` si purement décoratif.

### M8 — Alt du hero figé alors que l'image est randomisée côté client
`src/components/Hero.astro:11` + script `:121-131` : `alt="Aviron sur la Seine près de Neuilly"` reste fixe alors que le script remplace `src` par une photo aléatoire du pool → l'alt peut ne plus décrire l'image affichée. Utiliser un alt générique neutre (« Aviron au Cercle Nautique de France ») ou porter l'alt dans le pool.

### M9 — `aria-haspopup="true"` sur un lien, sans état déplié
`src/components/Nav.astro:244` : `aria-haspopup="true"` (valeur héritée = « menu ») sur un `<a>` qui n'expose pas de rôle menu ni d'`aria-expanded`. Peu impactant (menu = liens simples) mais incohérent ; soit retirer, soit accompagner d'un vrai pattern disclosure (voir I3).

### M10 — Test « smoke » sans valeur d'assertion réelle
`tests/smoke.test.ts` : vérifie seulement que `container` est défini et que `renderToString` est une fonction. N'atteste rien du produit. Conserver comme sanity check éventuellement, mais faible valeur (YAGNI).

### M11 — Décalage de date possible selon le fuseau du build
`src/components/SectionActus.astro:5`, `SectionEvenements.astro:5`, détails/listes : `z.coerce.date("2026-06-14")` → minuit UTC, puis `Intl.DateTimeFormat("fr-FR")` formate dans le fuseau système. Sur un runner à l'ouest de UTC, la date affichée peut reculer d'un jour. Netlify build en UTC → OK en pratique ; fixer `timeZone: "Europe/Paris"` sur les formatters pour être robuste.
