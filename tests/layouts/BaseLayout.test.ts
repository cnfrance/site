import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import BaseLayout from '../../src/layouts/BaseLayout.astro';

test('une page de test peut demander à ne pas être indexée', async () => {
  const container = await AstroContainer.create();
  const cachee = await container.renderToString(BaseLayout, { props: { title: 'Essai', noindex: true } });
  expect(cachee).toContain('<meta name="robots" content="noindex, nofollow">');
  const normale = await container.renderToString(BaseLayout, { props: { title: 'Accueil' } });
  expect(normale).not.toContain('name="robots"');
});
