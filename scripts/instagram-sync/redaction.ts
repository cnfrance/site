// Transformation d'une publication Instagram en actualité du site : fonctions
// pures. La légende reste brute (décision de la spec) : seul le bloc final de
// hashtags/mentions est retiré.
import type { CategorieActu } from "../../src/lib/categories-actus.ts";
import type { EnfantInstagram, PublicationInstagram } from "./selection.ts";

// Ligne « décorative » : rien d'autre que des hashtags, des mentions, des
// points ou des puces (les « . » empilés qu'on voit souvent avant les hashtags).
function estDecorative(ligne: string): boolean {
  return ligne.replace(/[#@][^\s]+/gu, "").replace(/[\s.·•…_-]/gu, "") === "";
}

export function retirerHashtagsFinaux(legende: string): string {
  const lignes = legende.replace(/\r\n/g, "\n").split("\n");
  while (lignes.length > 0 && estDecorative(lignes[lignes.length - 1])) lignes.pop();
  return lignes.join("\n").trim();
}

// La légende reste brute pour le lecteur : on neutralise la syntaxe Markdown
// (une légende Instagram n'en contient pas volontairement) et on garde chaque
// retour à la ligne, que Markdown fusionnerait sinon en une espace.
function echapperLigne(ligne: string): string {
  return ligne
    .replace(/[\\`*_[\]<>#&|~]/g, "\\$&")
    .replace(/^(\s*)([-+=])/, "$1\\$2")
    .replace(/^(\s*\d+)([.)])/, "$1\\$2");
}

export function legendeEnMarkdown(legende: string): string {
  if (!legende) return "";
  return legende
    .split(/\n{2,}/)
    .map((bloc) => bloc.split("\n").map(echapperLigne).join("\\\n"))
    .join("\n\n");
}

export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export function slugLibre(titre: string, date: string, existants: Set<string>): string {
  const base = slugifier(titre) || `actu-instagram-${date}`;
  if (!existants.has(base)) return base;
  const avecDate = base.endsWith(date) ? base : `${base}-${date}`;
  if (!existants.has(avecDate)) return avecDate;
  for (let n = 2; ; n++) {
    const candidat = `${avecDate}-${n}`;
    if (!existants.has(candidat)) return candidat;
  }
}

export interface MediasPublication {
  sources: string[];
  aUneVideo: boolean;
}

// Images à télécharger, dans l'ordre de la publication. Une vidéo contribue
// sa miniature (son media_url est un MP4 signé et temporaire).
export function mediasDe(pub: PublicationInstagram): MediasPublication {
  const elements: Array<PublicationInstagram | EnfantInstagram> =
    pub.media_type === "CAROUSEL_ALBUM" ? pub.children?.data ?? [] : [pub];
  const sources: string[] = [];
  let aUneVideo = false;
  for (const e of elements) {
    if (e.media_type === "VIDEO") {
      aUneVideo = true;
      if (e.thumbnail_url) sources.push(e.thumbnail_url);
    } else if (e.media_url) {
      sources.push(e.media_url);
    }
  }
  return { sources, aUneVideo };
}

export function cheminPhoto(slug: string, index: number, extension: string): string {
  return `/medias/actus/${slug}/${String(index + 1).padStart(2, "0")}.${extension}`;
}

export interface ActuGeneree {
  slug: string;
  titre: string;
  date: string;
  categorie: CategorieActu;
  resume: string;
  photos: string[];
  video?: string;
  instagram: string;
  corps: string;
}

// Les chaînes sont écrites en JSON : un JSON est un scalaire YAML entre
// guillemets valide, quels que soient les guillemets, deux-points ou emojis.
const q = (s: string) => JSON.stringify(s);

export function rendreMarkdown(a: ActuGeneree): string {
  const lignes = [
    "---",
    `titre: ${q(a.titre)}`,
    `date: ${a.date}`,
    `categorie: ${q(a.categorie)}`,
    `resume: ${q(a.resume)}`,
  ];
  if (a.photos.length > 0) {
    lignes.push(`image: ${q(a.photos[0])}`, "photos:", ...a.photos.map((p) => `  - ${q(p)}`));
  }
  if (a.video) lignes.push("videos:", `  - lien: ${q(a.video)}`);
  lignes.push(`instagram: ${q(a.instagram)}`, "---", "");
  return lignes.join("\n") + (a.corps ? `${a.corps}\n` : "");
}
