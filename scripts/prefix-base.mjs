#!/usr/bin/env node
// Préfixe les URLs absolues (/images, /documents, liens du nav…) codées en dur
// dans le contenu, que `base` d'Astro ne réécrit pas. Ne s'exécute que si
// PUBLIC_BASE_PATH est défini (ex. "/site" pour la démo GitHub Pages). Sans lui,
// c'est un no-op → aucun impact sur les builds local / Netlify (base = "/").
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const raw = process.env.PUBLIC_BASE_PATH || "/";
const base = raw.replace(/\/+$/, ""); // "/site" (sans slash final)
if (!base) {
  console.log("[prefix-base] PUBLIC_BASE_PATH vide → rien à faire.");
  process.exit(0);
}

const DIST = "dist";
// Attributs href/src : ajoute le préfixe sauf si déjà préfixé, protocole-relatif (//) ou absolu (http).
const attrRe = /(\b(?:href|src)=")\/(?!\/|https?:)(?!site\/)/g;
// À l'intérieur d'un srcset (URLs séparées par des virgules).
const srcsetRe = /(\bsrcset=")([^"]+)"/g;
// url(...) dans le CSS et les <style> inline.
const urlRe = /(url\(\s*['"]?)\/(?!\/|https?:)(?!site\/)/g;

const guard = new RegExp(`^${base}/`);
function prefixSrcset(val) {
  return val
    .split(",")
    .map((part) => part.replace(/^(\s*)\/(?!\/|https?:)/, (m, sp) => (guard.test(part.trim()) ? m : `${sp}${base}/`)))
    .join(",");
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

let changed = 0;
const files = await walk(DIST);
for (const file of files) {
  const ext = extname(file);
  if (ext !== ".html" && ext !== ".css") continue;
  const before = await readFile(file, "utf8");
  let after = before;
  if (ext === ".html") {
    after = after
      .replace(attrRe, `$1${base}/`)
      .replace(srcsetRe, (m, p, v) => `${p}${prefixSrcset(v)}"`)
      .replace(urlRe, `$1${base}/`);
  } else {
    after = after.replace(urlRe, `$1${base}/`);
  }
  if (after !== before) {
    await writeFile(file, after);
    changed++;
  }
}
console.log(`[prefix-base] préfixe "${base}" appliqué à ${changed} fichier(s).`);
