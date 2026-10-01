// Sélection des publications Instagram à importer : fonctions pures, sans
// réseau ni système de fichiers.

export type TypeMedia = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export interface EnfantInstagram {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
}

// Champs demandés à GET /me/media (voir clients.ts).
export interface PublicationInstagram {
  id: string;
  caption?: string;
  media_type: TypeMedia;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data: EnfantInstagram[] };
}

const RE_CODE = /instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)/;

// Code court d'une publication : identique dans /p/<code>/ et /reel/<code>/,
// c'est lui qui sert de clé de déduplication.
export function codeDepuisPermalien(url: string): string | null {
  return url.match(RE_CODE)?.[1] ?? null;
}

const RE_CHAMP_INSTAGRAM = /^instagram:\s*["']?([^"'\s]+)["']?\s*$/m;

export function codesDejaImportes(markdowns: string[]): Set<string> {
  const codes = new Set<string>();
  for (const md of markdowns) {
    const url = md.match(RE_CHAMP_INSTAGRAM)?.[1];
    const code = url ? codeDepuisPermalien(url) : null;
    if (code) codes.add(code);
  }
  return codes;
}

// L'API renvoie « 2026-09-14T18:30:00+0000 » : on ajoute le « : » du décalage
// pour un ISO 8601 strict.
function instant(timestamp: string): Date {
  const d = new Date(timestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(d.getTime())) throw new Error(`Horodatage illisible : ${timestamp}`);
  return d;
}

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
});

export function dateParis(timestamp: string): string {
  return JOUR_PARIS.format(instant(timestamp));
}

export function selectionnerNouvelles(
  pubs: PublicationInstagram[],
  o: { depuis: string; codesConnus: Set<string> },
): PublicationInstagram[] {
  return pubs
    .filter((p) => dateParis(p.timestamp) >= o.depuis)
    .filter((p) => {
      const code = codeDepuisPermalien(p.permalink);
      return code !== null && !o.codesConnus.has(code);
    })
    .sort((a, b) => instant(a.timestamp).getTime() - instant(b.timestamp).getTime());
}
