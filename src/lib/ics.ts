// Flux iCalendar (RFC 5545) des fiches, un par canal (voir la spec du
// 2026-10-30). Fonctions pures : la route statique ne fait que les appeler.
import { CATEGORIES_ACTU, LIBELLES_CATEGORIE_ACTU, type CategorieActu } from "./categories-actus";
import { aujourdhuiParis, estAVenir, estEvenement, finDe, heureAffichee, jourMural } from "./agenda";

export type Canal = "tout" | CategorieActu;
export const CANAUX: { valeur: Canal; libelle: string }[] = [
  { valeur: "tout", libelle: "Tout le club" },
  ...CATEGORIES_ACTU.map((c) => ({ valeur: c as Canal, libelle: LIBELLES_CATEGORIE_ACTU[c] })),
];

export interface FicheIcs {
  slug: string;
  titre: string;
  date: Date;
  dateFin?: Date;
  lieu?: string;
  resume: string;
  categorie?: CategorieActu;
  presentation?: string;
  lien?: string;
  corps?: string;
}

const FENETRE_JOURS = 90;
const DUREE_MS = 2 * 3600 * 1000;

export function echapper(texte: string): string {
  return texte.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Replie une ligne à 75 octets (continuation : CRLF + espace), sans couper un caractère. */
export function plier(ligne: string): string {
  const enc = new TextEncoder();
  const morceaux: string[] = [];
  let courant = "";
  let taille = 0;
  for (const c of ligne) {
    const n = enc.encode(c).length;
    if (taille + n > 75) {
      morceaux.push(courant);
      courant = ` ${c}`;
      taille = 1 + n;
    } else {
      courant += c;
      taille += n;
    }
  }
  morceaux.push(courant);
  return morceaux.join("\r\n");
}

const jourIcs = (d: Date) => jourMural(d).replace(/-/g, "");
const heureIcs = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, "");
const lendemain = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));

const VTIMEZONE = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

export function genererIcs(fiches: FicheIcs[], o: { canal: Canal; site: string; maintenant: Date }): string {
  const libelle = CANAUX.find((c) => c.valeur === o.canal)?.libelle ?? o.canal;
  const limite = jourMural(new Date(o.maintenant.getTime() - FENETRE_JOURS * 86400000));
  const stamp = `${o.maintenant.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
  const site = o.site.replace(/\/$/, "");

  const lignes = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cercle Nautique de France//Agenda//FR",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:CNF — ${libelle}`, "X-WR-TIMEZONE:Europe/Paris",
    ...VTIMEZONE,
  ];
  const retenues = fiches
    .filter((f) => o.canal === "tout" || f.categorie === o.canal)
    // À venir, ou rendez-vous passé récent ; jamais une simple actu.
    .filter((f) => estAVenir(f, aujourdhuiParis(o.maintenant), f.corps) || (estEvenement(f) && jourMural(finDe(f)) >= limite))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const f of retenues) {
    const url = `${site}/actualites/${f.slug}/`;
    const fin = finDe(f);
    const dates = heureAffichee(f)
      ? [
          `DTSTART;TZID=Europe/Paris:${heureIcs(f.date)}`,
          `DTEND;TZID=Europe/Paris:${heureIcs(f.dateFin && f.dateFin > f.date ? f.dateFin : new Date(f.date.getTime() + DUREE_MS))}`,
        ]
      : [`DTSTART;VALUE=DATE:${jourIcs(f.date)}`, `DTEND;VALUE=DATE:${jourIcs(lendemain(fin))}`];
    lignes.push(
      "BEGIN:VEVENT",
      `UID:${f.slug}@cnfrance.fr`,
      `DTSTAMP:${stamp}`,
      ...dates,
      `SUMMARY:${echapper(f.titre)}`,
      ...(f.lieu ? [`LOCATION:${echapper(f.lieu)}`] : []),
      `DESCRIPTION:${echapper(`${f.resume}\n\n${url}`)}`,
      `URL:${url}`,
      "END:VEVENT",
    );
  }
  lignes.push("END:VCALENDAR");
  return lignes.map(plier).join("\r\n") + "\r\n";
}
