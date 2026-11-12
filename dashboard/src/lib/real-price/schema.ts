import { z } from 'zod';

const price = z.number().int().min(50_000).max(20_000_000);

export const querySchema = z.object({
  areaKey: z.string().regex(/^[a-z0-9-]{1,60}$/),
  typeGroup: z.enum(['apartment', 'terraced', 'semi', 'detached']),
  beds: z.number().int().min(1).max(10).optional(),
  askingPrice: price,
  budget: price.optional(),
});

export const checkoutSchema = z.object({
  query: querySchema,
  // Shown on the report cover, e.g. the address of the home being considered
  label: z.string().trim().max(120).optional(),
});
