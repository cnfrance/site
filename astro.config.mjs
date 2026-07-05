import { defineConfig } from 'astro/config';

// `base` piloté par un env de build : en local et en production (Netlify /
// domaine custom) il vaut '/'. Seul le déploiement de démo GitHub Pages définit
// PUBLIC_BASE_PATH=/site pour servir le site sous https://<org>.github.io/site/.
const base = process.env.PUBLIC_BASE_PATH || '/';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://www.cnfrance.fr',
  base,
  output: 'static',
});
