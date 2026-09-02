import { expect, test, describe } from 'vitest';
import {
  reglagesSchema, evenementSchema, actualiteSchema, partenaireSchema,
} from '../src/content.config';
import { CATEGORIES_ACTU, LIBELLES_CATEGORIE_ACTU } from '../src/lib/categories-actus';

describe('reglagesSchema', () => {
  test('accepte des réglages valides', () => {
    const r = reglagesSchema.parse({
      accroche: 'Bienvenue au CNF',
      chiffres: [{ valeur: '1875', label: 'fondé en' }],
      infos: { horaires: '7j/7', tarifs: '300€/an', adresse: 'Neuilly', email: 'a@b.fr' },
    });
    expect(r.chiffres[0].valeur).toBe('1875');
  });
  test('rejette si email manquant', () => {
    expect(() => reglagesSchema.parse({
      accroche: 'x', chiffres: [], infos: { horaires: 'x', tarifs: 'x', adresse: 'x' },
    })).toThrow();
  });
});

describe('evenementSchema', () => {
  test('coerce une date string', () => {
    const e = evenementSchema.parse({ titre: 'Défi', date: '2026-06-14', description: 'x' });
    expect(e.date instanceof Date).toBe(true);
  });
  test('rejette sans titre', () => {
    expect(() => evenementSchema.parse({ date: '2026-06-14', description: 'x' })).toThrow();
  });
});

describe('actualiteSchema', () => {
  test('accepte une actu valide', () => {
    const a = actualiteSchema.parse({ titre: 'Rando', date: '2026-05-01', resume: 'court' });
    expect(a.titre).toBe('Rando');
  });
  test('la catégorie est optionnelle', () => {
    expect(actualiteSchema.parse({ titre: 'Rando', date: '2026-05-01', resume: 'x' }).categorie).toBeUndefined();
  });
  test('accepte les trois univers éditoriaux', () => {
    for (const c of CATEGORIES_ACTU) {
      expect(actualiteSchema.parse({ titre: 'x', date: '2026-05-01', resume: 'x', categorie: c }).categorie).toBe(c);
    }
  });
  test("rejette un univers inconnu", () => {
    expect(() => actualiteSchema.parse({ titre: 'x', date: '2026-05-01', resume: 'x', categorie: 'peche' })).toThrow();
  });
  test('chaque univers a un libellé affichable', () => {
    for (const c of CATEGORIES_ACTU) {
      expect(LIBELLES_CATEGORIE_ACTU[c]).toBeTruthy();
    }
  });
});

describe('partenaireSchema', () => {
  test('accepte un partenaire avec juste un nom', () => {
    expect(partenaireSchema.parse({ nom: 'FFA' }).nom).toBe('FFA');
  });
});
