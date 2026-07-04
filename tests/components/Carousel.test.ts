import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Carousel from '../../src/components/Carousel.astro';

test('rend une <img> par photo et les boutons prev/next si plusieurs photos', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: {
      photos: [
        '/images/actus/exemple/01.jpg',
        '/images/actus/exemple/02.jpg',
        '/images/actus/exemple/03.jpg',
      ],
      alt: 'Rando Côte Bleue',
    },
  });

  const imgCount = (html.match(/<img/g) ?? []).length;
  expect(imgCount).toBe(3);
  expect(html).toContain('/images/actus/exemple/01.jpg');
  expect(html).toContain('/images/actus/exemple/02.jpg');
  expect(html).toContain('/images/actus/exemple/03.jpg');
  expect(html).toContain('aria-label="Image précédente"');
  expect(html).toContain('aria-label="Image suivante"');
  expect(html).toContain('role="group"');
  expect(html).toContain('aria-roledescription="carrousel"');
  expect(html).toContain('1 / 3');
});

test("ne rend pas les boutons de navigation s'il n'y a qu'une seule photo", async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: { photos: ['/images/actus/exemple/01.jpg'], alt: 'Une seule photo' },
  });

  const imgCount = (html.match(/<img/g) ?? []).length;
  expect(imgCount).toBe(1);
  expect(html).not.toContain('aria-label="Image précédente"');
  expect(html).not.toContain('aria-label="Image suivante"');
});

test("ne rend rien s'il n'y a aucune photo", async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: { photos: [], alt: 'Vide' },
  });

  expect(html).not.toContain('data-carousel');
  expect(html).not.toContain('<img');
});

test('variant mini affiche des points plutôt que le compteur', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: {
      photos: ['/a.jpg', '/b.jpg'],
      alt: 'Mini',
      variant: 'mini',
    },
  });

  expect(html).toContain('data-carousel-dot');
  expect(html).not.toContain('data-carousel-counter');
});
