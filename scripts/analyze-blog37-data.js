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

// Bathroom Premium Analysis - How extra bathrooms affect property value and mortgage strategy
console.log('\nBathroom Premium Analysis:');

// Calculate average price by bathroom count
const bathroomStats = {};
for (let baths = 1; baths <= 5; baths++) {
  const bathProps = validProperties.filter(p => p.baths === baths && p.beds >= 1 && p.beds <= 6);
  if (bathProps.length < 50) continue;

  const avgPrice = bathProps.reduce((sum, p) => sum + p.soldPrice, 0) / bathProps.length;
  const avgSize = bathProps.reduce((sum, p) => sum + p.areaSqm, 0) / bathProps.length;
  const avgPricePerSqm = bathProps.reduce((sum, p) => sum + p.pricePerSqm, 0) / bathProps.length;

  bathroomStats[baths] = {
    count: bathProps.length,
    avgPrice: avgPrice,
    avgSize: avgSize,
    avgPricePerSqm: avgPricePerSqm,
    properties: bathProps
  };

  console.log(`${baths} bathroom properties:`);
  console.log(`  Count: ${bathProps.length}`);
  console.log(`  Average price: €${avgPrice.toLocaleString()}`);
  console.log(`  Average size: ${avgSize.toFixed(0)} sqm`);
  console.log(`  Price per sqm: €${avgPricePerSqm.toFixed(0)}`);
  console.log('');
}

// Calculate incremental value per additional bathroom
console.log('Incremental Value Analysis (per additional bathroom):');
const incrementalValues = [];
for (let baths = 2; baths <= 5; baths++) {
  if (!bathroomStats[baths] || !bathroomStats[baths-1]) continue;

  const priceIncrease = bathroomStats[baths].avgPrice - bathroomStats[baths-1].avgPrice;
  const sizeIncrease = bathroomStats[baths].avgSize - bathroomStats[baths-1].avgSize;
  const valuePerBathroom = priceIncrease;
  const valuePerSqmBathroom = priceIncrease / sizeIncrease;

  incrementalValues.push({
    fromBaths: baths-1,
    toBaths: baths,
    priceIncrease: priceIncrease,
    sizeIncrease: sizeIncrease,
    valuePerBathroom: valuePerBathroom,
    valuePerSqmBathroom: valuePerSqmBathroom,
    efficiency: valuePerBathroom / sizeIncrease
  });

  console.log(`${baths-1} → ${baths} bathrooms:`);
  console.log(`  Price increase: €${priceIncrease.toLocaleString()}`);
  console.log(`  Size increase: ${sizeIncrease.toFixed(1)} sqm`);
  console.log(`  Value per sqm from extra bathroom: €${valuePerSqmBathroom.toFixed(0)}`);
  console.log('');
}

// Mortgage overpayment strategy analysis
console.log('Mortgage Strategy Analysis (Bathroom Premium Impact):');

// Simulate mortgage scenarios for different bathroom counts
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

console.log('Mortgage Scenarios by Bathroom Count:');
Object.entries(bathroomStats).forEach(([baths, stats]) => {
  const propertyPrice = stats.avgPrice;
  const deposit = propertyPrice * depositPercentage;
  const mortgageAmount = propertyPrice - deposit;

  const monthlyPayment = calculateMonthlyPayment(mortgageAmount, mortgageRate, mortgageTerm);
  const totalPayments = monthlyPayment * mortgageTerm * 12;
  const totalInterest = totalPayments - mortgageAmount;

  console.log(`${baths} bathroom property (€${propertyPrice.toLocaleString()}):`);
  console.log(`  Mortgage amount: €${mortgageAmount.toLocaleString()}`);
  console.log(`  Monthly payment: €${monthlyPayment.toFixed(0)}`);
  console.log(`  Total interest over ${mortgageTerm} years: €${totalInterest.toLocaleString()}`);
  console.log('');
});

// Overpayment strategy - how much extra payment saves on different bathroom properties
console.log('Overpayment Savings Analysis:');
const overpaymentAmounts = [5000, 10000, 20000]; // Monthly overpayments

Object.entries(bathroomStats).forEach(([baths, stats]) => {
  const propertyPrice = stats.avgPrice;
  const deposit = propertyPrice * depositPercentage;
  const mortgageAmount = propertyPrice - deposit;

  console.log(`${baths} bathroom mortgage (€${mortgageAmount.toLocaleString()}):`);
  overpaymentAmounts.forEach(amount => {
    const monthlySavings = calculateOverpaymentSavings(amount, mortgageTerm, mortgageRate);
    const annualSavings = monthlySavings * 12;
    console.log(`  €${amount}/month overpayment: €${annualSavings.toFixed(0)} annual savings`);
  });
  console.log('');
});

// Bathroom premium efficiency - which bathroom upgrades give best value
console.log('Bathroom Upgrade Value Efficiency:');
incrementalValues.forEach(increment => {
  const mortgageIncrease = increment.priceIncrease * (1 - depositPercentage);
  const monthlyIncrease = calculateMonthlyPayment(mortgageIncrease, mortgageRate, mortgageTerm);

  console.log(`Upgrading from ${increment.fromBaths} to ${increment.toBaths} bathrooms:`);
  console.log(`  Extra mortgage cost: €${mortgageIncrease.toLocaleString()}`);
  console.log(`  Extra monthly payment: €${monthlyIncrease.toFixed(0)}`);
  console.log(`  Value efficiency: €${increment.efficiency.toFixed(0)} per sqm`);
  console.log('');
});

// Export chart data
const chartData = {
  bathroomPremiumChart: Object.entries(bathroomStats).map(([baths, stats]) => ({
    bathrooms: parseInt(baths),
    count: stats.count,
    averagePrice: Math.round(stats.avgPrice),
    averageSize: Math.round(stats.avgSize),
    pricePerSqm: Math.round(stats.avgPricePerSqm)
  })),

  incrementalValueChart: incrementalValues.map(increment => ({
    upgrade: `${increment.fromBaths}→${increment.toBaths}`,
    priceIncrease: Math.round(increment.priceIncrease),
    valuePerSqm: Math.round(increment.valuePerSqmBathroom),
    efficiency: Math.round(increment.efficiency)
  })),

  mortgagePaymentChart: Object.entries(bathroomStats).map(([baths, stats]) => {
    const propertyPrice = stats.avgPrice;
    const deposit = propertyPrice * depositPercentage;
    const mortgageAmount = propertyPrice - deposit;
    const monthlyPayment = calculateMonthlyPayment(mortgageAmount, mortgageRate, mortgageTerm);

    return {
      bathrooms: parseInt(baths),
      mortgageAmount: Math.round(mortgageAmount),
      monthlyPayment: Math.round(monthlyPayment)
    };
  }),

  overpaymentSavingsChart: overpaymentAmounts.map(amount => {
    const savingsData = {};
    Object.entries(bathroomStats).forEach(([baths, stats]) => {
      const propertyPrice = stats.avgPrice;
      const deposit = propertyPrice * depositPercentage;
      const mortgageAmount = propertyPrice - deposit;
      const annualSavings = calculateOverpaymentSavings(amount, mortgageTerm, mortgageRate) * 12;
      savingsData[`bath${baths}`] = Math.round(annualSavings);
    });

    return {
      overpaymentAmount: amount,
      ...savingsData
    };
  }),

  bathroomEfficiencyChart: incrementalValues.map(increment => ({
    upgrade: `${increment.fromBaths}→${increment.toBaths}`,
    monthlyIncrease: Math.round(calculateMonthlyPayment(increment.priceIncrease * (1 - depositPercentage), mortgageRate, mortgageTerm)),
    efficiency: Math.round(increment.efficiency)
  }))
};

fs.writeFileSync('blog37_bathroom_mortgage_strategy_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog37_bathroom_mortgage_strategy_chart_data.json');
