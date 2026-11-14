import { z } from 'zod';

const price = z.number().int().min(50_000).max(20_000_000);

export const querySchema = z.object({
  areaKey: z.string().regex(/^[a-z0-9-]{1,60}$/),
  typeGroup: z.enum(['apartment', 'terraced', 'semi', 'detached']),
  beds: z.number().int().min(1).max(10).optional(),
  askingPrice: price,
  budget: price.optional(),
});

/**
 * Eircode: a routing key (letter + two digits, or D6W) then four characters
 * from the Eircode alphabet. The space is optional.
 */
const EIRCODE = /^(?:[AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}$/i;

export function isEircode(value: string): boolean {
  return EIRCODE.test(value.trim());
}

const eircode = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v.replace(/\s/g, '').toUpperCase()))
  .refine((v) => v === undefined || isEircode(v), { message: 'invalid_eircode' })
  .optional();

export const checkoutSchema = z.object({
  query: querySchema,
  // The home being bid on, printed on the report cover. Optional, so that
  // buying takes one click; blank means the cover names the kind of home.
  address: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || v.length >= 6, { message: 'invalid_address' })
    .optional(),
  eircode,
});

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  query: querySchema,
  // Separate, optional consent for follow-up emails about similar sales
  marketingConsent: z.boolean().default(false),
  // Hidden field: real visitors leave it empty
  company: z.string().max(200).optional(),
});

/** The register's 26 counties */
export const COUNTIES = [
  'Dublin', 'Kildare', 'Meath', 'Wicklow', 'Louth', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Wexford',
  'Kilkenny', 'Carlow', 'Laois', 'Offaly', 'Westmeath', 'Longford', 'Cavan', 'Monaghan', 'Donegal', 'Sligo',
  'Leitrim', 'Roscommon', 'Mayo', 'Clare', 'Tipperary', 'Kerry',
] as const;

export const soldAlertSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // The home, as found by address search or a listing link
  address: z.string().trim().min(6).max(200),
  askingPrice: price.optional(),
  predictedMid: price.optional(),
  county: z.enum(COUNTIES).default('Dublin'),
  // Hidden field: real visitors leave it empty
  company: z.string().max(200).optional(),
});

export const stopAlertSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
});
