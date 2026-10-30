import { defineConfig } from 'astro/config';

// `base` piloté par un env de build : '/' par défaut, y compris pour la
// production (GitHub Pages relayé par le proxy de www.cnfrance.fr, qui sert le
// site à la racine). PUBLIC_BASE_PATH=/site ne sert qu'à consulter directement
// une démo sous https://<org>.github.io/site/.
const base = process.env.PUBLIC_BASE_PATH || '/';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://www.cnfrance.fr',
  base,
  output: 'static',
  // Pages statiques de redirection : l'hébergement (GitHub Pages) ne gère pas
  // de redirections côté serveur.
  redirects: {
    // Ancienne page « Aviron indoor », intégrée aux pages Compétition et Loisirs.
    '/pratiquer/aviron-in-door': '/pratiquer/aviron-loisirs',
    // Actus créées depuis l'admin avant le réglage identifier_field : leur
    // nom de fichier était aléatoire. Anciennes adresses → nom tiré du titre.
    '/actualites/14994191e95a': '/actualites/la-head-of-the-charles-nous-en-revions-nous-l-avons-fait',
    '/actualites/7977f999b12b': '/actualites/la-reunion-a-4-on-etait-venu-pour-ramer-et-pas-que',
    '/actualites/7d61087a417b': '/actualites/championnats-nationaux-u15-libourne',
    '/actualites/976310b7c28b': '/actualites/randonnee-de-la-brouillarta-saint-jean-de-luz',
    '/actualites/ab77cbd3f858': '/actualites/randonnee-le-tour-du-golf-du-morbihan',
  },
});
