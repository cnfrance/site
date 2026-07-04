# Progression du build — Site CNF

Plan : docs/superpowers/plans/2026-07-04-fondations-et-page-accueil.md
Branche : build/site-cnf
Corpus migré (contenu iso) : docs/migration/content/ (~48 pages + 50 articles ≥ sept. 2024)

## Tâches
(rien de complété pour l'instant)

## Tâches complétées
- Fondations (Plan 1 T1-5) : complete — commits f5d45d0..7349ca0, 7/7 tests, build OK, check clean. Écarts sains : vitest^3 (compat Vite6), reglages.json wrappé sous clé "reglages".
- Composants + home (Plan 1 T6-13) : complete — commits 4f042ef..b88950f, 18/18 tests, check clean, build OK. Note : événements passés masqués par filtre "à venir" (correct).
- Injection contenu iso (nouveau) : complete — commits 119ae6f, 7a887c9. reglages/partenaires réels, 34 actualités migrées (13 dates inconnues résolues), 18/18 tests, build OK.
- Pages intérieures (nouveau) : complete — commits 5a2a8a5..75a02f0. Collection pages + PageLayout + [...slug], 34 pages migrées, Nav sous-menus. 20/20 tests, build OK. TODO: footer liens /legal, sautées: info-seine/calendrier/plan-navigation.
- Actualités + Résultats (nouveau) : complete — commits ee45242..a3c21fa. Pages liste+détail, collection résultats + 16 migrés. 24/24 tests, build OK, 87 pages.
- Images + Galerie (nouveau) : complete — commits b54ecf9..0e417dd. 6 hero + 18 galerie + 4 logos, page galerie, fix footer legal. 26/26 tests, build OK, 88 pages. TODO fix: logo "Paris 1er"=Hauts-de-Seine, 4 logos sponsors 404.
- Revue finale : 0 critique, 3 importants, 11 mineurs. Fix en cours.
- Fix revue : complete — commits 4fc4655..1307e45. 3 importants + 6 mineurs corrigés. 26/26 tests, check clean, 88 pages. Mineurs reportés: M5,M6,M7,M10.
- ÉTAT : site fonctionnellement complet. Reste = déploiement (action user GitHub/Netlify).
- DÉPLOIEMENT git : poussé sur github cnfrance/site (main, commit 5736e8f), commits réécrits en jib33 <jbmessage78@gmail.com>. Auth SSH scoped projet (core.sshCommand -> id_ed25519). Netlify = action user en attente.
- PLAN 3 (admin CMS Sveltia) : en cours.
- PLAN 3 (admin CMS Sveltia) : complete — commits 3a411d8, 2b586d5, poussés sur github. /admin + config.yml (toutes collections) + docs/CMS-SETUP.md. Custom format pour partenaires (tableau nu). Auth OAuth = à activer par user (voir docs/CMS-SETUP.md). Non testé end-to-end (pas de backend live).
- ACTIONS USER EN ATTENTE : (1) connecter Netlify, (2) activer OAuth CMS, (3) fournir email+tel réels du club.
- FIX Nav (user) : complete — commits a4f126d, ddc16f8. Nav iso ancien site + fix hover (::before bridge) + 10 pages manquantes (espace-adherents, infos stubs). 26/26 tests, build OK, 98 pages.
- FIX Galerie (user) : complete — commits 9716a26, 19ebdbb, poussés. 47 images d'articles localisées, galerie légendée par événement + liens. 28/28 tests, 98 pages. Tous commits nav+galerie poussés sur origin/main (19ebdbb).
