import { describe, expect, test } from 'vitest';
import { campagneDonSchema } from '../src/content.config';
import {
  coutReel, formatEuros, lireMontant, reductionImpot, urlMonetico,
} from '../src/lib/don';

describe('réduction d\'impôt', () => {
  test('66 % du don, sur les montants proposés comme sur un montant libre', () => {
    expect(reductionImpot(100)).toBe(66);
    expect(coutReel(100)).toBe(34);
    expect(coutReel(30)).toBe(10.2);
    expect(coutReel(75)).toBe(25.5);
    expect(coutReel(12.5)).toBe(4.25);
  });
});

describe('formatEuros', () => {
  test('sans décimales pour un entier, avec deux sinon', () => {
    expect(formatEuros(1000)).toBe('1 000 €');
    expect(formatEuros(25.5)).toBe('25,50 €');
  });
});

describe('lireMontant', () => {
  test('accepte la saisie à la française', () => {
    expect(lireMontant('75')).toBe(75);
    expect(lireMontant('75,50')).toBe(75.5);
    expect(lireMontant('1 000 €')).toBe(1000);
  });
  test('refuse le vide, zéro, le négatif et plus de deux décimales', () => {
    for (const s of ['', '0', '-5', '12,345', 'abc']) expect(lireMontant(s)).toBeNull();
  });
});

test('urlMonetico pré-remplit le montant', () => {
  expect(urlMonetico(75.5)).toBe('https://www.monetico-online-asso.com/cnfrance/don?amount=75.5');
});


describe('campagneDonSchema', () => {
  test('accepte une campagne et convertit la date', () => {
    const c = campagneDonSchema.parse({ titre: 'Yolette', description: 'x', objectif: 15000, collecte: 4200, miseAJour: '2026-10-01' });
    expect(c.miseAJour instanceof Date).toBe(true);
  });
  test('refuse un objectif nul', () => {
    expect(() => campagneDonSchema.parse({ titre: 'x', description: 'x', objectif: 0, collecte: 0, miseAJour: '2026-10-01' })).toThrow();
  });
});
