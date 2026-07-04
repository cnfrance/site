import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionChiffres from '../../src/components/SectionChiffres.astro';

test('rend accroche et chiffres', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionChiffres, {
    props: {
      accroche: 'Bienvenue au club',
      chiffres: [{ valeur: '1875', label: 'fondé en' }, { valeur: '+300', label: 'adhérents' }],
    },
  });
  expect(html).toContain('Bienvenue au club');
  expect(html).toContain('1875');
  expect(html).toContain('fondé en');
  expect(html).toContain('+300');
  expect(html).toContain('id="club"');
});
