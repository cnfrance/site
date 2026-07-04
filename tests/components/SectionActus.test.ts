import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionActus from '../../src/components/SectionActus.astro';

test('rend les actualités avec lien vers article', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionActus, {
    props: { actus: [{ titre: 'Randonnée Côte Bleue', date: new Date('2026-05-18'), resume: 'Retour en images', slug: 'randonnee-cote-bleue' }] },
  });
  expect(html).toContain('Randonnée Côte Bleue');
  expect(html).toContain('Retour en images');
  expect(html).toContain('/actualites/randonnee-cote-bleue');
  expect(html).toContain('id="actus"');
});
