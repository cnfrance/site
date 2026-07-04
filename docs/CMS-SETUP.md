# Mise en place de l'admin CMS (Sveltia CMS)

Le site expose une interface d'administration à l'adresse `/admin/` (fichiers
`public/admin/index.html` et `public/admin/config.yml`), basée sur
[Sveltia CMS](https://github.com/sveltia/sveltia-cms), le successeur moderne
de Decap CMS (même format de configuration). Elle permet au club d'éditer le
contenu (actualités, résultats, événements, pages, partenaires, réglages du
site) directement depuis un navigateur, avec sauvegarde des modifications
sous forme de commits dans le dépôt GitHub `cnfrance/site` (branche `main`).

Le backend configuré est `github`. Pour que la connexion fonctionne, Sveltia
CMS a besoin d'un service d'authentification OAuth GitHub — il ne peut pas
s'authentifier directement avec juste un nom d'utilisateur/mot de passe.
**Netlify Identity est déprécié** (Netlify l'a officiellement annoncé fin de
vie) : il ne faut donc plus l'utiliser. Deux solutions restent disponibles,
au choix.

## Option 1 — Provider OAuth de Netlify (le plus simple si le site est hébergé sur Netlify)

Cette option utilise uniquement la fonctionnalité "OAuth provider for
external sites" de Netlify (indépendante de Netlify Identity, qui elle est
dépréciée). Elle ne nécessite pas d'héberger le site lui-même sur Netlify
pour l'hébergement de production : Netlify sert seulement de relais
d'authentification.

1. **Créer une GitHub OAuth App**
   - Aller sur GitHub : `Settings` (compte ou organisation `cnfrance`) →
     `Developer settings` → `OAuth Apps` → `New OAuth App`.
   - Renseigner :
     - **Application name** : `CNF Admin CMS` (libre).
     - **Homepage URL** : l'URL du site en production, ex.
       `https://www.cnfrance.fr`.
     - **Authorization callback URL** :
       `https://api.netlify.com/auth/done`.
   - Créer l'app, puis noter le **Client ID** et générer un **Client secret**
     (à garder secret, ne jamais le committer).

2. **Configurer un site Netlify comme relais OAuth**
   - Créer (ou réutiliser) un site Netlify quelconque, même un site vide
     — il ne sert qu'à héberger le endpoint OAuth, pas le site lui-même.
   - Dans ce site Netlify : `Site settings` → `Access control` (ou
     `Identity` selon la version d'interface) → section OAuth /
     `Git Gateway` → renseigner le **Client ID** et **Client secret** de
     l'OAuth App GitHub créée à l'étape 1.

3. **Rien à changer dans `config.yml`** : quand `base_url`/`auth_endpoint`
   ne sont pas définis, Sveltia CMS utilise automatiquement
   `https://api.netlify.com/auth` comme point d'entrée OAuth par défaut
   (comportement historique de Decap CMS conservé pour compatibilité).
   Si vous préférez être explicite, vous pouvez décommenter et renseigner
   dans `public/admin/config.yml` :
   ```yaml
   backend:
     name: github
     repo: cnfrance/site
     branch: main
     base_url: "https://api.netlify.com"
     auth_endpoint: "auth"
   ```

## Option 2 — Relais OAuth auto-hébergé (Cloudflare Worker)

À utiliser si vous ne voulez pas dépendre de Netlify. Le projet
[`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) fournit un
Cloudflare Worker prêt à l'emploi qui joue exactement ce rôle de relais OAuth
(alternative à `decap-cms-github-oauth-provider`, historiquement utilisé pour
Decap CMS).

1. **Créer une GitHub OAuth App**
   - Même procédure que ci-dessus (`Developer settings` → `OAuth Apps` →
     `New OAuth App`).
   - **Authorization callback URL** : celle du Worker, de la forme
     `https://<votre-worker>.<votre-compte>.workers.dev/callback`.
   - Noter le **Client ID** et le **Client secret**.

2. **Déployer le Worker**
   - Suivre les instructions du dépôt
     [sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)
     (déploiement via `wrangler` ou le bouton "Deploy to Cloudflare").
   - Renseigner les variables d'environnement du Worker avec le
     `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` obtenus à l'étape 1 (dans
     les secrets Cloudflare, jamais en clair dans le dépôt).
   - Optionnel : restreindre le Worker à l'organisation/dépôt `cnfrance/site`
     via les variables `ALLOWED_DOMAINS` proposées par le Worker.

3. **Renseigner l'URL du Worker dans `config.yml`**
   Décommenter et compléter dans `public/admin/config.yml` :
   ```yaml
   backend:
     name: github
     repo: cnfrance/site
     branch: main
     base_url: "https://<votre-worker>.<votre-compte>.workers.dev"
     auth_endpoint: "auth"
   ```

## Accès des utilisateurs du club

Une fois l'une des deux options en place :

- Les personnes qui doivent éditer le contenu doivent avoir un compte GitHub
  avec un accès en écriture (au moins "Write") au dépôt `cnfrance/site`
  (à donner via `Settings` → `Collaborators and teams` du dépôt, ou en les
  ajoutant à l'organisation/équipe concernée).
- Elles se rendent sur `https://www.cnfrance.fr/admin/`, cliquent sur
  "Se connecter avec GitHub", autorisent l'application OAuth lors de la
  première connexion, puis accèdent à l'interface d'édition.

## Vérifications rapides en cas de souci

- Erreur "Failed to load config" : vérifier que `public/admin/config.yml`
  est bien servi et qu'il s'agit de YAML valide.
- Fenêtre d'authentification qui se ferme sans connexion : vérifier que
  l'**Authorization callback URL** de l'OAuth App GitHub correspond
  exactement à celle du provider utilisé (Netlify ou Worker), au protocole
  et au `/` final près.
- Erreur 404/permissions lors de la sauvegarde : vérifier que le compte
  GitHub connecté a bien un accès en écriture au dépôt `cnfrance/site` et
  que la branche `main` configurée dans `config.yml` existe bien.
