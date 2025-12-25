/**
 * Mortgage Calculator Input Validation
 * Zod schemas for validating mortgage calculation inputs
 */

import { z } from 'zod';
import { LOAN_TERMS, AGE_RANGE, INTEREST_RATE_RANGE, LOAN_AMOUNT_RANGE, HOME_VALUE_RANGE } from './constants';

// Currency validation
export const CurrencySchema = z.literal('EUR');

// Loan term validation
export const LoanTermSchema = z.number().int().refine(
  (value) => LOAN_TERMS.includes(value as any),
  {
    message: `Loan term must be one of: ${LOAN_TERMS.join(', ')}`
  }
);

// Payment frequency validation
export const PaymentFrequencySchema = z.enum(['monthly', 'biweekly']);

// Base mortgage inputs schema (without cross-field validation)
export const MortgageInputsBaseSchema = z.object({
  loanAmount: z.number()
    .min(LOAN_AMOUNT_RANGE.min, `Loan amount must be at least €${LOAN_AMOUNT_RANGE.min.toLocaleString()}`)
    .max(LOAN_AMOUNT_RANGE.max, `Loan amount cannot exceed €${LOAN_AMOUNT_RANGE.max.toLocaleString()}`),

  interestRate: z.number()
    .min(INTEREST_RATE_RANGE.min, `Interest rate must be at least ${INTEREST_RATE_RANGE.min}%`)
    .max(INTEREST_RATE_RANGE.max, `Interest rate cannot exceed ${INTEREST_RATE_RANGE.max}%`),

  loanTerm: LoanTermSchema,

  extraPayment: z.number()
    .min(0, 'Extra payment cannot be negative')
    .max(50000, 'Extra payment cannot exceed €50,000'),

  currentAge: z.number()
    .int()
    .min(AGE_RANGE.min, `Age must be at least ${AGE_RANGE.min}`)
    .max(AGE_RANGE.max, `Age cannot exceed ${AGE_RANGE.max}`),

  purchaseDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), 'Purchase date must be a valid date')
    .refine((date) => {
      const purchaseDate = new Date(date);
      const today = new Date();
      const twoYearsAgo = new Date(today.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      return purchaseDate >= twoYearsAgo && purchaseDate <= today;
    }, 'Purchase date must be within the last 2 years'),

  extraPaymentStartsNow: z.boolean(),

  paymentFrequency: PaymentFrequencySchema,

  oneTimePayment: z.number()
    .min(0, 'One-time payment cannot be negative')
    .max(1000000, 'One-time payment cannot exceed €1,000,000'),

  oneTimePaymentDate: z.string()
    .optional()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'One-time payment date must be a valid date'),

  downPayment: z.number()
    .min(0, 'Down payment cannot be negative'),

  homeValue: z.number()
    .min(HOME_VALUE_RANGE.min, `Home value must be at least €${HOME_VALUE_RANGE.min.toLocaleString()}`)
    .max(HOME_VALUE_RANGE.max, `Home value cannot exceed €${HOME_VALUE_RANGE.max.toLocaleString()}`),

  currency: CurrencySchema,

  pmiRate: z.number()
    .min(0, 'PMI rate cannot be negative')
    .max(5, 'PMI rate cannot exceed 5%')
    .optional(),

  propertyId: z.string().optional()
});

// Full mortgage inputs schema with cross-field validation
export const MortgageInputsSchema = MortgageInputsBaseSchema
  .refine(
    (data) => data.downPayment < data.homeValue,
    {
      message: "Down payment must be less than home value",
      path: ["downPayment"]
    }
  )
  .refine(
    (data) => data.loanAmount <= data.homeValue - data.downPayment,
    {
      message: "Loan amount cannot exceed home value minus down payment",
      path: ["loanAmount"]
    }
  )
  .refine(
    (data) => {
      if (data.oneTimePayment > 0 && data.oneTimePaymentDate) {
        const purchaseDate = new Date(data.purchaseDate);
        const oneTimeDate = new Date(data.oneTimePaymentDate);
        return oneTimeDate >= purchaseDate;
      }
      return true;
    },
    {
      message: "One-time payment date must be on or after purchase date",
      path: ["oneTimePaymentDate"]
    }
  );

// Mortgage scenario schema
export const MortgageScenarioSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  name: z.string()
    .min(1, 'Scenario name is required')
    .max(100, 'Scenario name cannot exceed 100 characters'),
  inputs: MortgageInputsSchema,
  results: z.object({
    monthlyPayment: z.number(),
    principal: z.number(),
    totalInterest: z.number(),
    totalPayment: z.number(),
    payoffMonths: z.number(),
    savings: z.number(),
    pmiMonths: z.number(),
    pmiAmount: z.number(),
    monthsSincePurchase: z.number(),
    currentBalance: z.number()
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Scenario comparison request schema
export const ScenarioComparisonRequestSchema = z.object({
  inputs: MortgageInputsSchema,
  extraPaymentAmounts: z.array(z.number().positive()).max(10, 'Cannot compare more than 10 scenarios').optional()
});

// API request schemas
export const MortgageCalculationRequestSchema = MortgageInputsSchema;

// API response schemas
export const MortgageCalculationResponseSchema = z.object({
  monthlyPayment: z.number(),
  principal: z.number(),
  interest: z.number(),
  totalPayment: z.number(),
  totalInterest: z.number(),
  payoffMonths: z.number(),
  savings: z.number(),
  pmiMonths: z.number(),
  pmiAmount: z.number(),
  amortization: z.array(z.object({
    month: z.number(),
    payment: z.number(),
    principal: z.number(),
    interest: z.number(),
    balance: z.number(),
    pmi: z.number(),
    cumulativeInterest: z.number(),
    cumulativePrincipal: z.number()
  })),
  monthsSincePurchase: z.number(),
  currentBalance: z.number()
});

export const ScenarioComparisonResponseSchema = z.array(z.object({
  extraPayment: z.number(),
  monthsSaved: z.number(),
  interestSaved: z.number(),
  newPayoffTime: z.number()
}));

// Validation helper functions

/**
 * Validate mortgage inputs
 */
export function validateMortgageInputs(data: unknown) {
  return MortgageInputsSchema.safeParse(data);
}

/**
 * Validate scenario data
 */
export function validateMortgageScenario(data: unknown) {
  return MortgageScenarioSchema.safeParse(data);
}

/**
 * Validate calculation request
 */
export function validateCalculationRequest(data: unknown) {
  return MortgageCalculationRequestSchema.safeParse(data);
}

/**
 * Validate scenario comparison request
 */
export function validateScenarioComparisonRequest(data: unknown) {
  return ScenarioComparisonRequestSchema.safeParse(data);
}

// Type exports
export type MortgageInputs = z.infer<typeof MortgageInputsSchema>;
export type MortgageScenario = z.infer<typeof MortgageScenarioSchema>;
export type MortgageCalculationRequest = z.infer<typeof MortgageCalculationRequestSchema>;
export type MortgageCalculationResponse = z.infer<typeof MortgageCalculationResponseSchema>;
export type ScenarioComparisonRequest = z.infer<typeof ScenarioComparisonRequestSchema>;
export type ScenarioComparisonResponse = z.infer<typeof ScenarioComparisonResponseSchema>;

// Validation error types
export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Extract validation errors from Zod result
 */
export function getValidationErrors(result: z.ZodSafeParseSuccess<any> | z.ZodSafeParseError<any>): ValidationError[] {
  if (result.success) return [];

  return result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => `${error.field}: ${error.message}`).join('\n');
}

