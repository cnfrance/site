import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionPartenaires from '../../src/components/SectionPartenaires.astro';

test('rend les partenaires, avec lien quand url présente', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionPartenaires, {
    props: { partenaires: [{ nom: 'FFA', url: 'https://ffaviron.fr' }, { nom: 'Ville de Neuilly' }] },
  });
  expect(html).toContain('FFA');
  expect(html).toContain('https://ffaviron.fr');
  expect(html).toContain('Ville de Neuilly');
  expect(html).toContain('id="partenaires"');
});
