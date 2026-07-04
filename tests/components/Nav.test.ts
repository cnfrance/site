import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Nav from '../../src/components/Nav.astro';

test('la nav rend les rubriques et le CTA', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Nav);
  for (const item of ['Le club', 'Pratiquer', 'Infos pratiques', 'Actualités', 'Résultats', '150 ans', 'Partenariat', 'Nous rejoindre']) {
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
    '/partenariat/sponsor',
  ]) {
    expect(html).toContain(href);
  }
  expect(html).toContain('nav__dropdown');
});
