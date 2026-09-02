import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Nav from '../../src/components/Nav.astro';

test('la nav reproduit fidèlement les rubriques de l\'ancien site', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Nav);
  for (const item of [
    'Accueil',
    'Le club',
    'Infos Pratiques',
    'Pratiquer',
    'Découvrir',
    'Information adhérent',
    'Partenariat',
    'Team Building',
    '150 Ans',
    'Actualités',
    'Résultats',
  ]) {
    expect(html).toContain(item);
  }
});

test('la nav expose des sous-menus avec les liens des pages migrées', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Nav);
  for (const href of [
    '/le-club/nos-valeurs',
    '/pratiquer/aviron-in-door',
    '/infos-pratiques/adherez-au-cnf',
    '/infos-pratiques/plan-de-navigation-general',
    '/infos-pratiques/calendrier',
    '/pratiquer/randonnees',
    '/espace-adherents/renouveler-son-adhesion2',
    '/espace-adherents/securite-navigation',
    '/resultats',
    '/actualites',
    '/partenariat/sponsor',
    '/partenariat/team-building',
    '/150-ans/histoire-150-d-aviron',
  ]) {
    expect(html).toContain(href);
  }
  expect(html).toContain('nav__menu');
});

test("le sous-menu 150 ans ne garde que les photos et l'histoire", async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Nav);
  expect(html).toContain('/150-ans/photos-videos-du-week-end-150-ans-ici');
  expect(html).toContain("/150-ans/histoire-150-d-aviron");
  for (const supprime of [
    '/150-ans/boutique',
    '/150-ans/grande-soiree-du-12-juillet-2025',
    '/150-ans/row-500-edition-speciale-150-ans',
    '/150-ans/sponsors-de-la-row-500',
    '/150-ans/relais-indoor-sur-100-km-21-juin-2025-edition-speciale-150-ans',
  ]) {
    expect(html).not.toContain(supprime);
  }
});
