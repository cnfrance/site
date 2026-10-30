import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import HeroDefilant from '../../src/components/HeroDefilant.astro';

const medias = [
  { src: '/medias/hero/competition-huit.jpeg' },
  { src: '/medias/clip.mov' },
  { src: '/medias/hero/hero-1.jpeg', position: 'gauche' as const },
];

test('une diapo par média : photos en <img>, vidéos muettes lisibles en ligne', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(HeroDefilant, { props: { medias } });
  expect(html.match(/class="hd__slide"/g)).toHaveLength(3);
  expect(html).toMatch(/<img[^>]*src="\/medias\/hero\/competition-huit\.jpeg"/);
  expect(html).toMatch(/<video[^>]*muted[^>]*playsinline|<video[^>]*playsinline[^>]*muted/);
  expect(html).toContain('<source src="/medias/clip.mov" type="video/mp4"');
  expect(html).toContain('data-type="video"');
  expect(html.match(/data-active="true"/g)).toHaveLength(1);
  expect(html.match(/data-hd-dot=/g)).toHaveLength(3);
});

test('le point d\'intérêt cadre la photo (gauche → 0 %)', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(HeroDefilant, { props: { medias } });
  expect(html).toContain('--position: 0%');
  expect(html).toContain('--position: 50%');
});

test('garde le titre, le bouton et l\'invitation à faire défiler la page', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(HeroDefilant, { props: { medias } });
  expect(html).toContain('portes de Paris');
  expect(html).toContain('Nous rejoindre');
  expect(html).toContain('href="#suite"');
});

test('liste vide : pas de plantage, fond de repli', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(HeroDefilant, { props: { medias: [] } });
  expect(html).toContain('hd__vide');
  expect(html).not.toContain('data-hd-dot');
});
