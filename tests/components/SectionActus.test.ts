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

test("une actu saisie à 23 h 30 garde son jour sur la carte", async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionActus, { props: { actus: [
    { titre: 'Soirée', date: new Date('2026-10-30T23:30:00Z'), resume: 'x', slug: 'soiree' },
  ] } });
  expect(html).toContain('30 octobre 2026');
  expect(html).not.toContain('31 octobre 2026');
});
