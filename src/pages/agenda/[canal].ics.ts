import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { CANAUX, genererIcs, type Canal } from "../../lib/ics";

export const getStaticPaths = (() => CANAUX.map((c) => ({ params: { canal: c.valeur } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const fiches = (await getCollection("actualites")).map((e) => ({
    slug: e.id, titre: e.data.titre, date: e.data.date, dateFin: e.data.dateFin,
    lieu: e.data.lieu, resume: e.data.resume, categorie: e.data.categorie,
  }));
  const ics = genererIcs(fiches, {
    canal: params.canal as Canal,
    site: (site ?? new URL("https://www.cnfrance.fr")).toString(),
    maintenant: new Date(),
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
