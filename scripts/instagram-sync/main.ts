// Synchro Instagram → actualités du site (lancée chaque semaine par
// .github/workflows/instagram-sync.yml).
//
//   node scripts/instagram-sync/main.ts [--dry-run] [--rapport r.json] [--corps-pr pr.md]
//
// Variables (environnement ou .env, jamais committé) :
//   INSTAGRAM_TOKEN        jeton Instagram longue durée (voir docs/INSTAGRAM-SETUP.md)
//   GITHUB_TOKEN           jeton GitHub ayant accès à GitHub Models
//   INSTAGRAM_SYNC_DEPUIS  date de départ AAAA-MM-JJ (défaut 2026-07-10)
//   INSTAGRAM_SYNC_MODELE  modèle GitHub Models (défaut openai/gpt-4.1-mini)
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { clientsReels } from "./clients.ts";
import { corpsPR, synchroniser } from "./sync.ts";

// .env minimal (même règle que instagram-token.mjs) : ne surcharge jamais
// l'environnement réel.
try {
  for (const ligne of (await readFile(".env", "utf8")).split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const valeur = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!(m[1] in process.env)) process.env[m[1]] = valeur;
  }
} catch {
  // Pas de .env : cas de la CI.
}

function requis(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) {
    console.error(`[instagram-sync] ${nom} manquant (environnement ou .env).`);
    process.exit(1);
  }
  return valeur;
}

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    rapport: { type: "string" },
    "corps-pr": { type: "string" },
  },
});

const depuis = process.env.INSTAGRAM_SYNC_DEPUIS || "2026-07-10";
if (!/^\d{4}-\d{2}-\d{2}$/.test(depuis)) {
  console.error(`[instagram-sync] INSTAGRAM_SYNC_DEPUIS invalide : ${depuis} (attendu AAAA-MM-JJ).`);
  process.exit(1);
}
const essai = values["dry-run"] ?? false;

const rapport = await synchroniser({
  racine: process.cwd(),
  depuis,
  modele: process.env.INSTAGRAM_SYNC_MODELE || "openai/gpt-4.1-mini",
  jeton: requis("INSTAGRAM_TOKEN"),
  clients: clientsReels(requis("GITHUB_TOKEN")),
  ecrire: !essai,
  pauseMs: 4000, // reste sous la limite par minute de l'offre gratuite de GitHub Models
});

if (values.rapport) await writeFile(values.rapport, `${JSON.stringify(rapport, null, 2)}\n`);
if (values["corps-pr"]) await writeFile(values["corps-pr"], corpsPR(rapport));

const j = rapport.jeton;
if (!j.ok) {
  console.error(`[instagram-sync] jeton Instagram refusé : ${j.erreur}`);
  process.exit(1);
}
console.log(
  j.joursRestants === undefined
    ? `[instagram-sync] jeton non rafraîchi (${j.erreur}), lecture possible.`
    : `[instagram-sync] jeton valide ${j.joursRestants} jours, rafraîchissement ${j.identique ? "sans changement de jeton" : "avec un NOUVEAU jeton (à reporter dans les secrets)"}.`,
);
console.log(`[instagram-sync] ${essai ? "essai à blanc — rien n'est écrit." : "fichiers écrits."}`);
for (const a of rapport.actus) console.log(`  + ${a.date} ${a.titre} [${a.categorie}] → ${a.slug}`);
for (const i of rapport.ignorees) console.log(`  - ${i.date} ignorée : ${i.raison} (${i.instagram})`);
for (const x of rapport.reportees) console.log(`  ~ reportée : ${x.raison} (${x.instagram})`);
if (rapport.actus.length + rapport.ignorees.length + rapport.reportees.length === 0) {
  console.log("  aucune nouvelle publication.");
}
