import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Agenda from '../../src/pages/agenda/index.astro';

vi.mock('astro:content', async () => ({
  getCollection: async (name: string) => name === 'actualites' ? [
    { id: 'aperow', body: '', data: { titre: 'Apérow', date: new Date('2099-11-14T19:00:00Z'), resume: 'Tous', lieu: 'Au Huit', categorie: 'club' } },
    { id: 'defi', body: '', data: { titre: 'Défi', date: new Date('2099-12-05T00:00:00Z'), resume: 'Régate', categorie: 'competition' } },
    { id: 'passe', body: 'Récit', data: { titre: 'Passé', date: new Date('2020-01-01T00:00:00Z'), resume: 'x' } },
  ] : [],
}));

test('liste les rendez-vous à venir par mois, avec lien vers la fiche', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Agenda);
  expect(html).toContain('Novembre 2099');
  expect(html).toContain('Décembre 2099');
  expect(html).toContain('href="/actualites/aperow"');
  expect(html).toContain('14 novembre 2099 · 19 h');
  expect(html).not.toContain('Passé');
});

test('propose l\'abonnement par canal : liste déroulante, agenda du téléphone, Google, copie', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Agenda);
  for (const v of ['tout', 'competition', 'loisir', 'club']) expect(html).toContain(`value="${v}"`);
  expect(html).toContain('webcal://www.cnfrance.fr/agenda/tout.ics');
  expect(html).toContain('https://calendar.google.com/calendar/r?cid=');
  expect(html).toContain('Copier le lien');
});
