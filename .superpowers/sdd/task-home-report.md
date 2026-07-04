# Rapport — Tâches 6 à 13 (Nav, Footer, Hero, sections, assemblage home)

## Résumé

Toutes les tâches 6 à 13 du plan `docs/superpowers/plans/2026-07-04-fondations-et-page-accueil.md` ont été exécutées en TDD, dans l'ordre, avec un commit par tâche. Le code a été recopié exactement comme fourni dans le plan (composants, tests, valeurs, classes, chemins).

Vérification finale : `npm run check` (0 erreur, 0 warning, 0 hint) + `npm test` (18/18 tests passing, 11 fichiers de test) + `npm run build` (build réussi, `dist/index.html` généré).

## Fichiers créés / modifiés

### Task 6 — Nav
- Créé `src/components/Nav.astro`
- Créé `tests/components/Nav.test.ts`

### Task 7 — Footer
- Créé `src/components/Footer.astro`
- Créé `tests/components/Footer.test.ts`

### Task 8 — Hero
- Créé `src/components/Hero.astro`
- Créé `tests/components/Hero.test.ts`
- Créé `src/assets/hero/README.md`

### Task 9 — SectionChiffres
- Créé `src/components/SectionChiffres.astro`
- Créé `tests/components/SectionChiffres.test.ts`

### Task 10 — SectionDisciplines
- Créé `src/components/SectionDisciplines.astro`
- Créé `tests/components/SectionDisciplines.test.ts`

### Task 11 — SectionEvenements + SectionActus
- Créé `src/components/SectionEvenements.astro`, `src/components/SectionActus.astro`
- Créé `tests/components/SectionEvenements.test.ts`, `tests/components/SectionActus.test.ts`

### Task 12 — SectionGalerie + SectionInfosPratiques + SectionPartenaires
- Créé `src/components/SectionGalerie.astro`, `src/components/SectionInfosPratiques.astro`, `src/components/SectionPartenaires.astro`
- Créé `tests/components/SectionPartenaires.test.ts` (seul test explicitement demandé par le plan pour cette tâche ; Galerie et InfosPratiques n'ont pas de test dédié dans le plan)

### Task 13 — Assemblage de la page d'accueil
- Modifié `src/pages/index.astro` (remplace le placeholder de la Task 1 par l'assemblage complet : BaseLayout + Nav + Hero + 6 sections + Footer, alimenté par les 4 Content Collections via `getCollection`)
- Créé `tests/pages/index.test.ts` (avec mock de `astro:content`)

## Commits (branche `build/site-cnf`)

```
4f042ef feat: composant Nav
6d2f902 feat: composant Footer
78b59d6 feat: Hero photo parallax (direction A)
af09d8f feat: section accroche + chiffres clés
11c6394 feat: section disciplines
02e03ac feat: sections événements et actualités
3fe71d3 feat: sections galerie, infos pratiques, partenaires
b88950f feat: assemblage de la page d'accueil
```

Chaque commit a été précédé d'un cycle TDD : test écrit → échec confirmé (module introuvable) → implémentation → test vert → commit.

## Résultat de la vérification finale

- `npm run check` : 27 fichiers analysés, **0 erreur, 0 warning, 0 hint**.
- `npm test` : **18/18 tests passing** sur 11 fichiers de test (7 tests des fondations + 11 nouveaux tests des tâches 6-13).
- `npm run build` : build réussi, `dist/index.html` généré contenant le hero (« portes de Paris »), toutes les ancres de section (`id="club"`, `id="disciplines"`, `id="evenements"`, `id="actus"`, `id="galerie"`, `id="infos"`, `id="partenaires"`), le contenu des chiffres/disciplines/actus/partenaires, et le footer (« Mentions légales »).

## Écart constaté (comportement attendu, pas un bug)

L'horloge système du bac à sable est réellement au **4 juillet 2026**. Le contenu de seed `src/content/evenements/41e-defi-cnf.md` (créé en Task 4, non modifié ici) a une date du **14 juin 2026**, donc déjà passée par rapport à la date système actuelle. `index.astro` filtre volontairement les événements à `date >= maintenant` (conforme à la spec Task 13 : « uniquement à venir »). Résultat : dans le build réel (non testé), la section Événements affiche le message vide « Aucun événement à venir pour le moment. Revenez bientôt ! » plutôt que le « 41ème Défi CNF ». Ce n'est pas un défaut d'implémentation — le test unitaire de la Task 13 (qui mocke la collection avec une date 2030) passe correctement et valide le bon comportement du filtre. Je signale ce point uniquement parce qu'un contrôle visuel naïf de `dist/index.html` pourrait chercher « 41ème Défi CNF » sans le trouver.

Aucun autre écart avec le plan : tout le code (structure, classes CSS, props, schémas) a été recopié à l'identique.
