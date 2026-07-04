import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Footer from '../../src/components/Footer.astro';

test('le footer rend réseaux et mentions', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Footer);
  expect(html).toContain('Facebook');
  expect(html).toContain('Instagram');
  expect(html).toContain('LinkedIn');
  expect(html).toContain('Mentions légales');
  expect(html).toContain('Cercle Nautique de France');
});
