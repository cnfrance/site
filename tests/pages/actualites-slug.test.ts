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
  const entry = { id: 'boat-race-2026', body: 'Récit', data: { titre: '"BOAT RACE" 2026', date: new Date('2026-04-11'), resume: 'Victoire à Cambridge.', image: 'https://example.org/photo.jpg' } };
  const html = await container.renderToString(ActualiteDetail, { props: { entry } });

  expect(html).toContain('BOAT RACE');
  expect(html).toContain('avril 2026');
  expect(html).toContain('adhérents actifs');
  expect(html).toContain('https://example.org/photo.jpg');
});

const rendre = async (entry: object) => (await AstroContainer.create()).renderToString(ActualiteDetail, { props: { entry } });

test('fiche à venir : statut, plage et heure, lieu, présentation, bouton d\'inscription', async () => {
  const html = await rendre({ id: 'aperow', body: '', data: {
    titre: 'Apérow', date: new Date('2099-11-14T19:00:00Z'), resume: 'Tous', lieu: 'Au Huit',
    presentation: '**Programme** du soir', lien: 'https://exemple.fr/inscription',
  } });
  expect(html).toContain('À venir');
  expect(html).toContain('14 novembre 2099 · 19 h');
  expect(html).toContain('Au Huit');
  expect(html).toContain('<strong>Programme</strong>');
  expect(html).toContain('href="https://exemple.fr/inscription"');
  expect(html).not.toContain('a eu lieu');
  expect(html).not.toContain('adhérents actifs');
});

test('fiche passée sans compte rendu : « a eu lieu », présentation, plus de bouton', async () => {
  const html = await rendre({ id: 'aperow', body: '', data: {
    titre: 'Apérow', date: new Date('2026-01-10T19:00:00Z'), resume: 'Tous',
    presentation: 'Programme du soir', lien: 'https://exemple.fr/inscription',
  } });
  expect(html).toContain('Ce rendez-vous a eu lieu le 10 janvier 2026');
  expect(html).toContain('Programme du soir');
  expect(html).not.toContain('href="https://exemple.fr/inscription"');
  expect(html).not.toContain('À venir');
});

test('fiche passée avec compte rendu : le récit remplace la présentation', async () => {
  const html = await rendre({ id: 'aperow', body: 'Récit', data: {
    titre: 'Apérow', date: new Date('2026-01-10T19:00:00Z'), resume: 'Tous', presentation: 'Programme du soir',
  } });
  expect(html).toContain('adhérents actifs');
  expect(html).not.toContain('Programme du soir');
  expect(html).not.toContain('À venir');
  expect(html).not.toContain('a eu lieu');
});
