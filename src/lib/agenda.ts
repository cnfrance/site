// Règles d'affichage des fiches « Actualités & événements »
// (docs/superpowers/specs/2026-10-30-actus-evenements-unifies-design.md).
//
// Heure murale : le CMS écrit des dates sans fuseau (« 2026-10-27T19:00 »),
// lues en UTC (process.env.TZ = "UTC" dans astro.config.mjs et
// vitest.config.ts). Une date de fiche porte donc l'heure de Paris dans ses
// champs UTC : on la lit avec les accesseurs UTC, jamais en Europe/Paris.

export interface Datee {
  date: Date;
  dateFin?: Date | null;
}

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
});

/** Jour civil d'aujourd'hui à Paris, « AAAA-MM-JJ ». */
export function aujourdhuiParis(maintenant: Date = new Date()): string {
  return JOUR_PARIS.format(maintenant);
}

/** Jour mural d'une date de fiche, « AAAA-MM-JJ ». */
export function jourMural(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function finDe(f: Datee): Date {
  return f.dateFin ?? f.date;
}

export function estAVenir(f: Datee, aujourdhui: string): boolean {
  return jourMural(finDe(f)) >= aujourdhui;
}

/** Fiche à montrer parmi les actualités : passée et dotée d'un compte rendu. */
export function dansLeFil(f: Datee, corps: string | undefined, aujourdhui: string): boolean {
  return !estAVenir(f, aujourdhui) && (corps ?? "").trim() !== "";
}

/** « 19 h », « 9 h 30 » ; null quand aucune heure n'a été saisie (minuit). */
export function heureDe(d: Date): string | null {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h === 0 && m === 0) return null;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jour = (n: number) => (n === 1 ? "1er" : String(n));

/** « 14 juin 2026 », « 11–12 juillet 2026 », « 30 juin – 2 juillet 2026 », « 20 décembre 2026 – 3 janvier 2027 ». */
export function plageDates(debut: Date, fin?: Date | null): string {
  const b = fin ?? debut;
  const [ja, ma, aa] = [debut.getUTCDate(), debut.getUTCMonth(), debut.getUTCFullYear()];
  const [jb, mb, ab] = [b.getUTCDate(), b.getUTCMonth(), b.getUTCFullYear()];
  if (jourMural(b) <= jourMural(debut)) return `${jour(ja)} ${MOIS[ma]} ${aa}`;
  if (aa !== ab) return `${jour(ja)} ${MOIS[ma]} ${aa} – ${jour(jb)} ${MOIS[mb]} ${ab}`;
  if (ma !== mb) return `${jour(ja)} ${MOIS[ma]} – ${jour(jb)} ${MOIS[mb]} ${ab}`;
  return `${jour(ja)}–${jour(jb)} ${MOIS[mb]} ${ab}`;
}
