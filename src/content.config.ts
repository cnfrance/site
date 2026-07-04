import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

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
});

export const evenementSchema = z.object({
  titre: z.string(),
  date: z.coerce.date(),
  lieu: z.string().optional(),
  description: z.string(),
  image: z.string().optional(),
});

export const actualiteSchema = z.object({
  titre: z.string(),
  date: z.coerce.date(),
  resume: z.string(),
  image: z.string().optional(),
});

export const partenaireSchema = z.object({
  nom: z.string(),
  url: z.string().optional(),
  logo: z.string().optional(),
});

const reglages = defineCollection({
  loader: file('src/content/site/reglages.json'),
  schema: reglagesSchema,
});

const evenements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/evenements' }),
  schema: evenementSchema,
});

const actualites = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/actualites' }),
  schema: actualiteSchema,
});

const partenaires = defineCollection({
  loader: file('src/content/partenaires/partenaires.json'),
  schema: partenaireSchema,
});

export const collections = { reglages, evenements, actualites, partenaires };
