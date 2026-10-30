import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import GalerieIndex from '../../src/pages/galerie/index.astro';

// La galerie lit les actualités via getCollection ; on le mocke pour un rendu isolé,
// comme pour index.test.ts.
vi.mock('astro:content', async () => {
  return {
    getCollection: async (name: string) => {
      if (name === 'actualites') {
        return [
          {
            id: 'rando-cote-bleue',
            data: {
              titre: 'Rando Côte Bleue',
              date: new Date('2026-05-18'),
              resume: 'Images',
              photos: [
                '/images/actus/rando-cote-bleue/01.jpg',
                '/images/actus/rando-cote-bleue/02.jpg',
              ],
            },
          },
          {
            id: 'regate-de-fontainebleau-2025',
            data: {
              titre: 'Régate de Fontainebleau 2025',
              date: new Date('2025-11-11'),
              resume: '3e sur 6.',
              categorie: 'competition',
              image: '/images/resultats/regate-de-fontainebleau-2025.jpg',
            },
          },
          {
            id: 'sans-photo',
            data: { titre: 'Sans photo', date: new Date('2024-01-01'), resume: 'x' },
          },
        ];
      }
      // Les résultats sont désormais des actus « Compétition » : la galerie ne
      // doit plus lire l'ancienne collection.
      if (name === 'resultats') {
        return [{ id: 'ancien', data: { titre: 'Ancien résultat', date: new Date('2026-01-01'), resume: 'x', image: '/x.jpg' } }];
      }
      return [];
    },
  };
});

test('la galerie affiche un mini-carrousel par événement avec titre et lien', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(GalerieIndex);

  expect(html).toContain('En images');
  expect(html).toContain('Retrouvez en images les événements et sorties du club.');

  expect(html).toContain('Rando Côte Bleue');
  expect(html).toContain('href="/actualites/rando-cote-bleue"');
  expect(html).toContain('/images/actus/rando-cote-bleue/01.jpg');

  expect(html).toContain('Régate de Fontainebleau 2025');
  expect(html).toContain('href="/actualites/regate-de-fontainebleau-2025"');
  expect(html).not.toContain('Ancien résultat');
  expect(html).toContain('/images/resultats/regate-de-fontainebleau-2025.jpg');

  // L'événement sans photo n'a pas de carte.
  expect(html).not.toContain('Sans photo');

  // Tri décroissant : la plus récente (18 mai 2026) doit précéder l'autre (11 nov 2025).
  const posRando = html.indexOf('Rando Côte Bleue');
  const posFontainebleau = html.indexOf('Fontainebleau');
  expect(posRando).toBeGreaterThan(-1);
  expect(posFontainebleau).toBeGreaterThan(-1);
  expect(posRando).toBeLessThan(posFontainebleau);
});
