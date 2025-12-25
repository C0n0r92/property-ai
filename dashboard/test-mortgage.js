// Basic test to validate mortgage calculator works
const { calculateMortgage } = require('./src/lib/mortgage-calculator.ts');

// Test basic calculation
const testInputs = {
  loanAmount: 300000,
  interestRate: 3.5,
  loanTerm: 30,
  extraPayment: 0,
  currentAge: 35,
  purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  extraPaymentStartsNow: true,
  paymentFrequency: 'monthly',
  oneTimePayment: 0,
  oneTimePaymentDate: new Date().toISOString().split('T')[0],
  downPayment: 60000,
  homeValue: 360000,
  currency: 'EUR',
  pmiRate: 0.5
};

try {
  const result = calculateMortgage(testInputs);
  console.log('✅ Mortgage calculation works!');
  console.log('Monthly payment:', result.monthlyPayment);
  console.log('Total interest:', result.totalInterest);
  console.log('Payoff months:', result.payoffMonths);
} catch (error) {
  console.error('❌ Calculation failed:', error);
}
