import { describe, expect, test } from 'vitest';
import { CANAUX, echapper, genererIcs, plier, type FicheIcs } from '../../src/lib/ics';

const maintenant = new Date('2026-10-30T10:00:00Z');
const site = 'https://www.cnfrance.fr';
const fiches: FicheIcs[] = [
  { slug: 'aperow', titre: 'Apérow', date: new Date('2026-11-14T19:00:00Z'), lieu: 'Au Huit', resume: 'Tous, bienvenus; venez', categorie: 'club' },
  { slug: 'fermeture', titre: 'Fermeture', date: new Date('2026-12-20T00:00:00Z'), dateFin: new Date('2027-01-03T00:00:00Z'), resume: 'Club fermé', categorie: 'club' },
  { slug: 'defi', titre: 'Défi', date: new Date('2026-11-21T00:00:00Z'), resume: 'Régate', categorie: 'competition' },
  { slug: 'sans-univers', titre: 'Sans univers', date: new Date('2026-11-22T00:00:00Z'), resume: 'x' },
  { slug: 'ancien', titre: 'Ancien', date: new Date('2026-07-01T00:00:00Z'), resume: 'x', categorie: 'club' },
];
const lignes = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('format', () => {
  test('échappe antislash, point-virgule, virgule et retours à la ligne', () => {
    expect(echapper('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
  test('replie à 75 octets sans couper un caractère UTF-8', () => {
    const plie = plier(`SUMMARY:${'é'.repeat(60)}`);
    for (const l of plie.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(plie.replace(/\r\n /g, '')).toBe(`SUMMARY:${'é'.repeat(60)}`);
  });
});

describe('genererIcs', () => {
  const club = genererIcs(fiches, { canal: 'club', site, maintenant });
  test('enveloppe et nom du calendrier, CRLF', () => {
    expect(club.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(club.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lignes(club)).toContain('X-WR-CALNAME:CNF — Vie du club');
    expect(club).toContain('BEGIN:VTIMEZONE');
  });
  test('rendez-vous avec heure : heure de Paris, 2 h', () => {
    const l = lignes(club);
    expect(l).toContain('DTSTART;TZID=Europe/Paris:20261114T190000');
    expect(l).toContain('DTEND;TZID=Europe/Paris:20261114T210000');
    expect(l).toContain('LOCATION:Au Huit');
    expect(l).toContain('DESCRIPTION:Tous\\, bienvenus\\; venez\\n\\nhttps://www.cnfrance.fr/actualites/aperow/');
    expect(l).toContain('UID:aperow@cnfrance.fr');
    expect(l).toContain('URL:https://www.cnfrance.fr/actualites/aperow/');
  });
  test('plusieurs jours : journées entières, fin exclusive', () => {
    const l = lignes(club);
    expect(l).toContain('DTSTART;VALUE=DATE:20261220');
    expect(l).toContain('DTEND;VALUE=DATE:20270104');
  });
  test('canal : seulement son univers ; tout : y compris sans univers', () => {
    expect(club).not.toContain('SUMMARY:Défi');
    const tout = genererIcs(fiches, { canal: 'tout', site, maintenant });
    expect(tout).toContain('SUMMARY:Défi');
    expect(tout).toContain('SUMMARY:Sans univers');
    expect(lignes(tout)).toContain('X-WR-CALNAME:CNF — Tout le club');
  });
  test('fenêtre : à venir et 90 derniers jours', () => {
    expect(club).not.toContain('SUMMARY:Ancien'); // 1er juillet : plus de 90 jours
    const recent = genererIcs([{ ...fiches[4], date: new Date('2026-09-01T00:00:00Z') }], { canal: 'club', site, maintenant });
    expect(recent).toContain('SUMMARY:Ancien');
  });
  test('les canaux couvrent tout et chaque univers', () => {
    expect(CANAUX.map((c) => c.valeur)).toEqual(['tout', 'competition', 'loisir', 'club']);
  });
});
