import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Nav from '../../src/components/Nav.astro';

test('la nav rend les rubriques et le CTA', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Nav);
  for (const item of ['Le club', 'Pratiquer', 'Infos pratiques', 'Actualités', 'Galerie', 'Nous rejoindre']) {
    expect(html).toContain(item);
  }
});
