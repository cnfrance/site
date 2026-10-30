import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Videos from '../../src/components/Videos.astro';

test('un lien Instagram donne un bouton « Lire la vidéo », sans iframe au premier rendu', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ lien: 'https://www.instagram.com/reel/DAbc_-12/' }] },
  });
  expect(html).toContain('data-ig-embed="https://www.instagram.com/reel/DAbc_-12/embed/"');
  expect(html).toContain('Lire la vidéo');
  expect(html).toContain('href="https://www.instagram.com/reel/DAbc_-12/"');
  expect(html).not.toContain('<iframe');
});

test('une publication /p/ garde la forme /p/ dans l\'URL d\'intégration', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ lien: 'https://www.instagram.com/p/C1a2B3/?igsh=abc' }] },
  });
  expect(html).toContain('data-ig-embed="https://www.instagram.com/p/C1a2B3/embed/"');
});

test('YouTube reste intégré directement', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ lien: 'https://youtu.be/dQw4w9WgXcQ' }] },
  });
  expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  expect(html).not.toContain('data-ig-embed');
});

test('un fichier .mov d\'iPhone est annoncé en MP4 pour être lu hors de Safari', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Videos, {
    props: { videos: [{ fichier: '/medias/clip.mov' }, { fichier: '/medias/Vogalonga 2026.MP4' }] },
  });
  expect(html).toContain('<source src="/medias/clip.mov" type="video/mp4"');
  expect(html).toContain('<source src="/medias/Vogalonga 2026.MP4" type="video/mp4"');
  expect(html).not.toMatch(/<video[^>]*\ssrc=/);
});
