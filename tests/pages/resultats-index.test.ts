import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import ResultatsIndex from '../../src/pages/resultats/index.astro';

// La liste des résultats appelle getCollection('resultats') dans son frontmatter ;
// on le mocke pour un rendu isolé.
vi.mock('astro:content', async () => {
  return {
    getCollection: async () => [
      { id: 'regate-de-fontainebleau-2025', data: { titre: 'Régate de Fontainebleau 2025', date: new Date('2025-11-11'), resume: '3e sur 6 en 8 de couple.' } },
      { id: 'lifa-1-26-janvier-2025', data: { titre: 'Lifa 1 26 janvier 2025', date: new Date('2025-01-26'), resume: 'De bons résultats J16 et Masters.' } },
    ],
  };
});

test("la liste des résultats affiche plusieurs titres triés par date décroissante", async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ResultatsIndex);

  expect(html).toContain('Résultats');
  expect(html).toContain('Régate de Fontainebleau 2025');
  expect(html).toContain('Lifa 1 26 janvier 2025');
  expect(html).toContain('/resultats/regate-de-fontainebleau-2025');
  expect(html).toContain('/resultats/lifa-1-26-janvier-2025');

  const posFontainebleau = html.indexOf('Fontainebleau');
  const posLifa = html.indexOf('Lifa 1');
  expect(posFontainebleau).toBeGreaterThan(-1);
  expect(posLifa).toBeGreaterThan(-1);
  expect(posFontainebleau).toBeLessThan(posLifa);
});
