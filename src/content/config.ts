import { defineCollection, z } from 'astro:content';

const INDUSTRY_SLUGS = [
  'medical', 'legal', 'financial', 'hr',
  'real-estate', 'insurance', 'mental-health', 'pharmacy', 'accounting',
] as const;

const experiments = defineCollection({
  type: 'content',
  schema: z.object({
    title:      z.string(),
    date:       z.coerce.date(),
    week:       z.number().int().positive(),
    industry:   z.enum(INDUSTRY_SLUGS),
    hardware:   z.string(),
    task:       z.string(),
    model:      z.string(),
    verdict:    z.enum(['viable', 'partial', 'not-yet']),
    evidenceStatus: z.enum(['measured', 'estimated', 'third-party', 'protocol']).default('protocol'),
    hypothesis: z.string(),
    linkedin:   z.string().url().optional(),
    description: z.string(),
  }),
});

const industries = defineCollection({
  type: 'content',
  schema: z.object({
    name:           z.string(),
    shortName:      z.string(),
    regulation:     z.array(z.string()),
    whyLocal:       z.string(),
    commonUseCases: z.array(z.string()),
    maturityNote:   z.string().optional(),
  }),
});

const hardware = defineCollection({
  type: 'content',
  schema: z.object({
    name:           z.string(),
    priceUsd:       z.number(),
    ramGb:          z.number(),
    chip:           z.string(),
    tier:           z.enum(['entry', 'mid', 'high', 'workstation']),
    suitableModels: z.array(z.string()),
    suitableFor:    z.array(z.string()),
    notSuitableFor: z.array(z.string()).optional(),
  }),
});

export const collections = { experiments, industries, hardware };
