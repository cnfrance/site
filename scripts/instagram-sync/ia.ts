// Dialogue avec le modèle (GitHub Models) : construction des messages et
// validation stricte de la réponse. L'IA ne rédige que les métadonnées de
// l'actu ; le corps reste la légende brute.
import {
  CATEGORIES_ACTU, LIBELLES_CATEGORIE_ACTU, type CategorieActu,
} from "../../src/lib/categories-actus.ts";

export interface MessageIA {
  role: "system" | "user";
  content: string;
}

export interface EntreeIA {
  legende: string;
  type: string;
  date: string;
}

export interface ExempleActu {
  titre: string;
  resume: string;
}

export type DecisionIA =
  | { garder: false; raison: string }
  | { garder: true; raison: string; titre: string; resume: string; categorie: CategorieActu };

export function construireMessages(entree: EntreeIA, exemples: ExempleActu[]): MessageIA[] {
  const categories = CATEGORIES_ACTU.map((c) => `- "${c}" : ${LIBELLES_CATEGORIE_ACTU[c]}`).join("\n");
  const ex = exemples.map((e) => `- titre : ${e.titre}\n  résumé : ${e.resume}`).join("\n");
  const systeme = [
    "Tu aides le Cercle Nautique de France, club d'aviron de Neuilly-sur-Seine, à transformer ses publications Instagram en actualités de son site.",
    "Décide d'abord si la publication mérite une actualité : oui pour un compte rendu de compétition ou de randonnée, un événement, un moment de la vie du club ; non pour une annonce pratique ponctuelle (horaires, fermeture), un simple repost, un message sans contenu.",
    "Si oui, rédige en français :",
    "- un titre court et factuel (60 caractères au plus), dans le style des exemples ;",
    "- un résumé d'une phrase (200 caractères au plus) ;",
    "- une catégorie parmi :",
    categories,
    "N'invente rien : utilise uniquement les informations de la légende (noms, lieux, résultats, dates).",
    'Réponds uniquement par un objet JSON : {"garder": booléen, "raison": "…", "titre": "…", "resume": "…", "categorie": "…"}. Si garder vaut false, titre, resume et categorie peuvent être omis.',
    "",
    "Exemples d'actualités existantes :",
    ex || "(aucun)",
  ].join("\n");
  const utilisateur = `Date : ${entree.date}\nType : ${entree.type}\nLégende :\n${entree.legende || "(aucune légende)"}`;
  return [
    { role: "system", content: systeme },
    { role: "user", content: utilisateur },
  ];
}

const nonVide = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

export function lireDecision(texte: string): DecisionIA | null {
  let brut: unknown;
  try {
    brut = JSON.parse(texte.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
  } catch {
    return null;
  }
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return null;
  const { garder, raison, titre, resume, categorie } = brut as Record<string, unknown>;
  if (typeof garder !== "boolean" || !nonVide(raison)) return null;
  if (!garder) return { garder: false, raison: raison.trim() };
  if (!nonVide(titre) || !nonVide(resume)) return null;
  if (typeof categorie !== "string" || !(CATEGORIES_ACTU as readonly string[]).includes(categorie)) return null;
  return {
    garder: true,
    raison: raison.trim(),
    titre: titre.trim(),
    resume: resume.trim(),
    categorie: categorie as CategorieActu,
  };
}
