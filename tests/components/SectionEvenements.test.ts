import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionEvenements from '../../src/components/SectionEvenements.astro';

const fermeture = {
  titre: 'Fermeture de fin d\'année', date: new Date('2026-12-20T00:00:00Z'), dateFin: new Date('2027-01-03T00:00:00Z'),
  resume: 'Club fermé', slug: 'fermeture-fin-annee', categorie: 'club' as const,
};
const aperow = { titre: 'Apérow', date: new Date('2026-11-14T19:00:00Z'), lieu: 'Au Huit', resume: 'Tous bienvenus', slug: 'aperow' };

test('chaque rendez-vous est une carte cliquable vers sa fiche, avec plage, heure, lieu et univers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, { props: { evenements: [fermeture, aperow] } });
  expect(html).toContain('href="/actualites/fermeture-fin-annee"');
  expect(html).toContain('20 décembre 2026 – 3 janvier 2027');
  expect(html).toContain('Vie du club');
  expect(html).toContain('14 novembre 2026 · 19 h');
  expect(html).toContain('Au Huit');
  expect(html).toContain('data-fin="2027-01-03"');
  expect(html).toContain('id="evenements"');
});

test('renvoie vers l\'agenda, qu\'il y ait des rendez-vous ou non', async () => {
  const container = await AstroContainer.create();
  for (const evenements of [[], [aperow]]) {
    const html = await container.renderToString(SectionEvenements, { props: { evenements } });
    expect(html).toContain('href="/agenda/"');
    expect(html).toContain('Voir tout l\'agenda');
  }
});

test('sans rendez-vous : message et lien vers l\'agenda', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionEvenements, { props: { evenements: [] } });
  expect(html).toContain('Aucun rendez-vous annoncé pour le moment');
});
