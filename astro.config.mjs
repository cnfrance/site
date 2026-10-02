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
  },
});
