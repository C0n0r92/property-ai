/**
 * Mortgage Calculator Type Definitions
 * 
 * Types for mortgage calculations, amortization schedules, and scenario management.
 */

/**
 * Input parameters for mortgage calculation
 */
export interface MortgageInputs {
  /** Principal loan amount in EUR */
  loanAmount: number;
  
  /** Annual interest rate as a percentage (e.g., 3.5 for 3.5%) */
  interestRate: number;
  
  /** Loan term in years (typically 15, 20, 25, or 30) */
  loanTerm: number;
  
  /** Additional monthly payment towards principal (EUR) */
  extraPayment: number;
  
  /** Borrower's current age */
  currentAge: number;
  
  /** Date the mortgage was/will be originated (ISO 8601 format) */
  purchaseDate: string;
  
  /** If true, extra payments start from today; if false, from loan origination */
  extraPaymentStartsNow: boolean;
  
  /** Payment frequency: monthly or biweekly */
  paymentFrequency: 'monthly' | 'biweekly';
  
  /** One-time lump sum payment amount (EUR) */
  oneTimePayment: number;

  /** Date of one-time payment (ISO 8601 format) - optional */
  oneTimePaymentDate?: string;
  
  /** Down payment amount (EUR) */
  downPayment: number;
  
  /** Total property value (EUR) */
  homeValue: number;
  
  /** Currency code - currently only EUR supported */
  currency: 'EUR';
  
  /** PMI rate as percentage (default 0.5%) - only if LTV > 80% */
  pmiRate?: number;
  
  /** Optional: Link to specific property for future integration */
  propertyId?: string;
}

/**
 * Results from mortgage calculation
 */
export interface MortgageResults {
  /** Regular monthly payment amount (EUR) */
  monthlyPayment: number;
  
  /** Original principal amount (EUR) */
  principal: number;
  
  /** Total interest paid over life of loan (EUR) */
  totalInterest: number;
  
  /** Total amount paid: principal + interest + PMI (EUR) */
  totalPayment: number;
  
  /** Number of months to pay off the loan */
  payoffMonths: number;
  
  /** Interest saved compared to standard payment schedule (EUR) */
  savings: number;
  
  /** Number of months PMI is required */
  pmiMonths: number;
  
  /** Total PMI paid over life of loan (EUR) */
  pmiAmount: number;
  
  /** Months elapsed since purchase date */
  monthsSincePurchase: number;
  
  /** Current remaining balance (EUR) */
  currentBalance: number;
}

/**
 * Single entry in amortization schedule
 */
export interface AmortizationEntry {
  /** Month number (1-indexed) */
  month: number;
  
  /** Total payment for this period (EUR) */
  payment: number;
  
  /** Principal portion of payment (EUR) */
  principal: number;
  
  /** Interest portion of payment (EUR) */
  interest: number;
  
  /** Remaining balance after payment (EUR) */
  balance: number;
  
  /** PMI payment for this period (EUR) */
  pmi: number;
  
  /** Cumulative interest paid through this month (EUR) */
  cumulativeInterest: number;
  
  /** Cumulative principal paid through this month (EUR) */
  cumulativePrincipal: number;
}

/**
 * Complete mortgage calculation response including amortization schedule
 */
export interface MortgageCalculationResponse extends MortgageResults {
  /** Full amortization schedule for the life of the loan */
  amortization: AmortizationEntry[];
}

/**
 * Saved mortgage scenario for comparison
 */
export interface MortgageScenario {
  /** Unique identifier (UUID from database or local ID) */
  id: string;
  
  /** User ID if saved to database (auth users only) */
  userId?: string;
  
  /** User-provided name for the scenario */
  name: string;
  
  /** Input parameters used for this scenario */
  inputs: MortgageInputs;
  
  /** Calculated results for this scenario */
  results: MortgageResults;
  
  /** When the scenario was created */
  createdAt: Date;
  
  /** When the scenario was last modified */
  updatedAt: Date;
}

/**
 * Scenario comparison result
 */
export interface ScenarioComparison {
  /** Extra payment amount for this comparison (EUR) */
  extraPayment: number;
  
  /** Months saved compared to base scenario */
  monthsSaved: number;
  
  /** Interest saved compared to base scenario (EUR) */
  interestSaved: number;
  
  /** New payoff time in months */
  newPayoffTime: number;
}

/**
 * Currency information
 */
export interface CurrencyInfo {
  /** Currency symbol (e.g., "€") */
  symbol: string;
  
  /** Full currency name */
  name: string;
  
  /** ISO 4217 currency code */
  code: string;
}

/**
 * Supported currencies (EUR only for Irish market)
 */
export const CURRENCIES: Record<'EUR', CurrencyInfo> = {
  EUR: { 
    symbol: '€', 
    name: 'Euro',
    code: 'EUR'
  }
} as const;

/**
 * Loan term options in years
 */
export const LOAN_TERMS = [15, 20, 25, 30] as const;
export type LoanTerm = typeof LOAN_TERMS[number];

/**
 * Payment frequency options
 */
export const PAYMENT_FREQUENCIES = ['monthly', 'biweekly'] as const;
export type PaymentFrequency = typeof PAYMENT_FREQUENCIES[number];

/**
 * Default mortgage input values
 */
export const DEFAULT_MORTGAGE_INPUTS: MortgageInputs = {
  loanAmount: 300000,
  interestRate: 3.5,
  loanTerm: 30,
  extraPayment: 0,
  currentAge: 35,
  purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
  extraPaymentStartsNow: true,
  paymentFrequency: 'monthly',
  oneTimePayment: 0,
  oneTimePaymentDate: new Date().toISOString().split('T')[0],
  downPayment: 60000,
  homeValue: 360000,
  currency: 'EUR',
  pmiRate: 0.5
};

