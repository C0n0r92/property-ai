const fs = require('fs');

// Load data
const data = JSON.parse(fs.readFileSync('../dashboard/public/data.json', 'utf8'));

// Filter for valid 2024-2025 properties
const validProperties = data.properties.filter(p => {
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2024-01-01') &&
         soldDate <= new Date('2025-12-31');
});

console.log(`Total valid properties analyzed: ${validProperties.length}`);

// Analyze overpayment savings by property type
function calculateMortgageSavings(propertyPrice, overpaymentMonthly, interestRate = 0.035, termYears = 30) {
  // Assume 20% deposit, 80% mortgage
  const loanAmount = propertyPrice * 0.8;
  const monthlyRate = interestRate / 12;
  const totalPayments = termYears * 12;

  // Standard mortgage calculation
  const standardMonthly = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
                         (Math.pow(1 + monthlyRate, totalPayments) - 1);

  // With overpayments
  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;

  while (balance > 0 && months < totalPayments) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = Math.min(standardMonthly - interestPayment + overpaymentMonthly, balance);

    totalInterest += interestPayment;
    balance -= principalPayment;
    months++;

    if (balance <= 0) break;
  }

  const timeSaved = (totalPayments - months) / 12;

  // Calculate standard mortgage total interest for comparison
  let standardBalance = loanAmount;
  let standardInterest = 0;

  for (let i = 0; i < totalPayments && standardBalance > 0; i++) {
    const interest = standardBalance * monthlyRate;
    const principal = Math.min(standardMonthly - interest, standardBalance);
    standardInterest += interest;
    standardBalance -= principal;
  }

  return {
    loanAmount,
    standardMonthly,
    interestSaved: standardInterest - totalInterest,
    timeSaved,
    totalOverpayments: overpaymentMonthly * months
  };
}

// Group by property type
const propertyTypeAnalysis = {};
const propertyTypes = ['Apartment', 'Semi-D', 'Terrace', 'Detached', 'End of Terrace', 'Duplex'];

propertyTypes.forEach(type => {
  const typeProperties = validProperties.filter(p => p.propertyType === type);
  if (typeProperties.length < 50) return; // Skip if insufficient data

  const avgPrice = typeProperties.reduce((sum, p) => sum + p.soldPrice, 0) / typeProperties.length;
  const overpaymentSavings = calculateMortgageSavings(avgPrice, 150);

  propertyTypeAnalysis[type] = {
    count: typeProperties.length,
    averagePrice: avgPrice,
    overpaymentSavings: {
      interestSaved: overpaymentSavings.interestSaved,
      timeSaved: overpaymentSavings.timeSaved,
      monthlyPayment: overpaymentSavings.standardMonthly,
      loanAmount: overpaymentSavings.loanAmount
    }
  };
});

console.log('\nMortgage Overpayment Savings by Property Type:');
Object.entries(propertyTypeAnalysis).forEach(([type, data]) => {
  console.log(`\n${type} (€${data.averagePrice.toLocaleString()} average):`);
  console.log(`  Sample size: ${data.count} properties`);
  console.log(`  €150 monthly overpayments save: €${data.overpaymentSavings.interestSaved.toLocaleString()}`);
  console.log(`  Time saved: ${data.overpaymentSavings.timeSaved.toFixed(1)} years`);
  console.log(`  Standard monthly payment: €${data.overpaymentSavings.monthlyPayment.toFixed(0)}`);
});

// Analyze bidding war impact by property type
console.log('\nBidding War Impact by Property Type:');
Object.entries(propertyTypeAnalysis).forEach(([type]) => {
  const typeProperties = validProperties.filter(p => p.propertyType === type);
  const biddingWars = typeProperties.filter(p => p.overUnderPercent > 0);
  const avgPremium = biddingWars.length > 0 ?
    biddingWars.reduce((sum, p) => sum + p.overUnderPercent, 0) / biddingWars.length : 0;

  console.log(`${type}: ${(biddingWars.length / typeProperties.length * 100).toFixed(1)}% over-asking rate, ${avgPremium.toFixed(1)}% average premium`);
});

// Export chart data
const chartData = {
  propertyTypeSavingsChart: Object.entries(propertyTypeAnalysis).map(([type, data]) => ({
    propertyType: type,
    averagePrice: Math.round(data.averagePrice),
    interestSaved: Math.round(data.overpaymentSavings.interestSaved),
    timeSaved: data.overpaymentSavings.timeSaved,
    sampleSize: data.count
  })),
  biddingWarImpactChart: propertyTypes.map(type => {
    const typeProperties = validProperties.filter(p => p.propertyType === type);
    if (typeProperties.length < 50) return null;

    const biddingWars = typeProperties.filter(p => p.overUnderPercent > 0);
    const avgPremium = biddingWars.length > 0 ?
      biddingWars.reduce((sum, p) => sum + p.overUnderPercent, 0) / biddingWars.length : 0;

    return {
      propertyType: type,
      overAskingRate: (biddingWars.length / typeProperties.length * 100),
      averagePremium: avgPremium,
      sampleSize: typeProperties.length
    };
  }).filter(Boolean),
  savingsBreakdownChart: [
    { scenario: '€400K Apartment', interestSaved: Math.round(calculateMortgageSavings(400000, 150).interestSaved), timeSaved: calculateMortgageSavings(400000, 150).timeSaved },
    { scenario: '€550K Terrace', interestSaved: Math.round(calculateMortgageSavings(550000, 150).interestSaved), timeSaved: calculateMortgageSavings(550000, 150).timeSaved },
    { scenario: '€750K Semi-D', interestSaved: Math.round(calculateMortgageSavings(750000, 150).interestSaved), timeSaved: calculateMortgageSavings(750000, 150).timeSaved },
    { scenario: '€950K Detached', interestSaved: Math.round(calculateMortgageSavings(950000, 150).interestSaved), timeSaved: calculateMortgageSavings(950000, 150).timeSaved }
  ]
};

fs.writeFileSync('blog32_property_type_mortgage_strategy_chart_data.json', JSON.stringify(chartData, null, 2));
console.log('\nChart data exported to blog32_property_type_mortgage_strategy_chart_data.json');
