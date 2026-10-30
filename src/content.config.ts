import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { CATEGORIES_ACTU } from './lib/categories-actus';

export const reglagesSchema = z.object({
  accroche: z.string(),
  chiffres: z.array(z.object({ valeur: z.string(), label: z.string() })),
  infos: z.object({
    horaires: z.string(),
    tarifs: z.string(),
    adresse: z.string(),
    email: z.string(),
    telephone: z.string().optional(),
  }),
  photosHero: z.array(z.string()).optional(),
});

// Le CMS écrit '' (ou null) pour un champ laissé vide.
const sansVide = (v: unknown) => (v === "" || v === null ? undefined : v);

export const actualiteSchema = z.object({
  titre: z.string(),
  date: z.coerce.date(),
  // Rendez-vous : fin (plusieurs jours), lieu, présentation affichée avant la
  // date, lien d'inscription ou d'infos. Le corps Markdown est le compte rendu.
  dateFin: z.preprocess(sansVide, z.coerce.date().optional()),
  lieu: z.preprocess(sansVide, z.string().optional()),
  presentation: z.preprocess(sansVide, z.string().optional()),
  lien: z.preprocess(sansVide, z.string().url().optional()),
  resume: z.string(),
  categorie: z.enum(CATEGORIES_ACTU).optional(),
  image: z.string().optional(),
  photos: z.array(z.string()).optional(),
  // Lien de la publication Instagram d'origine : clé de déduplication de la
  // synchro hebdomadaire (scripts/instagram-sync). Le CMS écrit '' quand le
  // champ est laissé vide.
  instagram: z.string().url().or(z.literal('')).optional(),
  videos: z.array(z.object({
    lien: z.string().optional(),
    fichier: z.string().optional(),
    titre: z.string().optional(),
  })).optional(),
});

export const partenaireSchema = z.object({
  nom: z.string(),
  url: z.string().optional(),
  logo: z.string().optional(),
});

export const pageSchema = z.object({
  titre: z.string(),
  section: z.string(),
  chapo: z.string().optional(),
  // nullish : le CMS écrit « ordre: null » quand le champ est laissé vide.
  ordre: z.number().nullish(),
});

// Campagne de dons : jauge de la page « Faire un don », mise à jour à la main
// par le bureau depuis le CMS (montant collecté relevé sur Monetico).
export const campagneDonSchema = z.object({
  titre: z.string(),
  description: z.string(),
  objectif: z.number().positive(),
  collecte: z.number().min(0),
  miseAJour: z.coerce.date(),
});

const reglages = defineCollection({
  loader: file('src/content/site/reglages.json'),
  schema: reglagesSchema,
});

const campagneDon = defineCollection({
  loader: file('src/content/site/don.json'),
  schema: campagneDonSchema,
});

const actualites = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/actualites' }),
  schema: actualiteSchema,
});

const partenaires = defineCollection({
  loader: file('src/content/partenaires/partenaires.json'),
  schema: partenaireSchema,
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: pageSchema,
});

export const collections = { reglages, campagneDon, actualites, partenaires, pages };
