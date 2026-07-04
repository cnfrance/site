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

test('affiche le logo (img avec alt) quand présent', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionPartenaires, {
    props: { partenaires: [{ nom: 'Trilogiq', url: 'https://trilogiq.com', logo: '/images/partenaires/trilogiq.gif' }] },
  });
  expect(html).toContain('<img');
  expect(html).toContain('src="/images/partenaires/trilogiq.gif"');
  expect(html).toContain('alt="Trilogiq"');
  expect(html).not.toContain('>Trilogiq<');
});

test('affiche le nom en texte seul quand aucun logo n\'est fourni', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionPartenaires, {
    props: { partenaires: [{ nom: 'HSBC' }] },
  });
  expect(html).not.toContain('<img');
  expect(html).toMatch(/<span[^>]*>HSBC<\/span>/);
});
