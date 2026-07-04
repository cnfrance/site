import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Index from '../../src/pages/index.astro';

// getCollection est appelé dans le frontmatter de la page ; on le mocke pour un rendu isolé.
import { vi } from 'vitest';
vi.mock('astro:content', async () => {
  return {
    getCollection: async (name: string) => {
      if (name === 'reglages') return [{ id: 'reglages', data: {
        accroche: 'Bienvenue', chiffres: [{ valeur: '1875', label: 'fondé en' }],
        infos: { horaires: '7j/7', tarifs: '300€', adresse: 'Neuilly', email: 'contact@cnfrance.fr' },
      } }];
      if (name === 'evenements') return [{ id: '41e-defi-cnf', data: { titre: '41ème Défi CNF', date: new Date('2030-06-14'), lieu: 'Neuilly', description: 'Régate' } }];
      if (name === 'actualites') return [{ id: 'randonnee-cote-bleue', data: { titre: 'Rando Côte Bleue', date: new Date('2026-05-18'), resume: 'Images' } }];
      if (name === 'partenaires') return [{ id: 'ffa', data: { nom: 'FFA', url: 'https://ffaviron.fr' } }];
      return [];
    },
  };
});

test('la home assemble hero, sections et footer', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Index);
  expect(html).toContain('portes de Paris');       // hero
  expect(html).toContain('Bienvenue');              // chiffres
  expect(html).toContain('Pratiquer');              // disciplines/nav
  expect(html).toContain('41ème Défi CNF');         // événements
  expect(html).toContain('Rando Côte Bleue');       // actus
  expect(html).toContain('FFA');                    // partenaires
  expect(html).toContain('Mentions légales');       // footer
});
