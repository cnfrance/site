# Rapport — Migration du contenu réel (SEED → contenu migré)

## Résumé

Remplacement du contenu SEED par le contenu réel migré depuis `docs/migration/content/` (lecture seule, non modifié). Aucun fichier `.astro`/`.ts`/test n'a été touché. Uniquement des fichiers sous `src/content/`.

## 1. src/content/site/reglages.json

- `adresse` : "Complexe sportif de l'île du pont de Neuilly, 92200 Neuilly-sur-Seine" (conforme à `infos-pratiques/nous-trouver.md`).
- `horaires` : résumé fidèle de `horaires.md` (créneaux midi/soir/week-end, mention horaires d'été vs Indoor en hiver).
- `tarifs` : résumé fidèle de `tarifs.md`, chiffres repris tels quels (290 €/525 € cotisation annuelle, 370 €/605 € total renouvellement licence FFA incluse, mention des tarifs réduits en cours de saison / familles / situations particulières). Aucun chiffre inventé.
- `email` : "contact@cnfrance.fr" conservé (placeholder assumé, l'adresse réelle est obfusquée sur le site source).
- `telephone` : "" (inconnu, non trouvé dans le contenu migré).
- `accroche` : réécrite à partir de `divers/accueil.md` et `club/notre-club-centre-nautique-de-paris.md` (fondation 1875, île de la Jatte à Neuilly, ~600 membres, cadre de verdure aux portes de Paris/La Défense).
- `chiffres` retenus (imposés par la mission, vérifiés dans le contenu source) :
  - 1875 — fondé en (cf. `notre-club-centre-nautique-de-paris.md` : "Créé en 1875")
  - 150 ans — en 2025 (mentionné explicitement dans l'article "Assemblée Générale 2025" : "2025 et l'année des 150 du club")
  - 110 — bateaux (total du tableau de `club/equipements.md` : 69 loisirs + 41 compétition = 110 ; le titre de la page dit "100 bateaux" mais le tableau totalise 110, on a retenu le total du tableau conformément à la consigne)
  - 3★ — École Française d'Aviron (label FFA "Ecole Française d'Aviron 3 étoiles" mentionné dans `notre-club-centre-nautique-de-paris.md`, décerné en 2022 avec mention "Aviron Santé")
  - Le chiffre seed "+300 adhérents" a été retiré car le contenu réel mentionne ~600 membres ; la mission demandait explicitement les 4 chiffres ci-dessus.

## 2. src/content/partenaires/partenaires.json

8 partenaires : 4 institutionnels conservés du seed (FFA, Ville de Neuilly-sur-Seine, LIFA, Mairie de Paris 1er) + 4 sponsors ajoutés depuis `partenariat/sponsor.md` (Trilogiq, HSBC, Airbus, CMCAS 92), chacun avec un champ `logo` pointant vers `https://www.cnfrance.fr/images/LOGOS/PARTENAIRES/<fichier>` (chemins relatifs trouvés dans le frontmatter `images` de sponsor.md, préfixés du domaine). Champ `id` conservé par objet (toléré par le schéma zod qui ignore les clés inconnues).

## 3. src/content/actualites/ — 34 articles migrés

Les 34 fichiers de `docs/migration/content/actualites-articles/` ont été transformés en Markdown avec frontmatter `{titre, date, resume, image?}` et corps verbatim. Le seed `randonnee-cote-bleue.md` a été supprimé (remplacé par `randonnee-de-la-cote-bleue-marseille.md`, article id 244).

Note : l'article id 231 (`231-l.md`, slug source "l" — artefact de scraping) a été renommé en `assemblee-generale-2025.md` pour un slug lisible, au lieu de suivre littéralement "le nom sans le préfixe id" qui aurait donné le fichier peu explicite `l.md`. Le titre réel ("Assemblée Générale 2025") est correctement repris dans le frontmatter.

### Résolution des dates "inconnue" (13 articles concernés)

Règle appliquée : priorité à toute date explicite trouvée dans le titre/corps de l'article (règle 2), sinon interpolation entre les dates des articles d'id immédiatement inférieur/supérieur (règle 3).

Résolues via date explicite dans le corps/titre (règle 2) :
- id 218 "JO 2024 un ans après" → 2025-07-26 (texte : "Le samedi 26 juillet 2025")
- id 220 "Forum des sports Neuilly sur Seine 2025" → 2025-09-06 (titre "2025" + texte "ce samedi 6 septembre")
- id 221 "Randonnée JURAVIRON 2025" → 2025-08-23 (titre "2025" + texte "23 Août dernier")
- id 222 "Randonnée La Bonne Mère 2025" → 2025-09-06 (texte "Le 6 septembre" + titre "2025")
- id 224 "Randonnée Lac d'Annecy 2025" → 2025-10-12 (texte : "Le dimanche 12 octobre 2025")
- id 226 "39eme Raid Jersey-Carteret 2025" → 2025-07-19 (titre "2025" + texte "Samedi 19 juillet")
- id 227 "Radonnée Iles de Lerins 2025" → 2025-10-05 (texte "le week-end du 5 octobre" + titre "2025")
- id 231 "Assemblée Générale 2025" → 2025-12-13 (texte "Le samedi 13 Décembre" + mention explicite "2025 ... année des 150")
- id 232 "Semi Marathon de Noël 2025" → 2025-12-14 (titre "2025" + "Dimanche" ; déduit comme le lendemain de l'AG du 13/12, un samedi)

Résolues par interpolation entre IDs voisins (règle 3, aucune date déductible du texte) :
- id 199 "Randonnée : la Pelle de la Dordogne" → 2025-04-05 (entre id 197 = 2025-03-02 et id 206 = 2025-05-01)
- id 215 "Championnats de France J16 et U23" → 2025-07-05 (entre id 214 = 2025-06-29 et id 218 = 2025-07-26)
- id 234 "Le CNF en Régate Internationale en Chine" → 2026-01-05 (entre id 232 = 2025-12-14 et id 235 = 2026-01-18)
- id 241 "BOAT RACE 2026" → 2026-04-11 (entre id 240 = 2026-04-04 et id 242 = 2026-04-18)

Aucune date "inconnue" ne subsiste ; toutes sont des `Date` valides acceptées par le schéma `z.coerce.date()`.

### Images

Pour chaque article, la première URL d'image du frontmatter source (déjà absolue, domaine cnfrance.fr) a été reprise dans le champ `image`. Le seul article sans image dans la source (id 242, `images: []`) a été laissé sans champ `image` (optionnel dans le schéma).

## 4. Événements

Aucun événement réellement à venir (postérieur au 2026-07-04) n'a été identifié dans le contenu migré : les 34 actualités couvrent des événements passés (jusqu'au 9 mai 2026), et `infos-pratiques/calendrier.md` indique explicitement que le calendrier dynamique du site source était vide au moment du scraping (juillet 2026). Le seed `41e-defi-cnf.md` a donc été conservé tel quel, conformément à la consigne ("sinon ne force rien").

## Résultat build / tests

- `npm run build` : ✅ succès (validation de schéma OK sur les 34 actualités, aucune erreur de date).
- `npm test` : ✅ 18/18 tests passés (11 fichiers de test).

## Fichiers modifiés/ajoutés

- `src/content/site/reglages.json` (modifié)
- `src/content/partenaires/partenaires.json` (modifié)
- `src/content/actualites/*.md` (34 fichiers ajoutés, 1 fichier seed supprimé : `randonnee-cote-bleue.md`)
- `src/content/evenements/` : inchangé (seed conservé)
