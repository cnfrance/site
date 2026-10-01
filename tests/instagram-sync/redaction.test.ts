import { describe, expect, test } from 'vitest';
import { actualiteSchema } from '../../src/content.config';
import {
  cheminPhoto, mediasDe, rendreMarkdown, retirerHashtagsFinaux, slugifier, slugLibre,
  type ActuGeneree,
} from '../../scripts/instagram-sync/redaction.ts';
import type { PublicationInstagram } from '../../scripts/instagram-sync/selection.ts';

describe('retirerHashtagsFinaux', () => {
  test('retire les lignes finales de hashtags et de mentions, et les lignes de points', () => {
    const legende = 'Belle régate !\n\nMerci @coach 💪\n.\n.\n#aviron #cnf\n@ffaviron #rowing';
    expect(retirerHashtagsFinaux(legende)).toBe('Belle régate !\n\nMerci @coach 💪');
  });
  test('garde les hashtags dans le corps du texte', () => {
    expect(retirerHashtagsFinaux('Victoire au #championnat\nBravo à tous')).toBe('Victoire au #championnat\nBravo à tous');
  });
  test('une légende faite uniquement de hashtags devient vide', () => {
    expect(retirerHashtagsFinaux('#aviron #cnf')).toBe('');
    expect(retirerHashtagsFinaux('')).toBe('');
  });
  test('normalise les fins de ligne Windows', () => {
    expect(retirerHashtagsFinaux('Ligne 1\r\nLigne 2\r\n#cnf')).toBe('Ligne 1\nLigne 2');
  });
});

describe('slug', () => {
  test('translittère et met en tirets', () => {
    expect(slugifier('Championnats de France U17 — Libourne !')).toBe('championnats-de-france-u17-libourne');
    expect(slugifier('Régate d\'Été à Mâcon')).toBe('regate-d-ete-a-macon');
  });
  test('limite la longueur sans tiret final', () => {
    const s = slugifier('a'.repeat(79) + ' b c');
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith('-')).toBe(false);
  });
  test('un titre sans lettres donne un slug de repli daté', () => {
    expect(slugLibre('🚣🔥', '2026-09-14', new Set())).toBe('actu-instagram-2026-09-14');
  });
  test('en cas de collision : suffixe de date, puis numéro', () => {
    const existants = new Set(['regate', 'regate-2026-09-14']);
    expect(slugLibre('Régate', '2026-09-14', new Set())).toBe('regate');
    expect(slugLibre('Régate', '2026-09-14', new Set(['regate']))).toBe('regate-2026-09-14');
    expect(slugLibre('Régate', '2026-09-14', existants)).toBe('regate-2026-09-14-2');
  });
});

describe('mediasDe', () => {
  const base = { id: '1', permalink: 'https://www.instagram.com/p/X/', timestamp: '2026-09-14T10:00:00+0000' };
  test('image seule', () => {
    const p: PublicationInstagram = { ...base, media_type: 'IMAGE', media_url: 'https://cdn/i.jpg' };
    expect(mediasDe(p)).toEqual({ sources: ['https://cdn/i.jpg'], aUneVideo: false });
  });
  test('vidéo : sa miniature sert de photo', () => {
    const p: PublicationInstagram = { ...base, media_type: 'VIDEO', media_url: 'https://cdn/v.mp4', thumbnail_url: 'https://cdn/v.jpg' };
    expect(mediasDe(p)).toEqual({ sources: ['https://cdn/v.jpg'], aUneVideo: true });
  });
  test('carrousel mixte, enfant vidéo sans miniature ignoré', () => {
    const p: PublicationInstagram = {
      ...base, media_type: 'CAROUSEL_ALBUM',
      children: { data: [
        { id: 'a', media_type: 'IMAGE', media_url: 'https://cdn/a.jpg' },
        { id: 'b', media_type: 'VIDEO', thumbnail_url: 'https://cdn/b.jpg' },
        { id: 'c', media_type: 'VIDEO' },
      ] },
    };
    expect(mediasDe(p)).toEqual({ sources: ['https://cdn/a.jpg', 'https://cdn/b.jpg'], aUneVideo: true });
  });
});

describe('rendreMarkdown', () => {
  const actu: ActuGeneree = {
    slug: 'regate', titre: 'Régate : le "huit" gagne', date: '2026-09-14', categorie: 'competition',
    resume: 'Résumé avec « guillemets » et : deux-points', photos: [cheminPhoto('regate', 0, 'jpg'), cheminPhoto('regate', 1, 'png')],
    video: 'https://www.instagram.com/reel/ABC/', instagram: 'https://www.instagram.com/reel/ABC/',
    corps: 'Ligne 1\n---\nLigne 2',
  };

  test('chemins des photos numérotés sur deux chiffres', () => {
    expect(cheminPhoto('regate', 0, 'jpg')).toBe('/medias/actus/regate/01.jpg');
    expect(cheminPhoto('regate', 11, 'webp')).toBe('/medias/actus/regate/12.webp');
  });

  test('produit un frontmatter conforme à actualiteSchema, valeurs intactes', () => {
    const md = rendreMarkdown(actu);
    const [, front] = md.split(/^---$/m);
    const donnees: Record<string, unknown> = {};
    let liste: string | null = null;
    for (const ligne of front.trim().split('\n')) {
      const item = ligne.match(/^  - (?:lien: )?(.*)$/);
      if (item && liste) {
        const v = JSON.parse(item[1]);
        (donnees[liste] as unknown[]).push(liste === 'videos' ? { lien: v } : v);
        continue;
      }
      const [, cle, valeur] = ligne.match(/^(\w+):\s*(.*)$/)!;
      if (valeur === '') { liste = cle; donnees[cle] = []; continue; }
      donnees[cle] = cle === 'date' ? valeur : JSON.parse(valeur);
    }
    const a = actualiteSchema.parse(donnees);
    expect(a.titre).toBe('Régate : le "huit" gagne');
    expect(a.resume).toBe('Résumé avec « guillemets » et : deux-points');
    expect(a.image).toBe('/medias/actus/regate/01.jpg');
    expect(a.photos).toEqual(['/medias/actus/regate/01.jpg', '/medias/actus/regate/02.png']);
    expect(a.videos).toEqual([{ lien: 'https://www.instagram.com/reel/ABC/' }]);
    expect(a.instagram).toBe('https://www.instagram.com/reel/ABC/');
    expect(md.endsWith('---\nLigne 1\n---\nLigne 2\n')).toBe(true);
  });

  test('sans vidéo ni corps : pas de bloc videos, pas de texte', () => {
    const md = rendreMarkdown({ ...actu, video: undefined, corps: '' });
    expect(md).not.toContain('videos:');
    expect(md.endsWith('---\n')).toBe(true);
  });
});
