#!/usr/bin/env node
// Obtention et entretien du jeton d'accès Instagram (API « Instagram API with
// Instagram Login », portée `instagram_business_basic` = lecture seule).
//
//   node scripts/instagram-token.mjs url              → affiche l'URL d'autorisation à envoyer au club
//   node scripts/instagram-token.mjs exchange <code>  → code de retour → jeton longue durée (60 jours)
//   node scripts/instagram-token.mjs refresh          → prolonge le jeton de 60 jours
//   node scripts/instagram-token.mjs check            → vérifie que le jeton courant marche
//
// Variables lues dans l'environnement ou dans .env (jamais committé) :
//   INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI, INSTAGRAM_TOKEN
import { readFile } from "node:fs/promises";

const SCOPE = "instagram_business_basic"; // lecture seule : profil + médias
const API_VERSION = process.env.INSTAGRAM_API_VERSION || "v23.0";

// --- .env minimal (pas de dépendance) : ne surcharge jamais l'environnement réel.
try {
  for (const line of (await readFile(".env", "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
} catch {
  // Pas de .env : on se contente de l'environnement (cas CI).
}

function need(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[instagram-token] ${name} manquant (environnement ou .env).`);
    process.exit(1);
  }
  return value;
}

async function call(url, init) {
  const res = await fetch(url, init);
  const body = await res.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    console.error(`[instagram-token] réponse illisible (HTTP ${res.status}) : ${body.slice(0, 300)}`);
    process.exit(1);
  }
  if (!res.ok || json.error || json.error_type) {
    const detail = json.error?.message || json.error_message || body;
    console.error(`[instagram-token] erreur API (HTTP ${res.status}) : ${detail}`);
    process.exit(1);
  }
  return json;
}

function reportExpiry(expiresIn) {
  const days = Math.round(Number(expiresIn) / 86400);
  const date = new Date(Date.now() + Number(expiresIn) * 1000);
  console.log(`[instagram-token] valide ${days} jours, jusqu'au ${date.toISOString().slice(0, 10)}.`);
}

const [command, argument] = process.argv.slice(2);

switch (command) {
  case "url": {
    const params = new URLSearchParams({
      client_id: need("INSTAGRAM_APP_ID"),
      redirect_uri: need("INSTAGRAM_REDIRECT_URI"),
      response_type: "code",
      scope: SCOPE,
    });
    console.log(`https://www.instagram.com/oauth/authorize?${params}`);
    console.log("");
    console.log("→ à ouvrir par la personne qui gère @cerclenautiquedefrance.");
    console.log("→ après validation, la page de redirection affichera une erreur 404 : c'est normal.");
    console.log("→ récupérer le paramètre `code` dans la barre d'adresse et le passer à `exchange`.");
    break;
  }

  case "exchange": {
    if (!argument) {
      console.error("[instagram-token] usage : exchange <code>");
      process.exit(1);
    }
    // Instagram ajoute un « #_ » à la fin du code dans la barre d'adresse.
    const code = argument.replace(/#_$/, "");
    const appSecret = need("INSTAGRAM_APP_SECRET");

    const short = await call("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: need("INSTAGRAM_APP_ID"),
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: need("INSTAGRAM_REDIRECT_URI"),
        code,
      }),
    });
    // Selon les versions, le jeton court est renvoyé à plat ou dans `data[0]`.
    const shortToken = short.access_token || short.data?.[0]?.access_token;
    if (!shortToken) {
      console.error(`[instagram-token] pas de jeton dans la réponse : ${JSON.stringify(short)}`);
      process.exit(1);
    }

    const long = await call(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: shortToken,
      })}`,
    );
    console.log("");
    console.log(`INSTAGRAM_TOKEN=${long.access_token}`);
    console.log("");
    reportExpiry(long.expires_in);
    console.log("[instagram-token] à recopier dans .env, et dans les secrets du dépôt pour le job planifié.");
    break;
  }

  case "refresh": {
    const refreshed = await call(
      `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: need("INSTAGRAM_TOKEN"),
      })}`,
    );
    console.log(`INSTAGRAM_TOKEN=${refreshed.access_token}`);
    reportExpiry(refreshed.expires_in);
    break;
  }

  case "check": {
    const me = await call(
      `https://graph.instagram.com/${API_VERSION}/me?${new URLSearchParams({
        fields: "user_id,username,account_type,media_count",
        access_token: need("INSTAGRAM_TOKEN"),
      })}`,
    );
    console.log(`[instagram-token] jeton valide pour @${me.username} (${me.account_type}, ${me.media_count} médias).`);
    break;
  }

  default:
    console.error("[instagram-token] usage : url | exchange <code> | refresh | check");
    process.exit(1);
}
