import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionEvenements from '../../src/components/SectionEvenements.astro';

test('rend les événements avec date formatée', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, {
    props: { evenements: [{ titre: '41ème Défi CNF', date: new Date('2026-06-14'), lieu: 'Neuilly', description: 'Régate annuelle' }] },
  });
  expect(html).toContain('41ème Défi CNF');
  expect(html).toContain('Régate annuelle');
  expect(html).toContain('juin');
  expect(html).toContain('id="evenements"');
});

test('affiche un message si aucun événement', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, { props: { evenements: [] } });
  expect(html).toContain('Aucun événement');
});
