import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import ResultatDetail from '../../src/pages/resultats/[slug].astro';

// Le détail d'un résultat appelle render(entry) puis <Content /> dans son frontmatter ;
// on mocke astro:content en réutilisant le composant Content factice.
vi.mock('astro:content', async () => {
  const { default: FakeContent } = await import('../fixtures/FakeContent.astro');
  return {
    getCollection: async () => [
      { id: 'regate-de-fontainebleau-2025', data: { titre: 'Régate de Fontainebleau 2025', date: new Date('2025-11-11'), resume: '3e sur 6.', image: 'https://example.org/photo.jpg' } },
    ],
    render: async () => ({ Content: FakeContent }),
  };
});

test("la page de détail d'un résultat rend le titre, la date et le contenu", async () => {
  const container = await AstroContainer.create();
  const entry = { id: 'regate-de-fontainebleau-2025', data: { titre: 'Régate de Fontainebleau 2025', date: new Date('2025-11-11'), resume: '3e sur 6.', image: 'https://example.org/photo.jpg' } };
  const html = await container.renderToString(ResultatDetail, { props: { entry } });

  expect(html).toContain('Fontainebleau');
  expect(html).toContain('novembre 2025');
  expect(html).toContain('adhérents actifs');
  expect(html).toContain('https://example.org/photo.jpg');
});
