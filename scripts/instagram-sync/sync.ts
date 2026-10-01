// Orchestration d'un run de synchro : lit le dépôt, interroge Instagram et
// l'IA via les clients injectés, écrit les actus, les photos et les ignorées,
// et rend un rapport (lu par le workflow pour la PR et l'issue d'alerte).
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LIBELLES_CATEGORIE_ACTU, type CategorieActu } from "../../src/lib/categories-actus.ts";
import type { Clients } from "./clients.ts";
import { construireMessages, lireDecision, type ExempleActu } from "./ia.ts";
import { cheminPhoto, legendeEnMarkdown, mediasDe, rendreMarkdown, retirerHashtagsFinaux, slugLibre } from "./redaction.ts";
import { codeDepuisPermalien, codesDejaImportes, dateParis, selectionnerNouvelles } from "./selection.ts";

export interface OptionsSync {
  racine: string;
  depuis: string;
  modele: string;
  jeton: string;
  clients: Clients;
  ecrire: boolean;
  pauseMs?: number;
  seuilAlerteJours?: number;
  // Passage planifié : un rafraîchissement refusé n'est alors plus le cas
  // bénin du jeton de moins de 24 h (testé à la main juste après sa création).
  alerteSiRefusRafraichissement?: boolean;
}

export interface IgnoreeInstagram {
  code: string;
  date: string;
  raison: string;
}

export interface RapportSync {
  // motif : message de l'issue d'alerte, présent quand alerte vaut true.
  jeton: { ok: boolean; alerte: boolean; joursRestants?: number; identique?: boolean; erreur?: string; motif?: string };
  actus: { slug: string; titre: string; categorie: CategorieActu; date: string; instagram: string }[];
  ignorees: (IgnoreeInstagram & { instagram: string })[];
  reportees: { instagram: string; raison: string }[];
}

const DOSSIER_ACTUS = "src/content/actualites";
export const FICHIER_IGNORES = "src/content/site/instagram-ignores.json";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function lireActus(racine: string): Promise<{ slugs: Set<string>; markdowns: string[] }> {
  const dossier = path.join(racine, DOSSIER_ACTUS);
  const fichiers = (await readdir(dossier)).filter((f) => f.endsWith(".md")).sort();
  const markdowns = await Promise.all(fichiers.map((f) => readFile(path.join(dossier, f), "utf8")));
  return { slugs: new Set(fichiers.map((f) => f.slice(0, -3))), markdowns };
}

async function lireIgnores(racine: string): Promise<IgnoreeInstagram[]> {
  try {
    const contenu = JSON.parse(await readFile(path.join(racine, FICHIER_IGNORES), "utf8"));
    return Array.isArray(contenu.ignores) ? contenu.ignores : [];
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") return [];
    throw e;
  }
}

// Quelques titres/résumés réels pour donner le ton à l'IA.
function exemplesDepuis(markdowns: string[]): ExempleActu[] {
  const exemples: ExempleActu[] = [];
  for (const md of markdowns) {
    const titre = md.match(/^titre:\s*"(.*)"\s*$/m)?.[1];
    const resume = md.match(/^resume:\s*"(.*)"\s*$/m)?.[1];
    if (titre && resume) exemples.push({ titre, resume });
  }
  return exemples.slice(-5);
}

export async function synchroniser(o: OptionsSync): Promise<RapportSync> {
  const seuil = o.seuilAlerteJours ?? 15;
  const rapport: RapportSync = { jeton: { ok: false, alerte: true }, actus: [], ignorees: [], reportees: [] };

  // 1. Jeton. Instagram refuse le rafraîchissement d'un jeton de moins de
  // 24 h : on ne conclut à un jeton invalide que si la lecture échoue aussi.
  let erreurRafraichissement: string | undefined;
  try {
    const r = await o.clients.rafraichirJeton(o.jeton);
    const joursRestants = Math.floor(r.expireDansSecondes / 86400);
    const identique = r.jeton === o.jeton;
    rapport.jeton = { ok: true, alerte: false, joursRestants, identique };
    // Un nouveau jeton ne peut pas être réécrit dans les secrets : le jeton
    // stocké n'est alors pas prolongé et finira par expirer.
    if (!identique) {
      rapport.jeton = { ...rapport.jeton, alerte: true, motif: "Instagram a renvoyé un nouveau jeton lors du rafraîchissement : le jeton stocké dans le secret INSTAGRAM_TOKEN n'est pas prolongé. Y reporter un jeton à jour (npm run instagram:token refresh)." };
    } else if (joursRestants < seuil) {
      rapport.jeton = { ...rapport.jeton, alerte: true, motif: `Le jeton Instagram expire dans ${joursRestants} jours.` };
    }
  } catch (e) {
    erreurRafraichissement = message(e);
    rapport.jeton = o.alerteSiRefusRafraichissement
      ? { ok: true, alerte: true, erreur: erreurRafraichissement, motif: `Le rafraîchissement du jeton Instagram a échoué : ${erreurRafraichissement}` }
      : { ok: true, alerte: false, erreur: erreurRafraichissement };
  }

  // 2. Lecture.
  let pubs;
  try {
    pubs = await o.clients.listerPublications(o.jeton, o.depuis);
  } catch (e) {
    if (erreurRafraichissement === undefined) throw e;
    const erreur = `${erreurRafraichissement} / ${message(e)}`;
    rapport.jeton = { ok: false, alerte: true, erreur, motif: `Le jeton Instagram est refusé : ${erreur}` };
    return rapport;
  }

  // 3. Sélection.
  const actus = await lireActus(o.racine);
  const ignores = await lireIgnores(o.racine);
  const codesConnus = codesDejaImportes(actus.markdowns);
  for (const i of ignores) codesConnus.add(i.code);
  const nouvelles = selectionnerNouvelles(pubs, { depuis: o.depuis, codesConnus });
  const exemples = exemplesDepuis(actus.markdowns);
  const slugs = new Set(actus.slugs);

  for (const [n, pub] of nouvelles.entries()) {
    if (n > 0 && o.pauseMs) await new Promise((r) => setTimeout(r, o.pauseMs));
    const code = codeDepuisPermalien(pub.permalink) as string; // garanti par selectionnerNouvelles
    const date = dateParis(pub.timestamp);
    const legende = retirerHashtagsFinaux(pub.caption ?? "");

    // 4. Classement IA.
    let decision;
    try {
      const texte = await o.clients.demanderIA(construireMessages({ legende, type: pub.media_type, date }, exemples), o.modele);
      decision = lireDecision(texte);
    } catch (e) {
      rapport.reportees.push({ instagram: pub.permalink, raison: `IA indisponible : ${message(e)}` });
      continue;
    }
    if (!decision) {
      rapport.reportees.push({ instagram: pub.permalink, raison: "Réponse de l'IA illisible" });
      continue;
    }
    if (!decision.garder) {
      const ignoree = { code, date, raison: decision.raison };
      ignores.push(ignoree);
      rapport.ignorees.push({ ...ignoree, instagram: pub.permalink });
      continue;
    }

    // 5. Photos, toutes téléchargées en mémoire avant d'écrire quoi que ce
    // soit : jamais d'actu ni de dossier partiels.
    const { sources, aUneVideo } = mediasDe(pub);
    if (sources.length === 0) {
      rapport.reportees.push({ instagram: pub.permalink, raison: "Aucune image exploitable" });
      continue;
    }
    const slug = slugLibre(decision.titre, date, slugs);
    const fichiers: { chemin: string; octets: Uint8Array }[] = [];
    try {
      for (const [i, url] of sources.entries()) {
        const { octets, extension } = await o.clients.telecharger(url);
        fichiers.push({ chemin: cheminPhoto(slug, i, extension), octets });
      }
    } catch (e) {
      rapport.reportees.push({ instagram: pub.permalink, raison: `Téléchargement impossible : ${message(e)}` });
      continue;
    }

    slugs.add(slug);
    const markdown = rendreMarkdown({
      slug,
      titre: decision.titre,
      date,
      categorie: decision.categorie,
      resume: decision.resume,
      photos: fichiers.map((f) => f.chemin),
      video: aUneVideo ? pub.permalink : undefined,
      instagram: pub.permalink,
      corps: legendeEnMarkdown(legende),
    });
    if (o.ecrire) {
      await mkdir(path.join(o.racine, "public/medias/actus", slug), { recursive: true });
      for (const f of fichiers) await writeFile(path.join(o.racine, "public", f.chemin), f.octets);
      await writeFile(path.join(o.racine, DOSSIER_ACTUS, `${slug}.md`), markdown);
    }
    rapport.actus.push({ slug, titre: decision.titre, categorie: decision.categorie, date, instagram: pub.permalink });
    // Notée aussi parmi les publications traitées : si l'actu est supprimée de
    // la PR, elle ne revient pas la semaine suivante.
    ignores.push({ code, date, raison: `Importée en actu (${slug})` });
  }

  if (o.ecrire && rapport.ignorees.length + rapport.actus.length > 0) {
    await writeFile(path.join(o.racine, FICHIER_IGNORES), `${JSON.stringify({ ignores }, null, 2)}\n`);
  }
  return rapport;
}

// Passage à faire échouer : des publications étaient à traiter et aucune n'a
// pu l'être (GitHub Models indisponible, quota épuisé, modèle retiré…).
export function echecGlobal(r: RapportSync): string | null {
  if (r.reportees.length === 0 || r.actus.length + r.ignorees.length > 0) return null;
  return `Aucune publication n'a pu être traitée (${r.reportees.length} reportée(s)), par exemple : ${r.reportees[0].raison}`;
}

const cellule = (s: string) => s.replace(/\|/g, "\\|");

export function corpsPR(r: RapportSync): string {
  const l = [
    "Publications Instagram synchronisées automatiquement.",
    "",
    "**Relire les titres, résumés et catégories proposés par l'IA (et corriger directement dans cette PR si besoin) : la fusion met le site en ligne.**",
    "",
  ];
  if (r.jeton.ok && r.jeton.alerte && r.jeton.motif) {
    l.push(`> ⚠️ ${r.jeton.motif} Voir l'issue « Jeton Instagram à renouveler ».`, "");
  }
  l.push(`### Actualités proposées (${r.actus.length})`, "");
  if (r.actus.length > 0) {
    l.push("| Date | Titre | Catégorie | Instagram |", "| --- | --- | --- | --- |");
    for (const a of r.actus) {
      l.push(`| ${a.date} | ${cellule(a.titre)} | ${LIBELLES_CATEGORIE_ACTU[a.categorie]} | [voir](${a.instagram}) |`);
    }
  } else {
    l.push("Aucune.");
  }
  l.push("", `### Publications ignorées (${r.ignorees.length})`, "");
  if (r.ignorees.length > 0) {
    for (const i of r.ignorees) l.push(`- ${i.date} — [publication](${i.instagram}) : ${i.raison}`);
  } else {
    l.push("Aucune.");
  }
  l.push(
    "",
    "Pour écarter une actu proposée : supprimer son fichier et son dossier de photos, elle ne reviendra pas. Pour reproposer une publication (ignorée ou écartée) : retirer sa ligne de `src/content/site/instagram-ignores.json`.",
  );
  if (r.reportees.length > 0) {
    l.push("", `### Publications reportées (${r.reportees.length})`, "", "Retentées au prochain passage :", "");
    for (const x of r.reportees) l.push(`- [publication](${x.instagram}) : ${x.raison}`);
  }
  return `${l.join("\n")}\n`;
}
