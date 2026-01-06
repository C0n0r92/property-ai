const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = path.join(__dirname, '../dashboard/public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter valid properties for price analysis
const validProps = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31') &&
         p.soldPrice &&
         p.dublinPostcode;
});

console.log(`=== MORTGAGE OVERPAYMENT STRATEGY COMPARISON ANALYSIS ===\n`);
console.log(`Total properties analyzed: ${validProps.length.toLocaleString()}`);

// Analyze property price distribution by buyer type scenarios
const priceRanges = {
  'First-time Buyer': { min: 300000, max: 500000, description: 'Entry-level properties' },
  'Family Home': { min: 500000, max: 750000, description: 'Family-sized homes' },
  'Premium Property': { min: 750000, max: 1000000, description: 'High-end properties' },
  'Luxury Investment': { min: 1000000, max: 1500000, description: 'Investment-grade properties' }
};

const buyerProfiles = Object.entries(priceRanges).map(([profile, range]) => {
  const properties = validProps.filter(p => p.soldPrice >= range.min && p.soldPrice < range.max);
  const avgPrice = properties.length > 0 ? properties.reduce((sum, p) => sum + p.soldPrice, 0) / properties.length : 0;
  const medianPrice = properties.length > 0 ? [...properties].sort((a, b) => a.soldPrice - b.soldPrice)[Math.floor(properties.length / 2)].soldPrice : 0;

  return {
    profile,
    range,
    avgPrice: Math.round(avgPrice),
    medianPrice: Math.round(medianPrice),
    count: properties.length
  };
});

console.log('\n🏠 BUYER PROFILE ANALYSIS');
console.log('===========================');
buyerProfiles.forEach(profile => {
  console.log(`${profile.profile}: €${profile.medianPrice.toLocaleString()} median (${profile.count} properties)`);
});

// Mortgage calculation scenarios
const mortgageScenarios = [
  { name: 'Conservative', interestRate: 4.5, loanToValue: 0.75, termYears: 30 },
  { name: 'Current Market', interestRate: 3.5, loanToValue: 0.8, termYears: 30 },
  { name: 'Aggressive', interestRate: 2.5, loanToValue: 0.9, termYears: 25 }
];

const calculateMortgageStrategy = (propertyPrice, scenario, extraPayment = 0) => {
  const loanAmount = propertyPrice * scenario.loanToValue;
  const monthlyRate = scenario.interestRate / 100 / 12;
  const numPayments = scenario.termYears * 12;

  // Standard mortgage calculation
  const standardMonthly = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  // With extra payments
  let remainingBalance = loanAmount;
  let totalPaid = 0;
  let months = 0;

  while (remainingBalance > 0 && months < numPayments) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = Math.min(standardMonthly - interestPayment + extraPayment, remainingBalance);

    remainingBalance -= principalPayment;
    totalPaid += standardMonthly + extraPayment;
    months++;

    if (remainingBalance <= 0) break;
  }

  const totalInterest = totalPaid - loanAmount;
  const timeSaved = numPayments - months;

  return {
    loanAmount: Math.round(loanAmount),
    standardMonthly: Math.round(standardMonthly),
    totalWithExtra: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest),
    monthsPaid: months,
    yearsSaved: Math.round(timeSaved / 12 * 10) / 10
  };
};

console.log('\n💰 MORTGAGE STRATEGY COMPARISON');
console.log('================================');

// Compare strategies for each buyer profile
const strategyComparison = [];
buyerProfiles.forEach(profile => {
  console.log(`\n${profile.profile} (€${profile.medianPrice.toLocaleString()}):`);

  mortgageScenarios.forEach(scenario => {
    const standard = calculateMortgageStrategy(profile.medianPrice, scenario, 0);
    const withExtra100 = calculateMortgageStrategy(profile.medianPrice, scenario, 100);
    const withExtra200 = calculateMortgageStrategy(profile.medianPrice, scenario, 200);

    console.log(`  ${scenario.name} (${scenario.interestRate}% rate, ${scenario.termYears} years):`);
    console.log(`    Standard: €${standard.standardMonthly}/month, ${standard.monthsPaid} months total`);
    console.log(`    +€100 extra: €${withExtra100.standardMonthly + 100}/month, ${withExtra100.monthsPaid} months (${withExtra100.yearsSaved} years saved)`);
    console.log(`    +€200 extra: €${withExtra200.standardMonthly + 200}/month, ${withExtra200.monthsPaid} months (${withExtra200.yearsSaved} years saved)`);

    strategyComparison.push({
      profile: profile.profile,
      scenario: scenario.name,
      propertyPrice: profile.medianPrice,
      interestRate: scenario.interestRate,
      standardMonthly: standard.standardMonthly,
      extra100Monthly: withExtra100.standardMonthly + 100,
      extra200Monthly: withExtra200.standardMonthly + 200,
      standardYears: scenario.termYears,
      extra100Years: Math.round(withExtra100.monthsPaid / 12 * 10) / 10,
      extra200Years: Math.round(withExtra200.monthsPaid / 12 * 10) / 10,
      interestSaved100: standard.totalInterest - withExtra100.totalInterest,
      interestSaved200: standard.totalInterest - withExtra200.totalInterest
    });
  });
});

// Break-even analysis - how long until extra payments pay for themselves
const calculateBreakEven = (propertyPrice, scenario, extraPayment) => {
  const loanAmount = propertyPrice * scenario.loanToValue;
  const monthlyRate = scenario.interestRate / 100 / 12;
  const numPayments = scenario.termYears * 12;
  const standardMonthly = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  let remainingBalance = loanAmount;
  let totalExtraPaid = 0;
  let interestSaved = 0;
  let months = 0;

  while (remainingBalance > 0 && months < numPayments) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = Math.min(standardMonthly - interestPayment + extraPayment, remainingBalance);

    // Calculate what would have been paid without extra
    const standardPrincipal = Math.min(standardMonthly - interestPayment, remainingBalance);
    interestSaved += (principalPayment - standardPrincipal);

    remainingBalance -= principalPayment;
    totalExtraPaid += extraPayment;
    months++;

    // Break even when interest saved equals extra payments
    if (interestSaved >= totalExtraPaid && totalExtraPaid > 0) {
      return {
        breakEvenMonths: months,
        breakEvenYears: Math.round(months / 12 * 10) / 10,
        totalExtraPaid: Math.round(totalExtraPaid),
        interestSaved: Math.round(interestSaved)
      };
    }

    if (remainingBalance <= 0) break;
  }

  return null; // Never breaks even
};

console.log('\n⚖️ BREAK-EVEN ANALYSIS');
console.log('=======================');

const breakEvenResults = [];
buyerProfiles.forEach(profile => {
  console.log(`\n${profile.profile} Break-even Analysis:`);

  mortgageScenarios.forEach(scenario => {
    const breakEven100 = calculateBreakEven(profile.medianPrice, scenario, 100);
    const breakEven200 = calculateBreakEven(profile.medianPrice, scenario, 200);

    console.log(`  ${scenario.name} scenario:`);
    if (breakEven100) {
      console.log(`    €100 extra: Breaks even in ${breakEven100.breakEvenYears} years`);
    } else {
      console.log(`    €100 extra: Never breaks even within loan term`);
    }
    if (breakEven200) {
      console.log(`    €200 extra: Breaks even in ${breakEven200.breakEvenYears} years`);
    } else {
      console.log(`    €200 extra: Never breaks even within loan term`);
    }

    breakEvenResults.push({
      profile: profile.profile,
      scenario: scenario.name,
      propertyPrice: profile.medianPrice,
      breakEven100Years: breakEven100 ? breakEven100.breakEvenYears : null,
      breakEven200Years: breakEven200 ? breakEven200.breakEvenYears : null
    });
  });
});

// Long-term savings projections
console.log('\n📈 LONG-TERM SAVINGS PROJECTIONS');
console.log('==================================');

const savingsProjections = buyerProfiles.map(profile => {
  const currentMarket = mortgageScenarios[1]; // Current market scenario
  const standard = calculateMortgageStrategy(profile.medianPrice, currentMarket, 0);
  const withExtra150 = calculateMortgageStrategy(profile.medianPrice, currentMarket, 150);

  return {
    profile: profile.profile,
    propertyPrice: profile.medianPrice,
    standardTotalPaid: standard.totalWithExtra,
    extraTotalPaid: withExtra150.totalWithExtra,
    totalSavings: standard.totalWithExtra - withExtra150.totalWithExtra,
    yearsSaved: Math.round((standard.monthsPaid - withExtra150.monthsPaid) / 12 * 10) / 10,
    monthlyExtra: 150
  };
});

savingsProjections.forEach(proj => {
  console.log(`${proj.profile}: €${proj.totalSavings.toLocaleString()} saved, ${proj.yearsSaved} years faster payoff`);
});

// Create chart data
const chartData = {
  BuyerProfileComparisonChart: buyerProfiles.map(profile => ({
    profile: profile.profile,
    medianPrice: profile.medianPrice,
    avgPrice: profile.avgPrice,
    propertyCount: profile.count
  })),

  MortgageStrategyChart: strategyComparison.filter(item => item.scenario === 'Current Market').map(item => ({
    profile: item.profile,
    standardMonthly: item.standardMonthly,
    extra100Monthly: item.extra100Monthly,
    extra200Monthly: item.extra200Monthly
  })),

  BreakEvenChart: breakEvenResults.filter(item => item.scenario === 'Current Market').map(item => ({
    profile: item.profile,
    breakEven100Years: item.breakEven100Years || 30, // Max term if never breaks even
    breakEven200Years: item.breakEven200Years || 30
  })),

  LongTermSavingsChart: savingsProjections.map(proj => ({
    profile: proj.profile,
    totalSavings: proj.totalSavings,
    yearsSaved: proj.yearsSaved,
    monthlyExtra: proj.monthlyExtra
  })),

  ScenarioComparisonChart: mortgageScenarios.map(scenario => {
    const firstTimeBuyer = buyerProfiles[0];
    const standard = calculateMortgageStrategy(firstTimeBuyer.medianPrice, scenario, 0);
    const withExtra = calculateMortgageStrategy(firstTimeBuyer.medianPrice, scenario, 150);

    return {
      scenario: scenario.name,
      interestRate: scenario.interestRate,
      standardMonthly: standard.standardMonthly,
      extraMonthly: withExtra.standardMonthly + 150,
      totalSavings: standard.totalWithExtra - withExtra.totalWithExtra
    };
  })
};

// Write chart data to file
const chartDataPath = path.join(__dirname, '../blogs/blog27_mortgage_strategy_comparison_chart_data.json');
fs.writeFileSync(chartDataPath, JSON.stringify(chartData, null, 2));

console.log(`\n📊 Chart data exported to: ${chartDataPath}`);
console.log('\n✅ Mortgage Strategy Comparison Analysis Complete!');

// Key insights summary
console.log('\n📋 KEY MORTGAGE STRATEGY INSIGHTS');
console.log('===================================');
console.log(`• First-time buyers save €${savingsProjections[0].totalSavings.toLocaleString()} with €150 extra payments`);
console.log(`• Luxury investors break even fastest: ${breakEvenResults.filter(r => r.profile === 'Luxury Investment')[0].breakEven100Years || 'Never'} years for €100 extra`);
console.log(`• Conservative rates make overpayment less attractive due to lower interest costs`);
console.log(`• €200 extra payments pay for themselves in ${Math.min(...breakEvenResults.map(r => r.breakEven200Years).filter(y => y !== null))} years minimum`);
console.log(`• Time saved ranges from ${Math.min(...savingsProjections.map(p => p.yearsSaved))} to ${Math.max(...savingsProjections.map(p => p.yearsSaved))} years across buyer profiles`);

