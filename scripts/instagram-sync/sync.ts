// Orchestration d'un run de synchro : lit le dépôt, interroge Instagram et
// l'IA via les clients injectés, écrit les actus, les photos et les ignorées,
// et rend un rapport (lu par le workflow pour la PR et l'issue d'alerte).
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LIBELLES_CATEGORIE_ACTU, type CategorieActu } from "../../src/lib/categories-actus.ts";
import type { Clients } from "./clients.ts";
import { construireMessages, lireDecision, type ExempleActu } from "./ia.ts";
import { cheminPhoto, mediasDe, rendreMarkdown, retirerHashtagsFinaux, slugLibre } from "./redaction.ts";
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
}

export interface IgnoreeInstagram {
  code: string;
  date: string;
  raison: string;
}

export interface RapportSync {
  jeton: { ok: boolean; alerte: boolean; joursRestants?: number; identique?: boolean; erreur?: string };
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
    rapport.jeton = { ok: true, alerte: joursRestants < seuil, joursRestants, identique: r.jeton === o.jeton };
  } catch (e) {
    erreurRafraichissement = message(e);
    rapport.jeton = { ok: true, alerte: false, erreur: erreurRafraichissement };
  }

  // 2. Lecture.
  let pubs;
  try {
    pubs = await o.clients.listerPublications(o.jeton, o.depuis);
  } catch (e) {
    if (erreurRafraichissement === undefined) throw e;
    rapport.jeton = { ok: false, alerte: true, erreur: `${erreurRafraichissement} / ${message(e)}` };
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
      corps: legende,
    });
    if (o.ecrire) {
      await mkdir(path.join(o.racine, "public/medias/actus", slug), { recursive: true });
      for (const f of fichiers) await writeFile(path.join(o.racine, "public", f.chemin), f.octets);
      await writeFile(path.join(o.racine, DOSSIER_ACTUS, `${slug}.md`), markdown);
    }
    rapport.actus.push({ slug, titre: decision.titre, categorie: decision.categorie, date, instagram: pub.permalink });
  }

  if (o.ecrire && rapport.ignorees.length > 0) {
    await writeFile(path.join(o.racine, FICHIER_IGNORES), `${JSON.stringify({ ignores }, null, 2)}\n`);
  }
  return rapport;
}

const cellule = (s: string) => s.replace(/\|/g, "\\|");

export function corpsPR(r: RapportSync): string {
  const l = [
    "Publications Instagram synchronisées automatiquement.",
    "",
    "**Relire les titres, résumés et catégories proposés par l'IA (et corriger directement dans cette PR si besoin) : la fusion met le site en ligne.**",
    "",
  ];
  if (r.jeton.ok && r.jeton.alerte) {
    l.push(`> ⚠️ Le jeton Instagram expire dans ${r.jeton.joursRestants} jours : voir l'issue « Jeton Instagram à renouveler ».`, "");
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
    l.push("", "Pour en reproposer une : retirer sa ligne de `src/content/site/instagram-ignores.json` (dans cette PR ou après fusion).");
  } else {
    l.push("Aucune.");
  }
  if (r.reportees.length > 0) {
    l.push("", `### Publications reportées (${r.reportees.length})`, "", "Retentées au prochain passage :", "");
    for (const x of r.reportees) l.push(`- [publication](${x.instagram}) : ${x.raison}`);
  }
  return `${l.join("\n")}\n`;
}
