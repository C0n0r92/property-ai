const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties with complete data
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice &&
         p.overUnderPercent !== null &&
         p.overUnderPercent !== undefined;
});

console.log(`=== MORTGAGE OVERPAYMENT SAVINGS ANALYSIS ===\n`);
console.log(`Total properties with bidding data: ${validProps.length.toLocaleString()}`);

// Analyze bidding war premiums
const biddingWars = validProps.filter(p => p.overUnderPercent > 0);
const avgPremium = biddingWars.reduce((sum, p) => sum + p.overUnderPercent, 0) / biddingWars.length;
const medianPremium = [...biddingWars].sort((a, b) => a.overUnderPercent - b.overUnderPercent)[Math.floor(biddingWars.length / 2)].overUnderPercent;

console.log('🎯 BIDDING WAR ANALYSIS');
console.log('=======================');
console.log(`Properties in bidding wars: ${biddingWars.length} (${((biddingWars.length / validProps.length) * 100).toFixed(1)}%)`);
console.log(`Average premium paid: ${avgPremium.toFixed(1)}%`);
console.log(`Median premium paid: ${medianPremium.toFixed(1)}%`);

// Calculate mortgage impact scenarios
const calculateMortgageImpact = (propertyPrice, premiumPercent, interestRate = 3.5, loanToValue = 0.8, termYears = 30) => {
  const basePrice = propertyPrice;
  const premiumAmount = basePrice * (premiumPercent / 100);
  const finalPrice = basePrice + premiumAmount;

  // Mortgage calculations
  const loanAmount = finalPrice * loanToValue;
  const baseLoanAmount = basePrice * loanToValue;

  // Monthly payments using standard mortgage formula
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = termYears * 12;

  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const baseMonthlyPayment = baseLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  const extraMonthlyPayment = monthlyPayment - baseMonthlyPayment;
  const totalInterestPaid = (monthlyPayment * numPayments) - loanAmount;
  const baseTotalInterest = (baseMonthlyPayment * numPayments) - baseLoanAmount;
  const extraInterestPaid = totalInterestPaid - baseTotalInterest;

  return {
    basePrice,
    premiumAmount,
    finalPrice,
    loanAmount,
    baseLoanAmount,
    monthlyPayment,
    baseMonthlyPayment,
    extraMonthlyPayment,
    totalInterestPaid,
    baseTotalInterest,
    extraInterestPaid,
    totalLifetimeCost: premiumAmount + extraInterestPaid
  };
};

// Test scenarios with different property prices
const priceScenarios = [
  { price: 500000, description: '€500K Property' },
  { price: 750000, description: '€750K Property' },
  { price: 1000000, description: '€1M Property' }
];

console.log('\n💰 MORTGAGE IMPACT ANALYSIS');
console.log('===========================');

priceScenarios.forEach(scenario => {
  console.log(`\n${scenario.description} with ${avgPremium.toFixed(1)}% premium:`);
  const impact = calculateMortgageImpact(scenario.price, avgPremium);

  console.log(`• Base price: €${impact.basePrice.toLocaleString()}`);
  console.log(`• Premium paid: €${impact.premiumAmount.toLocaleString()}`);
  console.log(`• Final price: €${impact.finalPrice.toLocaleString()}`);
  console.log(`• Extra monthly payment: €${Math.round(impact.extraMonthlyPayment)}`);
  console.log(`• Extra interest over 30 years: €${Math.round(impact.extraInterestPaid).toLocaleString()}`);
  console.log(`• Total lifetime cost of premium: €${Math.round(impact.totalLifetimeCost).toLocaleString()}`);
});

// Overpayment savings analysis
const calculateOverpaymentSavings = (loanAmount, extraPayment, interestRate = 3.5, termYears = 30) => {
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = termYears * 12;

  // Calculate original payments
  const originalMonthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const originalTotalPaid = originalMonthlyPayment * numPayments;
  const originalInterest = originalTotalPaid - loanAmount;

  // Calculate payments with extra amount
  let remainingBalance = loanAmount;
  let totalPaid = 0;
  let months = 0;
  let interestSaved = 0;

  while (remainingBalance > 0 && months < numPayments) {
    // Interest for this month
    const interestPayment = remainingBalance * monthlyRate;

    // Principal payment (regular + extra)
    const totalPayment = originalMonthlyPayment + extraPayment;
    const principalPayment = Math.min(totalPayment - interestPayment, remainingBalance);

    remainingBalance -= principalPayment;
    totalPaid += totalPayment;
    months++;

    if (remainingBalance <= 0) break;
  }

  const newTotalInterest = totalPaid - loanAmount;
  interestSaved = originalInterest - newTotalInterest;
  const timeSaved = numPayments - months;

  return {
    originalTotalPaid: Math.round(originalTotalPaid),
    originalInterest: Math.round(originalInterest),
    newTotalPaid: Math.round(totalPaid),
    newTotalInterest: Math.round(newTotalInterest),
    interestSaved: Math.round(interestSaved),
    monthsSaved: timeSaved,
    yearsSaved: Math.round(timeSaved / 12 * 10) / 10
  };
};

console.log('\n💸 OVERPAYMENT SAVINGS ANALYSIS');
console.log('================================');

const overpaymentScenarios = [
  { loan: 400000, extra: 100, description: '€400K loan, €100 extra/month' },
  { loan: 600000, extra: 150, description: '€600K loan, €150 extra/month' },
  { loan: 800000, extra: 200, description: '€800K loan, €200 extra/month' }
];

overpaymentScenarios.forEach(scenario => {
  console.log(`\n${scenario.description}:`);
  const savings = calculateOverpaymentSavings(scenario.loan, scenario.extra);

  console.log(`• Original 30-year interest: €${savings.originalInterest.toLocaleString()}`);
  console.log(`• New total interest: €${savings.newTotalInterest.toLocaleString()}`);
  console.log(`• Interest saved: €${savings.interestSaved.toLocaleString()}`);
  console.log(`• Time saved: ${savings.yearsSaved} years`);
});

// Premium distribution analysis
const premiumRanges = {
  '0-5%': 0,
  '5-10%': 0,
  '10-15%': 0,
  '15-20%': 0,
  '20%+': 0
};

biddingWars.forEach(p => {
  if (p.overUnderPercent < 5) premiumRanges['0-5%']++;
  else if (p.overUnderPercent < 10) premiumRanges['5-10%']++;
  else if (p.overUnderPercent < 15) premiumRanges['10-15%']++;
  else if (p.overUnderPercent < 20) premiumRanges['15-20%']++;
  else premiumRanges['20%+']++;
});

console.log('\n📊 PREMIUM DISTRIBUTION');
console.log('=======================');
Object.entries(premiumRanges).forEach(([range, count]) => {
  const percentage = ((count / biddingWars.length) * 100).toFixed(1);
  console.log(`${range}: ${count} properties (${percentage}%)`);
});

// Create chart data
const chartData = {
  PremiumDistributionChart: Object.entries(premiumRanges).map(([range, count]) => ({
    range: range,
    count: count,
    percentage: ((count / biddingWars.length) * 100).toFixed(1)
  })),

  MortgageImpactChart: priceScenarios.map(scenario => {
    const impact = calculateMortgageImpact(scenario.price, avgPremium);
    return {
      propertyPrice: scenario.price,
      premiumAmount: Math.round(impact.premiumAmount),
      extraInterest30Years: Math.round(impact.extraInterestPaid),
      totalLifetimeCost: Math.round(impact.totalLifetimeCost)
    };
  }),

  OverpaymentSavingsChart: overpaymentScenarios.map(scenario => {
    const savings = calculateOverpaymentSavings(scenario.loan, scenario.extra);
    return {
      loanAmount: scenario.loan,
      extraMonthlyPayment: scenario.extra,
      interestSaved: savings.interestSaved,
      yearsSaved: savings.yearsSaved
    };
  }),

  MonthlyPaymentBreakdownChart: priceScenarios.map(scenario => {
    const impact = calculateMortgageImpact(scenario.price, avgPremium);
    return {
      propertyPrice: scenario.price,
      baseMonthlyPayment: Math.round(impact.baseMonthlyPayment),
      premiumMonthlyPayment: Math.round(impact.monthlyPayment),
      extraMonthlyCost: Math.round(impact.extraMonthlyPayment)
    };
  })
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog23_mortgage_overpayment_savings_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Mortgage Overpayment Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY MORTGAGE INSIGHTS');
console.log('========================');
console.log(`• Average bidding war premium: ${avgPremium.toFixed(1)}%`);
console.log(`• Properties in bidding wars: ${((biddingWars.length / validProps.length) * 100).toFixed(1)}%`);
console.log(`• €1M property premium cost: €${Math.round(calculateMortgageImpact(1000000, avgPremium).totalLifetimeCost).toLocaleString()} over 30 years`);
console.log(`• €100 extra/month on €600K loan saves: €${calculateOverpaymentSavings(600000, 100).interestSaved.toLocaleString()} in interest`);
console.log(`• €100 extra/month reduces loan term by: ${calculateOverpaymentSavings(600000, 100).yearsSaved} years`);
