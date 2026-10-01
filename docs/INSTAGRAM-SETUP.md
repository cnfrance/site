# Accès à l'API Instagram du club

Objectif : pouvoir lire automatiquement les publications de
[@cerclenautiquedefrance](https://www.instagram.com/cerclenautiquedefrance/)
(légendes, photos, permaliens, dates) pour alimenter les actualités du site.

L'API utilisée est **Instagram API with Instagram Login**, en **lecture seule**
(portée `instagram_business_basic`). Elle ne permet ni de publier, ni de
modifier, ni de supprimer quoi que ce soit sur le compte.

> L'ancienne « Instagram Basic Display API » est fermée depuis le 4 décembre
> 2024 : toute documentation qui la mentionne est périmée.

## Prérequis côté club (à demander au gestionnaire du compte)

Trois actions, une seule fois, ~10 minutes. Le gestionnaire **garde le compte
et son mot de passe** — rien de tout cela ne les transmet.

1. **Passer @cerclenautiquedefrance en compte professionnel** (« Créateur »
   suffit) : app Instagram → `Réglages` → `Type de compte et outils` →
   `Passer à un compte professionnel`. Gratuit et réversible.
   ⚠️ Un compte professionnel doit être **public** — déjà le cas ici.
2. **Accepter l'invitation de testeur** sur l'app Meta (étape 3 ci-dessous) :
   app Instagram → `Réglages` → `Apps et sites web` → `Invitations de testeur`.
   Les libellés bougent régulièrement chez Meta.
3. **Cliquer une fois sur le lien d'autorisation** et valider (étape 5).

## 1. Créer l'app Meta

Sur [developers.facebook.com/apps](https://developers.facebook.com/apps) →
`Créer une app` :

| Champ | Valeur |
| --- | --- |
| Nom de l'app | `CNF Site` |
| Cas d'usage | **Autre** → type d'app **Business** |
| Portfolio Business | aucun / en créer un si Meta l'exige |

Laisser l'app en **mode développement** : la revue Meta (App Review) n'est
nécessaire que pour accéder à des comptes tiers. Pour lire le compte du club,
l'accès standard suffit tant que ce compte a un rôle de testeur sur l'app.

## 2. Ajouter le produit Instagram

Dans l'app → `Ajouter un produit` → **Instagram** → `Configurer`, puis
`Configuration de l'API avec connexion Instagram`.

Relever dans cette section :

- **Identifiant de l'app Instagram** → `INSTAGRAM_APP_ID`
- **Clé secrète de l'app Instagram** → `INSTAGRAM_APP_SECRET`

⚠️ Ce sont bien les identifiants **Instagram**, pas ceux de l'app Meta
affichés dans `Paramètres de l'app` → `Général`. Les confondre est l'erreur
la plus fréquente : l'échange du code échoue alors avec une erreur peu
parlante.

## 3. Inviter le compte du club comme testeur

App → `Rôles de l'app` → `Rôles`, puis descendre jusqu'à la section
**« Testeurs Instagram »** → bouton `Ajouter des testeurs Instagram` →
saisir `cerclenautiquedefrance`.

⚠️ Ne pas utiliser le bouton `Ajouter des personnes` du bloc du haut
(« Administrateurs / Développeurs / Testeurs ») : celui-ci attend un compte
**Facebook** et rejette un pseudo Instagram avec *« Impossible de convertir
… en ID ou nom d'utilisateur valide »*.

Le même message dans le bon bloc signifie que le compte n'est pas encore
**professionnel et public** : le champ ne résout que ces comptes-là. Le
prérequis n°1 doit donc être fait **avant** l'invitation.

Le gestionnaire accepte ensuite l'invitation : app Instagram → `Modifier le
profil` → `Apps et sites web` → onglet `Invitations de testeur`. Tant qu'elle
n'est pas acceptée, l'autorisation de l'étape 5 échoue.

> Variante plus directe si le gestionnaire est à côté de toi :
> `Instagram` → `Configuration de l'API avec connexion Instagram` →
> `1. Générer des jetons d'accès` → `Ajouter un compte` ouvre la fenêtre de
> connexion Instagram et rend un jeton immédiatement, sans passer par
> l'invitation de testeur. À distance, le lien de l'étape 5 reste plus commode.

## 4. Déclarer l'URI de redirection

Dans `Configuration de l'API avec connexion Instagram` → `Paramètres de
connexion Business` → **URI de redirection OAuth valides** :

```
https://www.cnfrance.fr/instagram-callback
```

Meta impose une URI en HTTPS (`http://localhost` est refusé). Cette page
n'existe pas sur le site et renverra une **404 : c'est normal et sans
conséquence**, le code d'autorisation se lit dans la barre d'adresse.

## 5. Obtenir le jeton

Renseigner dans `.env` (non versionné) :

```sh
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_REDIRECT_URI=https://www.cnfrance.fr/instagram-callback
```

Générer le lien à envoyer au gestionnaire du compte :

```sh
npm run instagram:token url
```

Il se connecte **sur instagram.com** (jamais via nous), valide l'accès en
lecture, arrive sur la page 404 ; il suffit alors de récupérer la valeur du
paramètre `code=` dans la barre d'adresse et de nous la transmettre. Ce code
n'est valable **qu'une heure et qu'une seule fois**.

```sh
npm run instagram:token exchange "<le-code>"   # → jeton longue durée, 60 jours
npm run instagram:token check                  # vérifie le jeton
```

Ajouter le jeton obtenu à `.env` sous `INSTAGRAM_TOKEN=…`.

## 6. Entretenir le jeton (impératif)

Le jeton expire au bout de **60 jours**. Il se prolonge de 60 jours à chaque
rafraîchissement, à condition d'avoir **plus de 24 h et de ne pas être
expiré** :

```sh
npm run instagram:token refresh
```

S'il expire, il faut **redemander un clic au gestionnaire du compte**
(étape 5). C'est le point de fragilité du dispositif : le rafraîchissement
doit être automatisé par un job planifié qui réécrit le jeton dans les
secrets du dépôt, avec une marge confortable (mensuel, pas tous les 59 jours).

Cette automatisation n'est pas encore en place — voir la suite du chantier
« sync Instagram ».

## Révocation

À tout moment, côté club : app Instagram → `Réglages` → `Apps et sites web` →
retirer `CNF Site`. Le jeton devient immédiatement invalide.
