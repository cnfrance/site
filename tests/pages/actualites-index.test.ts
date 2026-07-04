import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import ActualitesIndex from '../../src/pages/actualites/index.astro';

// La liste des actualités appelle getCollection('actualites') dans son frontmatter ;
// on le mocke pour un rendu isolé, comme pour index.test.ts.
vi.mock('astro:content', async () => {
  return {
    getCollection: async () => [
      { id: 'rando-cote-bleue', data: { titre: 'Rando Côte Bleue', date: new Date('2026-05-18'), resume: 'Images' } },
      { id: 'boat-race-2026', data: { titre: '"BOAT RACE" 2026', date: new Date('2026-04-11'), resume: 'Victoire à Cambridge.' } },
    ],
  };
});

test("la liste des actualités affiche plusieurs titres triés par date décroissante", async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ActualitesIndex);

  expect(html).toContain('Actualités');
  expect(html).toContain('Rando Côte Bleue');
  expect(html).toContain('BOAT RACE');
  expect(html).toContain('/actualites/rando-cote-bleue');
  expect(html).toContain('/actualites/boat-race-2026');

  // Tri décroissant : la plus récente (18 mai) doit précéder l'autre (11 avril) dans le HTML.
  const posRando = html.indexOf('Rando Côte Bleue');
  const posBoatRace = html.indexOf('BOAT RACE');
  expect(posRando).toBeGreaterThan(-1);
  expect(posBoatRace).toBeGreaterThan(-1);
  expect(posRando).toBeLessThan(posBoatRace);
});
