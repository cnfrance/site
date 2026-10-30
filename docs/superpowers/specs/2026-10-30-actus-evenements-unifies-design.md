# Actualités et événements réunis en une seule fiche

Date : 2026-10-30 — statut : design validé en conversation, spec à relire.

## Objectif

Un rendez-vous du club (régate, rando, Apérow, AG, fermeture…) est **une seule
fiche** qui vit avant et après sa date, sans manipulation dans l'admin :

1. **Avant la date** : la fiche est un événement à venir (accueil, agenda,
   calendrier, abonnements `.ics`), sa page présente le programme et le lien
   d'inscription.
2. **La date passe** : elle sort d'elle-même des événements à venir.
3. **On l'enrichit** en rouvrant la même fiche (compte rendu, photos) : elle
   apparaît alors parmi les actualités. L'adresse ne change jamais.

## Décisions

| Sujet | Décision |
| --- | --- |
| Collections | `evenements` disparaît ; tout est dans `actualites` (admin : « Actualités & événements ») |
| Univers | Les 3 actuels, inchangés : `competition`, `loisir` (Loisir & randonnées), `club` (Vie du club, **fermetures comprises**) |
| Fiche passée sans compte rendu | Absente des actualités ; présente dans le calendrier ; sa page indique « a eu lieu » |
| Passage avant → après | Recompilation quotidienne du site + masquage côté navigateur le jour même |
| Abonnement | Un fichier `.ics` par canal (Tout, Compétition, Loisir & randonnées, Vie du club), choisi dans une liste déroulante sur la page Agenda |
| Page Agenda | `/agenda` : fiches à venir par mois, filtre par univers, bloc d'abonnement |
| Calendrier mensuel | `/infos-pratiques/calendrier` conservé, lu depuis la seule collection |

## Modèle de contenu

`actualiteSchema` (champs nouveaux en gras, tous facultatifs) :

| Champ | Rôle |
| --- | --- |
| `titre`, `date`, `categorie`, `resume`, `image`, `photos`, `videos`, `instagram` | inchangés ; `date` = début du rendez-vous |
| **`dateFin`** | fin d'un rendez-vous sur plusieurs jours (ex. fermeture du 20/12 au 03/01) |
| **`lieu`** | lieu affiché sur cartes et page (`''` du CMS accepté) |
| **`presentation`** | texte Markdown « avant » : programme, horaires, infos pratiques |
| **`lien`** | lien d'inscription ou d'infos, bouton affiché tant que le rendez-vous est à venir (`''` du CMS accepté) |
| corps Markdown | « après » : le compte rendu. Devient facultatif dans l'admin |

Le corps des 58 actus existantes est déjà un compte rendu : rien ne change pour elles.

### Règles (fonctions pures, `src/lib/agenda.ts`, testées)

- `fin(e) = dateFin ?? date`.
- **À venir** : `fin(e)` est aujourd'hui ou plus tard (jour civil, Europe/Paris).
- **Dans le fil des actualités** : pas à venir **et** corps non vide (`entry.body.trim() !== ''`).
- **Heure** : affichée et utilisée dans le `.ics` seulement si l'heure (Europe/Paris) de `date` n'est pas 00:00.
- **Plage** : « 17–18 octobre 2026 », « 20 décembre 2026 – 3 janvier 2027 ».

## Affichage

| Endroit | Contenu |
| --- | --- |
| Accueil, « Événements à venir » | 3 prochaines fiches à venir ; **cartes cliquables** vers `/actualites/<nom>`, pastille d'univers, plage de dates, lieu, résumé ; lien « Voir tout l'agenda → » vers `/agenda` ; si rien : texte + lien vers l'agenda |
| Accueil, « Actualités » | 3 dernières fiches du fil |
| `/actualites` | le fil (filtre par univers inchangé) |
| `/actualites/<nom>` | si à venir : bandeau « À venir », plage de dates (+ heure), lieu, présentation, bouton du lien ; si passée : date, lieu, compte rendu, photos, vidéos ; si passée sans compte rendu : présentation sous la mention « Ce rendez-vous a eu lieu le … » |
| `/agenda` | fiches à venir groupées par mois, filtre par univers (même pastilles que les actus), bloc d'abonnement |
| Galerie | inchangée (fiches avec photos) |
| Calendrier mensuel | toutes les fiches ; couleur par univers |
| Menu | « Agenda » ajouté dans *Infos pratiques*, à côté de « Calendrier » |

Les éléments « à venir » rendus au build portent `data-fin="AAAA-MM-JJ"` ; un
script les masque si cette date est dépassée (cas d'une fiche passée depuis la
dernière compilation).

## Abonnements `.ics`

Fichiers statiques générés au build : `/agenda/tout.ics`, `/agenda/competition.ics`,
`/agenda/loisir.ics`, `/agenda/club.ics` (une fiche sans univers n'est que dans
`tout.ics`).

- Contenu : fiches à venir **et** celles des 90 derniers jours (l'historique
  récent reste dans les agendas abonnés).
- Événement sur la journée (`DTSTART;VALUE=DATE`, `DTEND` exclusif = lendemain de
  `fin`) sauf heure renseignée (`DTSTART;TZID=Europe/Paris:…`, durée 2 h).
- `UID` = `<nom>@cnfrance.fr` ; `SUMMARY` = titre ; `LOCATION` = lieu ;
  `DESCRIPTION` = résumé + adresse de la fiche ; `URL` = adresse de la fiche.
- RFC 5545 : CRLF, échappement de `\ ; ,` et des retours à la ligne, lignes
  repliées à 75 octets, `X-WR-CALNAME` = « CNF — <canal> ».
- Page Agenda : liste déroulante du canal + boutons **« Ajouter à mon agenda »**
  (`webcal://…`, Apple/Outlook/Android), **« Google Agenda »**
  (`https://calendar.google.com/calendar/r?cid=webcal://…`) et **« Copier le
  lien »**.

## Recompilation quotidienne

`pages.yml` gagne `schedule: cron "15 2 * * *"` (≈ 3 h–4 h à Paris). Coût : une
compilation d'une minute par jour.

## Migration

- Les 7 fichiers de `src/content/evenements/` deviennent des actus :
  `description` → `resume`, corps → `presentation` (ou `description` s'il n'y a
  pas de corps), `lien` conservé, `lieu`/`dateFin`/`image` conservés, corps vide.
  Univers déduit du titre, liste soumise avant commit.
- Collision de nom avec une actu existante : suffixe `-evenement` (vérifiée au
  moment de la migration).
- Suppression de la collection `evenements` (schéma, admin, dossier) ; le test
  de nommage vérifie que le dossier n'existe plus.

## Admin (Sveltia)

- Collection « Actualités & événements » ; `description` en tête rappelant le
  cycle (créer avant avec présentation et lien ; revenir après pour le compte
  rendu et les photos) ; `summary` « {{date | date('DD/MM/YYYY')}} — {{titre}} » ;
  tri par date.
- Champs ajoutés dans l'ordre : Date de fin, Lieu, Présentation, Lien
  (inscription ou infos) ; « Contenu » renommé « Compte rendu », facultatif.
- La collection Événements est retirée.

## Hors périmètre

- Séparer randonnées et loisirs (décidé : on garde 3 univers).
- Rappels, inscriptions gérées par le site.
- Fuseaux autres que Europe/Paris.

## Tests

- `src/lib/agenda.ts` : à venir / passé (jour même, plusieurs jours, fuseau),
  fil des actus (corps vide ou non), heure significative, plages de dates.
- Générateur `.ics` : journée, plusieurs jours, avec heure, échappement, repli
  des lignes, canal sans univers, fenêtre de 90 jours.
- Schéma : nouveaux champs, valeurs vides du CMS.
- Composants : carte d'accueil cliquable, page de fiche (à venir / passée /
  passée sans compte rendu), page Agenda (groupes par mois, liste déroulante).
- Contenu : plus de dossier `evenements`.
- Vérification dans le navigateur : accueil, agenda, fiche, abonnement (fichier
  `.ics` importé dans un agenda).
