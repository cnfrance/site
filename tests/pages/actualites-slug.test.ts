import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import ActualiteDetail from '../../src/pages/actualites/[slug].astro';

// Le détail d'une actu appelle render(entry) puis <Content /> dans son frontmatter ;
// on mocke astro:content en réutilisant le composant Content factice, comme pour slug.test.ts.
vi.mock('astro:content', async () => {
  const { default: FakeContent } = await import('../fixtures/FakeContent.astro');
  return {
    getCollection: async () => [
      { id: 'boat-race-2026', data: { titre: '"BOAT RACE" 2026', date: new Date('2026-04-11'), resume: 'Victoire à Cambridge.', image: 'https://example.org/photo.jpg' } },
    ],
    render: async () => ({ Content: FakeContent }),
  };
});

test("la page de détail d'une actualité rend le titre, la date et le contenu", async () => {
  const container = await AstroContainer.create();
  const entry = { id: 'boat-race-2026', data: { titre: '"BOAT RACE" 2026', date: new Date('2026-04-11'), resume: 'Victoire à Cambridge.', image: 'https://example.org/photo.jpg' } };
  const html = await container.renderToString(ActualiteDetail, { props: { entry } });

  expect(html).toContain('BOAT RACE');
  expect(html).toContain('avril 2026');
  expect(html).toContain('adhérents actifs');
  expect(html).toContain('https://example.org/photo.jpg');
});
