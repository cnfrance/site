import { describe, expect, test } from 'vitest';
import {
  codeDepuisPermalien, codesDejaImportes, dateParis, selectionnerNouvelles,
  type PublicationInstagram,
} from '../../scripts/instagram-sync/selection.ts';

const pub = (code: string, timestamp: string): PublicationInstagram => ({
  id: `id-${code}`, media_type: 'IMAGE', media_url: `https://cdn.test/${code}.jpg`,
  permalink: `https://www.instagram.com/p/${code}/`, timestamp,
});

describe('codeDepuisPermalien', () => {
  test('lit le code des formes /p/, /reel/ et /reels/', () => {
    expect(codeDepuisPermalien('https://www.instagram.com/p/C1a2B3c4D5e/')).toBe('C1a2B3c4D5e');
    expect(codeDepuisPermalien('https://www.instagram.com/reel/DAbc_-12/?igsh=x')).toBe('DAbc_-12');
    expect(codeDepuisPermalien('https://instagram.com/reels/XyZ/')).toBe('XyZ');
  });
  test('renvoie null pour une URL qui n\'est pas une publication', () => {
    expect(codeDepuisPermalien('https://www.instagram.com/cerclenautiquedefrance/')).toBeNull();
  });
});

describe('codesDejaImportes', () => {
  test('lit le champ instagram du frontmatter, avec ou sans guillemets', () => {
    const codes = codesDejaImportes([
      '---\ntitre: "a"\ninstagram: "https://www.instagram.com/p/AAA/"\n---\nTexte',
      '---\ntitre: b\ninstagram: https://www.instagram.com/reel/BBB/\n---\n',
      '---\ntitre: "c"\n---\nPas de lien',
    ]);
    expect([...codes].sort()).toEqual(['AAA', 'BBB']);
  });
});

describe('dateParis', () => {
  test('juge le jour en heure de Paris (format +0000 de l\'API)', () => {
    expect(dateParis('2026-07-09T22:30:00+0000')).toBe('2026-07-10');
    expect(dateParis('2026-12-31T22:59:59+0000')).toBe('2026-12-31');
  });
  test('lève une erreur sur un horodatage illisible', () => {
    expect(() => dateParis('hier')).toThrow(/illisible/);
  });
});

describe('selectionnerNouvelles', () => {
  test('garde les publications depuis la date de départ, inconnues, de la plus ancienne à la plus récente', () => {
    const r = selectionnerNouvelles(
      [
        pub('RECENTE', '2026-09-20T08:00:00+0000'),
        pub('CONNUE', '2026-09-10T08:00:00+0000'),
        pub('LIMITE', '2026-07-09T22:30:00+0000'),
        pub('TROPVIEILLE', '2026-07-09T21:30:00+0000'),
      ],
      { depuis: '2026-07-10', codesConnus: new Set(['CONNUE']) },
    );
    expect(r.map((p) => codeDepuisPermalien(p.permalink))).toEqual(['LIMITE', 'RECENTE']);
  });
  test('écarte une publication sans code lisible', () => {
    const r = selectionnerNouvelles(
      [{ ...pub('X', '2026-09-20T08:00:00+0000'), permalink: 'https://www.instagram.com/' }],
      { depuis: '2026-07-10', codesConnus: new Set() },
    );
    expect(r).toEqual([]);
  });
});
