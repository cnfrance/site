import { defineConfig } from 'astro/config';

// Heure murale : les dates du CMS n'ont pas de fuseau ; on les lit en UTC
// pour qu'elles gardent l'heure saisie (voir src/lib/agenda.ts).
process.env.TZ = 'UTC';

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
    // Ancienne rubrique Résultats, fusionnée dans les actus « Compétition ».
    '/resultats': '/actualites/?univers=competition',
    '/resultats/challenge-bateaux-courts-1': '/actualites/challenge-bateaux-courts-1',
    '/resultats/challenge-bateaux-courts-2': '/actualites/challenge-bateaux-courts-2',
    '/resultats/championnat-de-france-senior-2025': '/actualites/championnat-de-france-senior-2025',
    '/resultats/championnat-de-france-senior-28-et-29-septembre-2024': '/actualites/championnat-de-france-senior-28-et-29-septembre-2024',
    '/resultats/championnat-de-ligue-lifa-benjamins-minimes': '/actualites/championnat-de-ligue-lifa-benjamins-minimes',
    '/resultats/championnats-bateaux-courts-zone-nord-ouest': '/actualites/championnats-bateaux-courts-zone-nord-ouest',
    '/resultats/championnats-de-france-de-beach-rowing-sprint-et-aviron-de-mer': '/actualites/championnats-de-france-de-beach-rowing-sprint-et-aviron-de-mer',
    '/resultats/championnats-de-france-j18-senior-sprint': '/actualites/championnats-de-france-j18-senior-sprint',
    '/resultats/coupe-des-regions-27-et-26-octobre-2024': '/actualites/coupe-des-regions-27-et-26-octobre-2024',
    '/resultats/coupes-des-dames-angers-2025': '/actualites/coupes-des-dames-angers-2025',
    '/resultats/damala-2025-course-en-skiff': '/actualites/damala-2025-course-en-skiff',
    '/resultats/lifa-1-26-janvier-2025': '/actualites/lifa-1-26-janvier-2025',
    '/resultats/maif-indoor-2025-championnats-de-france': '/actualites/maif-indoor-2025-championnats-de-france',
    '/resultats/regate-de-fontainebleau-2025': '/actualites/regate-de-fontainebleau-2025',
    '/resultats/regate-de-selection-coupe-de-france-2025': '/actualites/regate-de-selection-coupe-de-france-2025',
    '/resultats/tete-de-riviere-de-caen-2025': '/actualites/tete-de-riviere-de-caen-2025',
    '/resultats/yole_cup_2026': '/actualites/yole_cup_2026',
  },
});
