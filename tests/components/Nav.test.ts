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
    'Espace adhérents',
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
    '/150-ans/boutique',
  ]) {
    expect(html).toContain(href);
  }
  expect(html).toContain('nav__menu');
});
