import { describe, expect, test } from 'vitest';
import { construireMessages, lireDecision } from '../../scripts/instagram-sync/ia.ts';

describe('construireMessages', () => {
  const m = construireMessages(
    { legende: 'Belle régate à Mâcon', type: 'CAROUSEL_ALBUM', date: '2026-05-08' },
    [{ titre: 'Yolecup 2025', resume: 'Le CNF 1 remporte la Yolecup.' }],
  );
  test('un message système puis un message utilisateur', () => {
    expect(m.map((x) => x.role)).toEqual(['system', 'user']);
  });
  test('le système liste les catégories, interdit d\'inventer, exige du JSON et cite les exemples', () => {
    expect(m[0].content).toContain('"competition"');
    expect(m[0].content).toContain('"loisir"');
    expect(m[0].content).toContain('"club"');
    expect(m[0].content).toContain("N'invente rien");
    expect(m[0].content).toContain('JSON');
    expect(m[0].content).toContain('Yolecup 2025');
  });
  test('l\'utilisateur porte la date, le type et la légende', () => {
    expect(m[1].content).toContain('2026-05-08');
    expect(m[1].content).toContain('CAROUSEL_ALBUM');
    expect(m[1].content).toContain('Belle régate à Mâcon');
  });
  test('légende vide signalée explicitement', () => {
    const v = construireMessages({ legende: '', type: 'IMAGE', date: '2026-05-08' }, []);
    expect(v[1].content).toContain('(aucune légende)');
  });
});

describe('lireDecision', () => {
  test('actu à garder', () => {
    expect(lireDecision('{"garder":true,"raison":"compte rendu","titre":" Régate ","resume":"Une régate.","categorie":"competition"}'))
      .toEqual({ garder: true, raison: 'compte rendu', titre: 'Régate', resume: 'Une régate.', categorie: 'competition' });
  });
  test('publication à ignorer : les autres champs sont facultatifs', () => {
    expect(lireDecision('{"garder":false,"raison":"annonce d\'horaires"}'))
      .toEqual({ garder: false, raison: "annonce d'horaires" });
  });
  test('accepte un JSON entouré d\'un bloc de code markdown', () => {
    expect(lireDecision('```json\n{"garder":false,"raison":"repost"}\n```')).toEqual({ garder: false, raison: 'repost' });
  });
  test.each([
    ['texte libre', 'Oui, c\'est une actu'],
    ['pas un objet', '[1,2]'],
    ['garder non booléen', '{"garder":"oui","raison":"x"}'],
    ['raison vide', '{"garder":false,"raison":"  "}'],
    ['titre manquant', '{"garder":true,"raison":"x","resume":"r","categorie":"club"}'],
    ['catégorie inconnue', '{"garder":true,"raison":"x","titre":"t","resume":"r","categorie":"peche"}'],
  ])('réponse inexploitable (%s) → null', (_cas, texte) => {
    expect(lireDecision(texte)).toBeNull();
  });
});
