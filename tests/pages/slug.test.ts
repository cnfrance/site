import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import SlugPage from '../../src/pages/[...slug].astro';

// La route [...slug] appelle render(entry) puis <Content /> dans son frontmatter ;
// on mocke astro:content pour rendre la page en isolation, comme pour index.test.ts,
// en réutilisant un composant Content factice compilé par Astro.
vi.mock('astro:content', async () => {
  const { default: FakeContent } = await import('../fixtures/FakeContent.astro');
  return {
    getCollection: async () => [
      { id: 'le-club/nos-valeurs', data: { titre: 'Nos valeurs', section: 'Le club' } },
    ],
    render: async () => ({ Content: FakeContent }),
  };
});

test('la route [...slug] rend le titre, la section et le contenu de la page', async () => {
  const container = await AstroContainer.create();
  const entry = { id: 'le-club/nos-valeurs', data: { titre: 'Nos valeurs', section: 'Le club' } };
  const html = await container.renderToString(SlugPage, { props: { entry } });

  expect(html).toContain('Nos valeurs');
  expect(html).toContain('Le club');
  expect(html).toContain('adhérents actifs');
});
