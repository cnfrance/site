import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionGalerie from '../../src/components/SectionGalerie.astro';

test('rend les photos avec alt = événement et lien vers l\'article', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionGalerie, {
    props: {
      photos: [
        { src: '/images/actus/randonnee-cote-bleue.jpg', alt: 'Randonnée Côte Bleue', href: '/actualites/randonnee-cote-bleue' },
      ],
    },
  });
  expect(html).toContain('alt="Randonnée Côte Bleue"');
  expect(html).toContain('/images/actus/randonnee-cote-bleue.jpg');
  expect(html).toContain('href="/actualites/randonnee-cote-bleue"');
  expect(html).toContain('Toute la galerie →');
  expect(html).toContain('id="galerie"');
});

test('reste cliquable seulement si un href est fourni', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionGalerie, {
    props: { photos: [{ src: '/images/actus/x.jpg', alt: 'Photo du club' }] },
  });
  expect(html).toContain('alt="Photo du club"');
  expect(html).not.toContain('<a class="gal__link"');
});
