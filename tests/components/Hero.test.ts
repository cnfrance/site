import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Hero from '../../src/components/Hero.astro';

test('le hero rend le titre, le slogan et une image du pool', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Hero, {
    props: { photos: ['/img/seine-1.jpg', '/img/seine-2.jpg'] },
  });
  expect(html).toContain('portes de Paris');
  expect(html).toContain('Cercle Nautique de France');
  expect(html).toContain('/img/seine-1.jpg');
  expect(html).toContain('Nous rejoindre');
});

test('le hero gère un pool vide sans planter', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Hero, { props: { photos: [] } });
  expect(html).toContain('portes de Paris');
});
