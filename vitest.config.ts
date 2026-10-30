/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

// Heure murale : les dates du CMS n'ont pas de fuseau ; on les lit en UTC
// pour qu'elles gardent l'heure saisie (voir src/lib/agenda.ts).
process.env.TZ = 'UTC';

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
