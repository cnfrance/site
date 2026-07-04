import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';

test('AstroContainer rend du HTML', async () => {
  const container = await AstroContainer.create();
  expect(container).toBeDefined();
  expect(typeof container.renderToString).toBe('function');
});
