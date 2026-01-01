const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Size-Based Mortgage Overpayment Strategy Analysis
console.log('\nSize-Based Mortgage Overpayment Strategy Analysis:');

// Define size bands
const sizeBands = [
  { min: 0, max: 70, label: 'Compact', name: 'Compact (<70sqm)' },
  { min: 70, max: 100, label: 'Standard', name: 'Standard (70-100sqm)' },
  { min: 100, max: 140, label: 'Spacious', name: 'Spacious (100-140sqm)' },
  { min: 140, max: 200, label: 'Large', name: 'Large (140-200sqm)' },
  { min: 200, max: 9999, label: 'XL', name: 'XL (200sqm+)' }
];

// Calculate mortgage scenarios for each size band
const mortgageRate = 0.035; // 3.5% interest rate
const mortgageTerm = 30; // 30 years
const depositPercentage = 0.2; // 20% deposit

function calculateMonthlyPayment(principal, rate, years) {
  const monthlyRate = rate / 12;
  const numPayments = years * 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function calculateOverpaymentSavings(overpaymentAmount, remainingYears, rate) {
  // Simplified calculation - overpayment reduces principal
  const monthlyRate = rate / 12;
  const remainingPayments = remainingYears * 12;
  const savings = overpaymentAmount * (monthlyRate * Math.pow(1 + monthlyRate, remainingPayments)) / (Math.pow(1 + monthlyRate, remainingPayments) - 1);
  return savings;
}

console.log('Mortgage Analysis by Property Size Band:');
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
  );

  if (bandProps.length < 100) return;

  const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
  const avgSize = bandProps.reduce((sum, p) => sum + p.areaSqm, 0) / bandProps.length;

  const deposit = avgPrice * depositPercentage;
  const mortgageAmount = avgPrice - deposit;

  const monthlyPayment = calculateMonthlyPayment(mortgageAmount, mortgageRate, mortgageTerm);
  const totalPayments = monthlyPayment * mortgageTerm * 12;
  const totalInterest = totalPayments - mortgageAmount;

  console.log(`\n${band.name} Properties:`);
  console.log(`  Sample size: ${bandProps.length} properties`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Average size: ${avgSize.toFixed(0)} sqm`);
  console.log(`  Mortgage amount: €${mortgageAmount.toLocaleString()}`);
  console.log(`  Monthly payment: €${monthlyPayment.toFixed(0)}`);
  console.log(`  Total interest over ${mortgageTerm} years: €${totalInterest.toLocaleString()}`);
});

// Overpayment strategy effectiveness by size band
console.log('\nOverpayment Savings by Size Band:');
const overpaymentAmounts = [5000, 10000, 15000]; // Monthly overpayments

sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
  );

  if (bandProps.length < 100) return;

  const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
  const deposit = avgPrice * depositPercentage;
  const mortgageAmount = avgPrice - deposit;

  console.log(`\n${band.name} Mortgage (€${mortgageAmount.toLocaleString()}):`);
  overpaymentAmounts.forEach(amount => {
    const monthlySavings = calculateOverpaymentSavings(amount, mortgageTerm, mortgageRate);
    const annualSavings = monthlySavings * 12;
    const totalSavings30Years = annualSavings * 30;
    console.log(`  €${amount}/month overpayment: €${annualSavings.toFixed(0)} annual savings, €${totalSavings30Years.toLocaleString()} over 30 years`);
  });
});

// Size band over-asking success rates (affects mortgage strategy)
console.log('\nOver-asking Success Rates by Size Band:');
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
  );

  if (bandProps.length < 100) return;

  const overAsking = bandProps.filter(p => p.overUnderPercent > 0);
  const successRate = (overAsking.length / bandProps.length * 100);
  const avgPremium = overAsking.length > 0 ?
    overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

  console.log(`${band.name}:`);
  console.log(`  Over-asking success rate: ${successRate.toFixed(1)}%`);
  console.log(`  Average premium when successful: ${avgPremium.toFixed(1)}%`);
  console.log(`  Properties analyzed: ${bandProps.length}`);
});

// Optimal overpayment strategy by size band
console.log('\nOptimal Overpayment Strategy by Size Band:');

// Calculate break-even analysis for different overpayment amounts
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
  );

  if (bandProps.length < 100) return;

  const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
  const deposit = avgPrice * depositPercentage;
  const mortgageAmount = avgPrice - deposit;

  // Calculate years to break even for different overpayment amounts
  console.log(`\n${band.name} Break-even Analysis:`);
  overpaymentAmounts.forEach(amount => {
    const monthlySavings = calculateOverpaymentSavings(amount, mortgageTerm, mortgageRate);
    const annualSavings = monthlySavings * 12;

    // Years to recover the initial overpayment cost
    const yearsToBreakEven = amount / annualSavings;

    console.log(`  €${amount} overpayment: ${yearsToBreakEven.toFixed(1)} years to break even`);
  });
});

// Size band investment efficiency
console.log('\nInvestment Efficiency by Size Band:');
sizeBands.forEach(band => {
  const bandProps = validProperties.filter(p =>
    p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
  );

  if (bandProps.length < 100) return;

  const yieldProps = bandProps.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);
  if (yieldProps.length < 20) return;

  const avgYield = yieldProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / yieldProps.length;
  const avgPrice = yieldProps.reduce((sum, p) => sum + p.soldPrice, 0) / yieldProps.length;

  console.log(`${band.name}:`);
  console.log(`  Average rental yield: ${avgYield.toFixed(2)}%`);
  console.log(`  Average property price: €${avgPrice.toLocaleString()}`);
  console.log(`  Properties with yield data: ${yieldProps.length}`);
});

// Export chart data
const chartData = {
  sizeBandMortgageChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
    );

    if (bandProps.length < 100) return null;

    const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
    const deposit = avgPrice * depositPercentage;
    const mortgageAmount = avgPrice - deposit;
    const monthlyPayment = calculateMonthlyPayment(mortgageAmount, mortgageRate, mortgageTerm);

    return {
      sizeBand: band.label,
      averagePrice: Math.round(avgPrice),
      mortgageAmount: Math.round(mortgageAmount),
      monthlyPayment: Math.round(monthlyPayment),
      sampleSize: bandProps.length
    };
  }).filter(Boolean),

  overpaymentSavingsChart: overpaymentAmounts.map(amount => {
    const savingsData = {};
    sizeBands.forEach(band => {
      const bandProps = validProperties.filter(p =>
        p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
      );

      if (bandProps.length < 100) return;

      const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
      const deposit = avgPrice * depositPercentage;
      const mortgageAmount = avgPrice - deposit;
      const annualSavings = calculateOverpaymentSavings(amount, mortgageTerm, mortgageRate) * 12;

      savingsData[band.label] = Math.round(annualSavings);
    });

    return {
      overpaymentAmount: amount,
      ...savingsData
    };
  }),

  sizeBandOverAskingChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
    );

    if (bandProps.length < 100) return null;

    const overAsking = bandProps.filter(p => p.overUnderPercent > 0);
    const successRate = overAsking.length / bandProps.length * 100;
    const avgPremium = overAsking.length > 0 ?
      overAsking.reduce((sum, p) => sum + p.overUnderPercent, 0) / overAsking.length : 0;

    return {
      sizeBand: band.label,
      successRate,
      averagePremium: avgPremium,
      sampleSize: bandProps.length
    };
  }).filter(Boolean),

  breakEvenAnalysisChart: overpaymentAmounts.map(amount => {
    const breakEvenData = {};
    sizeBands.forEach(band => {
      const bandProps = validProperties.filter(p =>
        p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
      );

      if (bandProps.length < 100) return;

      const avgPrice = bandProps.reduce((sum, p) => sum + p.soldPrice, 0) / bandProps.length;
      const deposit = avgPrice * depositPercentage;
      const mortgageAmount = avgPrice - deposit;
      const annualSavings = calculateOverpaymentSavings(amount, mortgageTerm, mortgageRate) * 12;
      const yearsToBreakEven = amount / annualSavings;

      breakEvenData[band.label] = yearsToBreakEven;
    });

    return {
      overpaymentAmount: amount,
      ...breakEvenData
    };
  }),

  yieldBySizeBandChart: sizeBands.map(band => {
    const bandProps = validProperties.filter(p =>
      p.areaSqm >= band.min && p.areaSqm < band.max && p.areaSqm > 0
    );

    if (bandProps.length < 100) return null;

    const yieldProps = bandProps.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);
    if (yieldProps.length < 20) return null;

    const avgYield = yieldProps.reduce((sum, p) => sum + p.yieldEstimate.grossYield, 0) / yieldProps.length;
    const avgPrice = yieldProps.reduce((sum, p) => sum + p.soldPrice, 0) / yieldProps.length;

    return {
      sizeBand: band.label,
      averageYield: avgYield,
      averagePrice: Math.round(avgPrice),
      sampleSize: yieldProps.length
    };
  }).filter(Boolean)
};

fs.writeFileSync('blog42_size_based_mortgage_strategy_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog42_size_based_mortgage_strategy_chart_data.json');
