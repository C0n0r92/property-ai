/**
 * Mortgage Calculator Glossary
 * Definitions and tooltips for mortgage terms
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
  tip?: string;
}

export const mortgageGlossary: Record<string, GlossaryTerm> = {
  // Basic Loan Terms
  loanAmount: {
    term: "Loan Amount",
    definition: "Total money you're borrowing from the lender to buy your home.",
    example: "€400k home - €80k down = €320k loan amount",
    tip: "Lower amount = lower payments & less interest"
  },

  homeValue: {
    term: "Home Value",
    definition: "The current market value of your property.",
    example: "Buying a €400,000 house = €400k home value",
    tip: "Used to calculate LTV and potential PMI requirements"
  },

  downPayment: {
    term: "Down Payment",
    definition: "Upfront cash payment toward your home purchase.",
    example: "20% on €400k home = €80k down payment",
    tip: "20%+ down payment typically eliminates PMI in Ireland"
  },

  interestRate: {
    term: "Interest Rate",
    definition: "The annual percentage rate charged by the lender for borrowing money.",
    example: "A 3.5% interest rate means you pay €3.50 in interest for every €100 borrowed annually.",
    tip: "Even small rate differences can save thousands over the life of your loan."
  },

  loanTerm: {
    term: "Loan Term",
    definition: "The length of time you have to repay your mortgage, typically 15 or 30 years.",
    example: "A 30-year loan gives you 360 monthly payments to pay off your mortgage.",
    tip: "Shorter terms mean higher monthly payments but significantly less total interest."
  },

  // Payment Terms
  monthlyPayment: {
    term: "Monthly Payment",
    definition: "Your regular payment that includes principal, interest, and possibly PMI.",
    example: "On a €300,000 loan at 3.5% for 30 years, your monthly payment is about €1,347.",
    tip: "This is just principal and interest - add taxes and insurance for total housing cost."
  },

  principal: {
    term: "Principal",
    definition: "The portion of your payment that goes toward paying down the loan balance.",
    example: "In early payments, only €400-500 might go to principal on a €1,347 payment.",
    tip: "Principal portions increase over time while interest portions decrease."
  },

  interest: {
    term: "Interest",
    definition: "The cost of borrowing money, calculated as a percentage of your remaining balance.",
    example: "On a €300,000 balance at 3.5%, your first month's interest is about €875.",
    tip: "Most of your early payments go to interest - this is normal and expected."
  },

  extraPayment: {
    term: "Extra Payment",
    definition: "Additional money applied directly to your loan principal to pay off your mortgage faster.",
    example: "Adding €200 extra monthly can save €89,000 and 7 years on a typical 30-year loan.",
    tip: "Even small extra payments can have a dramatic impact over time."
  },

  paymentFrequency: {
    term: "Payment Frequency",
    definition: "How often you make mortgage payments - monthly or bi-weekly.",
    example: "Bi-weekly means 26 payments per year instead of 12, effectively making 13 monthly payments.",
    tip: "Bi-weekly payments can save significant interest without changing your budget much."
  },

  oneTimePayment: {
    term: "One-Time Payment",
    definition: "A lump sum payment applied to your principal at a specific date.",
    example: "Using a €10,000 tax refund toward your mortgage principal.",
    tip: "Apply windfalls like bonuses or tax refunds to dramatically reduce interest costs."
  },

  // Advanced Concepts
  pmi: {
    term: "PMI (Private Mortgage Insurance)",
    definition: "Insurance required when your down payment is less than 20% of the home's value.",
    example: "On a €300,000 loan, PMI might cost €125-250 per month until you reach 20% equity.",
    tip: "PMI is automatically removed when you reach 20% equity in your home."
  },

  equity: {
    term: "Home Equity",
    definition: "The portion of your home's value that you actually own (value minus remaining loan).",
    example: "If your home is worth €400,000 and you owe €250,000, you have €150,000 in equity.",
    tip: "Equity builds through payments and home value appreciation."
  },

  amortization: {
    term: "Amortization",
    definition: "The process of gradually paying off your loan through regular monthly payments.",
    example: "An amortization schedule shows exactly how much of each payment goes to principal vs interest.",
    tip: "Early payments are mostly interest; later payments are mostly principal."
  },

  currentBalance: {
    term: "Current Balance",
    definition: "The amount you still owe on your mortgage after accounting for payments made.",
    example: "If you borrowed €300,000 and have paid €50,000 in principal, your balance is €250,000.",
    tip: "This decreases with each payment and determines your monthly interest charge."
  },

  totalInterest: {
    term: "Total Interest Paid",
    definition: "The cumulative amount of interest you've paid on your loan so far.",
    example: "If you've made 36 payments totaling €48,000 and paid down €15,000 in principal, you've paid €33,000 in interest.",
    tip: "This represents the 'cost of borrowing' - money that doesn't reduce your loan balance."
  },

  payoffTime: {
    term: "Payoff Time",
    definition: "How long it will take to completely pay off your mortgage with current payments.",
    example: "With extra payments, you might pay off a 30-year loan in 23 years instead.",
    tip: "Even small extra payments can shave years off your mortgage."
  },

  // Irish/European specific terms
  ltv: {
    term: "LTV (Loan-to-Value)",
    definition: "Your loan amount divided by your home's value, expressed as a percentage.",
    example: "A €320,000 loan on a €400,000 home has an 80% LTV ratio.",
    tip: "LTV above 80% typically requires PMI insurance."
  },

  // Timeline Terms
  purchaseDate: {
    term: "Purchase Date",
    definition: "The date you closed on your home and your mortgage payments began.",
    example: "If you bought your home on January 1st, 2024, that's your purchase date.",
    tip: "Used to calculate how much principal you've already paid and current equity."
  },

  monthsSincePurchase: {
    term: "Months Since Purchase",
    definition: "How many months have passed since you bought your home.",
    example: "If you bought your home 24 months ago, you've made 24 mortgage payments.",
    tip: "Shows your progress through the loan term and equity building."
  },

  currentAge: {
    term: "Current Age",
    definition: "Your age today, used to calculate how old you'll be when the mortgage is paid off.",
    example: "If you're 35 now with a 30-year loan, you'll be 65 when it's paid off.",
    tip: "Consider whether you want mortgage payments in retirement when choosing loan terms."
  },

  // Irish-specific terms
  trackerMortgage: {
    term: "Tracker Mortgage",
    definition: "A variable rate mortgage that tracks changes in the ECB base rate plus a margin.",
    example: "ECB rate + 1.5% margin = your mortgage rate",
    tip: "Common in Ireland; rates change when ECB rates change."
  },

  fixedRateMortgage: {
    term: "Fixed Rate Mortgage",
    definition: "A mortgage where the interest rate is fixed for a set period (typically 1-5 years).",
    example: "3.5% fixed for 5 years, then switches to variable rate",
    tip: "Provides payment certainty but may have higher rates than trackers."
  },

  stampDuty: {
    term: "Stamp Duty",
    definition: "Government tax on property purchases in Ireland.",
    example: "1% on homes up to €1M, 2% on €1M-€2M homes",
    tip: "Paid at closing; not included in mortgage but affects total purchase cost."
  }
};

// Helper function to get tooltip content
export const getTooltip = (key: string): string => {
  const term = mortgageGlossary[key];
  if (!term) return '';

  let tooltip = term.definition;
  if (term.example) {
    tooltip += `\n\nExample:\n${term.example}`;
  }
  if (term.tip) {
    tooltip += `\n\nTip:\n${term.tip}`;
  }

  return tooltip;
};

// Get just the title for the tooltip
export const getTooltipTitle = (key: string): string => {
  return mortgageGlossary[key]?.term || '';
};

