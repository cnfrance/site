import { describe, expect, test } from 'vitest';
import {
  aujourdhuiParis, dansLeFil, estAVenir, estEvenement, finDe, heureAffichee, heureDe, jourMural, plageDates,
} from '../../src/lib/agenda';

const d = (iso: string) => new Date(`${iso}Z`);

describe('jours', () => {
  test('le jour mural ignore le fuseau de la machine', () => {
    expect(jourMural(d('2026-10-27T19:00:00'))).toBe('2026-10-27');
    expect(jourMural(d('2026-10-27T23:59:00'))).toBe('2026-10-27');
  });
  test("aujourd'hui est jugé à Paris", () => {
    expect(aujourdhuiParis(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27'); // UTC+1 en hiver
    expect(aujourdhuiParis(new Date('2026-07-09T22:30:00Z'))).toBe('2026-07-10'); // UTC+2 en été
  });
  test('la fin est la date de fin, sinon la date', () => {
    expect(finDe({ date: d('2026-12-20T00:00:00'), dateFin: d('2027-01-03T00:00:00') }).getUTCDate()).toBe(3);
    expect(finDe({ date: d('2026-12-20T00:00:00') }).getUTCDate()).toBe(20);
  });
});

describe('à venir et fil', () => {
  const soir = { date: d('2026-10-27T19:00:00') };
  test('à venir toute la journée du rendez-vous, plus le lendemain', () => {
    expect(estAVenir(soir, '2026-10-27')).toBe(true);
    expect(estAVenir(soir, '2026-10-28')).toBe(false);
  });
  test('un rendez-vous sur plusieurs jours reste à venir jusqu\'à sa fin', () => {
    const fermeture = { date: d('2026-12-20T00:00:00'), dateFin: d('2027-01-03T00:00:00') };
    expect(estAVenir(fermeture, '2027-01-03')).toBe(true);
    expect(estAVenir(fermeture, '2027-01-04')).toBe(false);
  });
  test('le fil ne garde que les fiches passées qui ont un compte rendu', () => {
    expect(dansLeFil(soir, 'Récit', '2026-10-28')).toBe(true);
    expect(dansLeFil(soir, '', '2026-10-28')).toBe(false);
    expect(dansLeFil(soir, '  \n ', '2026-10-28')).toBe(false);
    expect(dansLeFil(soir, undefined, '2026-10-28')).toBe(false);
    expect(dansLeFil(soir, 'Récit', '2026-10-26')).toBe(false); // datée de demain
  });
  test('une actu publiée le jour même est dans le fil, jamais « à venir »', () => {
    expect(dansLeFil(soir, 'Récit', '2026-10-27')).toBe(true);
    expect(estAVenir(soir, '2026-10-27', 'Récit')).toBe(false);
    expect(estAVenir(soir, '2026-10-27', '')).toBe(true);
  });
});

describe('fiche événement', () => {
  test('est un événement une fiche qui a un lieu, une présentation, un lien ou une date de fin', () => {
    const base = { date: d('2026-10-27T19:00:00') };
    expect(estEvenement(base)).toBe(false);
    expect(estEvenement({ ...base, lieu: 'Club' })).toBe(true);
    expect(estEvenement({ ...base, presentation: 'x' })).toBe(true);
    expect(estEvenement({ ...base, lien: 'https://x.fr' })).toBe(true);
    expect(estEvenement({ ...base, dateFin: d('2026-10-28T00:00:00') })).toBe(true);
  });
  test("l'heure n'est affichée que pour un événement (sinon c'est l'heure de création dans l'admin)", () => {
    expect(heureAffichee({ date: d('2026-10-17T10:10:00') })).toBeNull();
    expect(heureAffichee({ date: d('2026-10-27T19:00:00'), lieu: 'Au Huit' })).toBe('19 h');
  });
});

describe('affichage', () => {
  test("l'heure n'apparaît que si elle est saisie", () => {
    expect(heureDe(d('2026-10-27T00:00:00'))).toBeNull();
    expect(heureDe(d('2026-10-27T19:00:00'))).toBe('19 h');
    expect(heureDe(d('2026-10-27T09:30:00'))).toBe('9 h 30');
  });
  test('plages de dates', () => {
    expect(plageDates(d('2026-06-14T00:00:00'))).toBe('14 juin 2026');
    expect(plageDates(d('2026-06-01T10:00:00'))).toBe('1er juin 2026');
    expect(plageDates(d('2026-07-11T00:00:00'), d('2026-07-12T00:00:00'))).toBe('11–12 juillet 2026');
    expect(plageDates(d('2026-06-30T00:00:00'), d('2026-07-02T00:00:00'))).toBe('30 juin – 2 juillet 2026');
    expect(plageDates(d('2026-12-20T00:00:00'), d('2027-01-03T00:00:00'))).toBe('20 décembre 2026 – 3 janvier 2027');
    expect(plageDates(d('2026-06-14T09:00:00'), d('2026-06-14T18:00:00'))).toBe('14 juin 2026');
  });
});
