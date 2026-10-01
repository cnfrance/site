// Seuls appels réseau de la synchro. Tout le reste reçoit un objet Clients,
// remplacé par des doublures dans les tests.
import type { MessageIA } from "./ia.ts";
import type { PublicationInstagram } from "./selection.ts";
import { dateParis } from "./selection.ts";

export interface Clients {
  rafraichirJeton(jeton: string): Promise<{ jeton: string; expireDansSecondes: number }>;
  listerPublications(jeton: string, depuis: string): Promise<PublicationInstagram[]>;
  demanderIA(messages: MessageIA[], modele: string): Promise<string>;
  telecharger(url: string): Promise<{ octets: Uint8Array; extension: string }>;
}

const API_INSTAGRAM = "https://graph.instagram.com";
const VERSION_INSTAGRAM = process.env.INSTAGRAM_API_VERSION || "v23.0";
const CHAMPS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";
const URL_MODELS = "https://models.github.ai/inference/chat/completions";

// Réponse JSON ou erreur explicite (sans jamais reprendre l'URL, qui contient
// le jeton).
async function lireJson(res: Response, contexte: string): Promise<any> {
  const texte = await res.text();
  let corps: any;
  try {
    corps = JSON.parse(texte);
  } catch {
    corps = undefined;
  }
  if (!res.ok || corps === undefined || corps.error) {
    const detail = corps?.error?.message ?? texte.slice(0, 300);
    throw new Error(`${contexte} : HTTP ${res.status} — ${detail}`);
  }
  return corps;
}

export function clientsReels(githubToken: string): Clients {
  return {
    async rafraichirJeton(jeton) {
      const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: jeton });
      const r = await lireJson(await fetch(`${API_INSTAGRAM}/refresh_access_token?${params}`), "Rafraîchissement du jeton Instagram");
      return { jeton: String(r.access_token), expireDansSecondes: Number(r.expires_in) };
    },

    // L'API renvoie les publications de la plus récente à la plus ancienne :
    // on arrête de paginer dès qu'une page atteint la date de départ.
    async listerPublications(jeton, depuis) {
      const pubs: PublicationInstagram[] = [];
      const params = new URLSearchParams({ fields: CHAMPS, limit: "50", access_token: jeton });
      let url: string | undefined = `${API_INSTAGRAM}/${VERSION_INSTAGRAM}/me/media?${params}`;
      while (url) {
        const page = await lireJson(await fetch(url), "Lecture des publications Instagram");
        const data: PublicationInstagram[] = page.data ?? [];
        pubs.push(...data);
        const plusAncienne = data[data.length - 1];
        if (!plusAncienne || dateParis(plusAncienne.timestamp) < depuis) break;
        url = page.paging?.next;
      }
      return pubs;
    },

    async demanderIA(messages, modele) {
      const res = await fetch(URL_MODELS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ model: modele, messages, temperature: 0.2, response_format: { type: "json_object" } }),
      });
      const r = await lireJson(res, "GitHub Models");
      const contenu = r.choices?.[0]?.message?.content;
      if (typeof contenu !== "string") throw new Error("GitHub Models : réponse sans contenu");
      return contenu;
    },

    async telecharger(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      return { octets: new Uint8Array(await res.arrayBuffer()), extension };
    },
  };
}
