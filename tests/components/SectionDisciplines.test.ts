import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import SectionDisciplines from '../../src/components/SectionDisciplines.astro';

test('rend les disciplines', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SectionDisciplines);
  for (const d of ['Compétition', 'Loisir', 'Indoor', 'santé', 'Découverte']) {
    expect(html).toContain(d);
  }
  expect(html).toContain('id="disciplines"');
  for (const href of [
    '/pratiquer/aviron-competition',
    '/pratiquer/aviron-loisirs',
    '/pratiquer/aviron-in-door',
    '/pratiquer/aviron-sante',
    '/pratiquer/stages-decouverte',
  ]) {
    expect(html).toContain(href);
  }
});
