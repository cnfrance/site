import { expect, test, describe } from 'vitest';
import {
  reglagesSchema, evenementSchema, actualiteSchema, partenaireSchema,
} from '../src/content.config';

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
});

describe('partenaireSchema', () => {
  test('accepte un partenaire avec juste un nom', () => {
    expect(partenaireSchema.parse({ nom: 'FFA' }).nom).toBe('FFA');
  });
});
