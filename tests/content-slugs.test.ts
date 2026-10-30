import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// Les fichiers créés depuis l'admin doivent être nommés d'après leur titre
// (identifier_field: titre dans public/admin/config.yml), pas par un
// identifiant aléatoire : leur nom devient l'adresse de la page.
describe('noms des fichiers de contenu', () => {
  for (const dossier of ['actualites', 'evenements']) {
    test(`${dossier} : pas d'identifiant aléatoire, uniquement minuscules sans accents`, () => {
      const noms = readdirSync(`src/content/${dossier}`).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
      expect(noms.filter((n) => /^[0-9a-f]{12}$/.test(n))).toEqual([]);
      expect(noms.filter((n) => !/^[a-z0-9_-]+$/.test(n))).toEqual([]);
    });
  }
});

test('les résultats sont des actus « Compétition » : plus de collection séparée', () => {
  expect(existsSync('src/content/resultats')).toBe(false);
});
