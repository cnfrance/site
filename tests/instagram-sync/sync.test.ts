import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Clients } from '../../scripts/instagram-sync/clients.ts';
import type { PublicationInstagram } from '../../scripts/instagram-sync/selection.ts';
import {
  corpsPR, echecGlobal, FICHIER_IGNORES, synchroniser, type OptionsSync, type RapportSync,
} from '../../scripts/instagram-sync/sync.ts';

async function depot(actus: Record<string, string> = {}): Promise<string> {
  const racine = await mkdtemp(path.join(tmpdir(), 'ig-sync-'));
  await mkdir(path.join(racine, 'src/content/actualites'), { recursive: true });
  await mkdir(path.join(racine, 'src/content/site'), { recursive: true });
  await writeFile(path.join(racine, FICHIER_IGNORES), '{\n  "ignores": []\n}\n');
  for (const [slug, md] of Object.entries(actus)) {
    await writeFile(path.join(racine, 'src/content/actualites', `${slug}.md`), md);
  }
  return racine;
}

const pub = (code: string, extra: Partial<PublicationInstagram> = {}): PublicationInstagram => ({
  id: `id-${code}`,
  caption: `Légende ${code}\n\n#aviron #cnf`,
  media_type: 'IMAGE',
  media_url: `https://cdn.test/${code}.jpg`,
  permalink: `https://www.instagram.com/p/${code}/`,
  timestamp: '2026-09-14T10:00:00+0000',
  ...extra,
});

const GARDER = JSON.stringify({ garder: true, raison: 'compte rendu', titre: 'Régate de test', resume: 'Une régate.', categorie: 'competition' });

function faux(o: {
  pubs?: PublicationInstagram[];
  ia?: (messageUtilisateur: string) => string;
  rafraichir?: Clients['rafraichirJeton'];
  lister?: Clients['listerPublications'];
  telecharger?: Clients['telecharger'];
} = {}): Clients {
  return {
    rafraichirJeton: o.rafraichir ?? (async (j) => ({ jeton: j, expireDansSecondes: 50 * 86400 })),
    listerPublications: o.lister ?? (async () => o.pubs ?? []),
    demanderIA: async (messages) => (o.ia ?? (() => GARDER))(messages[1].content),
    telecharger: o.telecharger ?? (async () => ({ octets: new Uint8Array([1, 2, 3]), extension: 'jpg' })),
  };
}

const options = (racine: string, clients: Clients, extra: Partial<OptionsSync> = {}): OptionsSync => ({
  racine, depuis: '2026-07-10', modele: 'test', jeton: 'JETON', clients, ecrire: true, ...extra,
});

const lire = (racine: string, rel: string) => readFile(path.join(racine, rel), 'utf8');

describe('synchroniser', () => {
  test('écrit l\'actu (légende sans hashtags) et ses photos', async () => {
    const racine = await depot();
    const r = await synchroniser(options(racine, faux({ pubs: [pub('AAA')] })));
    expect(r.actus).toEqual([{ slug: 'regate-de-test', titre: 'Régate de test', categorie: 'competition', date: '2026-09-14', instagram: 'https://www.instagram.com/p/AAA/' }]);
    const md = await lire(racine, 'src/content/actualites/regate-de-test.md');
    expect(md).toContain('instagram: "https://www.instagram.com/p/AAA/"');
    expect(md).toContain('image: "/medias/actus/regate-de-test/01.jpg"');
    expect(md.endsWith('---\nLégende AAA\n')).toBe(true);
    expect(await readdir(path.join(racine, 'public/medias/actus/regate-de-test'))).toEqual(['01.jpg']);
  });

  test('une publication importée n\'est pas reproposée au run suivant', async () => {
    const racine = await depot();
    await synchroniser(options(racine, faux({ pubs: [pub('AAA')] })));
    const r = await synchroniser(options(racine, faux({ pubs: [pub('AAA')] })));
    expect(r.actus).toEqual([]);
  });

  test('une publication écartée par l\'IA est notée dans les ignorées et n\'est plus reproposée', async () => {
    const racine = await depot();
    const ia = () => JSON.stringify({ garder: false, raison: 'annonce d\'horaires' });
    const r = await synchroniser(options(racine, faux({ pubs: [pub('BBB')], ia })));
    expect(r.ignorees).toEqual([{ code: 'BBB', date: '2026-09-14', raison: 'annonce d\'horaires', instagram: 'https://www.instagram.com/p/BBB/' }]);
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES))).toEqual({ ignores: [{ code: 'BBB', date: '2026-09-14', raison: 'annonce d\'horaires' }] });
    expect(await readdir(path.join(racine, 'src/content/actualites'))).toEqual([]);
    const r2 = await synchroniser(options(racine, faux({ pubs: [pub('BBB')] })));
    expect(r2.actus).toEqual([]);
  });

  test('réponse IA illisible ou IA en panne : publication reportée, ni écrite ni ignorée', async () => {
    const racine = await depot();
    const clients = faux({ pubs: [pub('CCC'), pub('DDD', { timestamp: '2026-09-15T10:00:00+0000' })] });
    clients.demanderIA = async (messages) => {
      if (messages[1].content.includes('CCC')) return 'pas du JSON';
      throw new Error('quota dépassé');
    };
    const r = await synchroniser(options(racine, clients));
    expect(r.reportees.map((x) => x.instagram)).toEqual(['https://www.instagram.com/p/CCC/', 'https://www.instagram.com/p/DDD/']);
    expect(r.reportees[1].raison).toContain('quota dépassé');
    expect(r.actus).toEqual([]);
    expect(r.ignorees).toEqual([]);
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES))).toEqual({ ignores: [] });
  });

  test('une photo impossible à télécharger reporte toute la publication, sans fichier partiel', async () => {
    const racine = await depot();
    const carrousel = pub('EEE', {
      media_type: 'CAROUSEL_ALBUM', media_url: undefined,
      children: { data: [
        { id: '1', media_type: 'IMAGE', media_url: 'https://cdn.test/ok.jpg' },
        { id: '2', media_type: 'IMAGE', media_url: 'https://cdn.test/ko.jpg' },
      ] },
    });
    const telecharger: Clients['telecharger'] = async (url) => {
      if (url.includes('ko')) throw new Error('HTTP 403');
      return { octets: new Uint8Array([1]), extension: 'jpg' };
    };
    const r = await synchroniser(options(racine, faux({ pubs: [carrousel], telecharger })));
    expect(r.reportees).toEqual([{ instagram: 'https://www.instagram.com/p/EEE/', raison: 'Téléchargement impossible : HTTP 403' }]);
    expect(await readdir(path.join(racine, 'src/content/actualites'))).toEqual([]);
    await expect(readdir(path.join(racine, 'public/medias/actus/regate-de-test'))).rejects.toThrow();
  });

  test('deux publications au même titre le même jour obtiennent deux slugs distincts', async () => {
    const racine = await depot();
    const r = await synchroniser(options(racine, faux({ pubs: [pub('F1'), pub('F2', { timestamp: '2026-09-14T12:00:00+0000' })] })));
    expect(r.actus.map((a) => a.slug)).toEqual(['regate-de-test', 'regate-de-test-2026-09-14']);
  });

  test('vidéo : la miniature va dans les photos et le permalien dans videos', async () => {
    const racine = await depot();
    const video = pub('GGG', { media_type: 'VIDEO', media_url: 'https://cdn.test/v.mp4', thumbnail_url: 'https://cdn.test/v.jpg', permalink: 'https://www.instagram.com/reel/GGG/' });
    await synchroniser(options(racine, faux({ pubs: [video] })));
    const md = await lire(racine, 'src/content/actualites/regate-de-test.md');
    expect(md).toContain('videos:\n  - lien: "https://www.instagram.com/reel/GGG/"');
  });

  test('essai à blanc : rapport complet, rien d\'écrit', async () => {
    const racine = await depot();
    const ia = (m: string) => (m.includes('HHH') ? GARDER : JSON.stringify({ garder: false, raison: 'repost' }));
    const r = await synchroniser(options(racine, faux({ pubs: [pub('HHH'), pub('III')], ia }), { ecrire: false }));
    expect(r.actus).toHaveLength(1);
    expect(r.ignorees).toHaveLength(1);
    expect(await readdir(path.join(racine, 'src/content/actualites'))).toEqual([]);
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES))).toEqual({ ignores: [] });
    await expect(readdir(path.join(racine, 'public'))).rejects.toThrow();
  });

  test('les actus existantes servent d\'exemples à l\'IA', async () => {
    const racine = await depot({ yolecup: '---\ntitre: "Yolecup 2025"\nresume: "Le CNF 1 gagne."\n---\n' });
    const clients = faux({ pubs: [pub('JJJ')] });
    let systeme = '';
    clients.demanderIA = async (messages) => { systeme = messages[0].content; return GARDER; };
    await synchroniser(options(racine, clients));
    expect(systeme).toContain('Yolecup 2025');
  });
});

describe('synchroniser — corrections de la relecture', () => {
  test('la légende est écrite avec des sauts de ligne forcés et la syntaxe Markdown neutralisée', async () => {
    const racine = await depot();
    await synchroniser(options(racine, faux({ pubs: [pub('MMM', { caption: 'Équipage :\n---\nLéonie\n#cnf' })] })));
    const md = await lire(racine, 'src/content/actualites/regate-de-test.md');
    expect(md.endsWith('---\nÉquipage :\\\n\\---\\\nLéonie\n')).toBe(true);
  });

  test('une actu supprimée de la PR n\'est pas reproposée : les publications importées sont notées dans le fichier des traitées', async () => {
    const racine = await depot();
    await synchroniser(options(racine, faux({ pubs: [pub('NNN')] })));
    expect(JSON.parse(await lire(racine, FICHIER_IGNORES)).ignores).toEqual([
      { code: 'NNN', date: '2026-09-14', raison: 'Importée en actu (regate-de-test)' },
    ]);
    const { rm } = await import('node:fs/promises');
    await rm(path.join(racine, 'src/content/actualites/regate-de-test.md'));
    const r = await synchroniser(options(racine, faux({ pubs: [pub('NNN')] })));
    expect(r.actus).toEqual([]);
  });
});

describe('synchroniser — jeton', () => {
  test('jeton rafraîchi, identique, loin de l\'expiration : pas d\'alerte', async () => {
    const r = await synchroniser(options(await depot(), faux()));
    expect(r.jeton).toEqual({ ok: true, alerte: false, joursRestants: 50, identique: true });
  });

  test('rafraîchissement qui renvoie un nouveau jeton : alerte, car le jeton stocké n\'est pas prolongé', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => ({ jeton: 'NOUVEAU', expireDansSecondes: 59 * 86400 });
    const r = await synchroniser(options(await depot(), faux({ rafraichir })));
    expect(r.jeton.ok).toBe(true);
    expect(r.jeton.alerte).toBe(true);
    expect(r.jeton.motif).toContain('nouveau jeton');
  });

  test('rafraîchissement refusé lors d\'un passage planifié : alerte même si la lecture fonctionne', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => { throw new Error('permission manquante'); };
    const r = await synchroniser(options(await depot(), faux({ rafraichir }), { alerteSiRefusRafraichissement: true }));
    expect(r.jeton.ok).toBe(true);
    expect(r.jeton.alerte).toBe(true);
    expect(r.jeton.motif).toContain('permission manquante');
  });

  test('expiration dans moins de 15 jours : alerte, mais le run continue', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async (j) => ({ jeton: j, expireDansSecondes: 10 * 86400 });
    const r = await synchroniser(options(await depot(), faux({ pubs: [pub('KKK')], rafraichir })));
    expect(r.jeton).toMatchObject({ ok: true, alerte: true, joursRestants: 10, identique: true });
    expect(r.jeton.motif).toContain('expire dans 10 jours');
    expect(r.actus).toHaveLength(1);
  });

  test('rafraîchissement refusé (jeton de moins de 24 h) mais lecture possible : pas d\'alerte', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => { throw new Error('token too young'); };
    const r = await synchroniser(options(await depot(), faux({ pubs: [pub('LLL')], rafraichir })));
    expect(r.jeton).toEqual({ ok: true, alerte: false, erreur: 'token too young' });
    expect(r.actus).toHaveLength(1);
  });

  test('rafraîchissement et lecture refusés : jeton invalide, alerte, aucun traitement', async () => {
    const rafraichir: Clients['rafraichirJeton'] = async () => { throw new Error('expired'); };
    const lister: Clients['listerPublications'] = async () => { throw new Error('invalid token'); };
    const r = await synchroniser(options(await depot(), faux({ rafraichir, lister })));
    expect(r.jeton).toMatchObject({ ok: false, alerte: true, erreur: 'expired / invalid token' });
    expect(r.jeton.motif).toContain('refusé');
    expect(r.actus).toEqual([]);
  });

  test('jeton valide mais API en panne : le run échoue', async () => {
    const lister: Clients['listerPublications'] = async () => { throw new Error('HTTP 500'); };
    await expect(synchroniser(options(await depot(), faux({ lister })))).rejects.toThrow('HTTP 500');
  });
});

describe('corpsPR', () => {
  const rapport: RapportSync = {
    jeton: { ok: true, alerte: true, joursRestants: 9, identique: true, motif: 'Le jeton Instagram expire dans 9 jours.' },
    actus: [{ slug: 's', titre: 'Titre | avec barre', categorie: 'loisir', date: '2026-09-14', instagram: 'https://www.instagram.com/p/A/' }],
    ignorees: [{ code: 'B', date: '2026-09-15', raison: 'repost', instagram: 'https://www.instagram.com/p/B/' }],
    reportees: [{ instagram: 'https://www.instagram.com/p/C/', raison: 'Réponse de l\'IA illisible' }],
  };
  const corps = corpsPR(rapport);

  test('rappelle de relire avant de fusionner', () => {
    expect(corps).toContain('la fusion met le site en ligne');
  });
  test('tableau des actus avec libellé de catégorie et barre échappée', () => {
    expect(corps).toContain('| 2026-09-14 | Titre \\| avec barre | Loisir & randonnées | [voir](https://www.instagram.com/p/A/) |');
  });
  test('liste les ignorées, les reportées et l\'alerte du jeton', () => {
    expect(corps).toContain('[publication](https://www.instagram.com/p/B/) : repost');
    expect(corps).toContain('instagram-ignores.json');
    expect(corps).toContain('[publication](https://www.instagram.com/p/C/) : Réponse de l\'IA illisible');
    expect(corps).toContain('expire dans 9 jours');
  });
  test('sections vides signalées', () => {
    const vide = corpsPR({ jeton: { ok: true, alerte: false }, actus: [], ignorees: [], reportees: [] });
    expect(vide).toContain('Aucune.');
    expect(vide).not.toContain('expire dans');
  });
});

describe('echecGlobal', () => {
  const base: RapportSync = { jeton: { ok: true, alerte: false }, actus: [], ignorees: [], reportees: [] };
  const reportee = { instagram: 'https://www.instagram.com/p/A/', raison: 'IA indisponible : HTTP 403' };
  test('toutes les publications reportées : le passage est un échec', () => {
    expect(echecGlobal({ ...base, reportees: [reportee] })).toContain('HTTP 403');
  });
  test('au moins une publication traitée, ou rien à traiter : pas d\'échec', () => {
    expect(echecGlobal(base)).toBeNull();
    expect(echecGlobal({ ...base, reportees: [reportee], ignorees: [{ code: 'B', date: 'd', raison: 'r', instagram: 'u' }] })).toBeNull();
  });
});
