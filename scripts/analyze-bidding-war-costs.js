const fs = require('fs');
const path = require('path');

// Read the data
const dataPath = '/Users/conor.mcloughlin/code/property-ml/dashboard/.next/standalone/code/property-ml/dashboard/public/data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Mortgage calculation functions
function calculateMortgagePayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 12 / 100;
  const numPayments = years * 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function calculateTotalInterest(principal, monthlyPayment, years) {
  return (monthlyPayment * years * 12) - principal;
}

function calculateAmortizationSchedule(principal, annualRate, years) {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, years);
  const monthlyRate = annualRate / 12 / 100;
  const numPayments = years * 12;

  let balance = principal;
  let totalInterest = 0;
  let schedule = [];

  for (let month = 1; month <= numPayments; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    totalInterest += interestPayment;

    // Record key milestones
    if (month === 12 || month === 60 || month === 120 || month === 240 || month === 360) {
      schedule.push({
        year: month / 12,
        totalPaid: monthlyPayment * month,
        totalInterest: totalInterest,
        remainingBalance: Math.max(0, balance),
        interestPortion: (totalInterest / (monthlyPayment * month)) * 100
      });
    }
  }

  return {
    monthlyPayment,
    totalInterest,
    totalPaid: monthlyPayment * numPayments,
    schedule
  };
}

console.log('=== BIDDING WAR COST ANALYSIS ===\n');

// Filter properties with bidding war data
const biddingWars = data.properties.filter(p =>
  p.overUnderPercent !== null &&
  p.overUnderPercent > 0 &&
  p.dublinPostcode
);

console.log(`Analyzed ${biddingWars.length.toLocaleString()} bidding war transactions`);

const avgPremiumPercent = biddingWars.reduce((sum, p) => sum + p.overUnderPercent, 0) / biddingWars.length;
const avgPremiumAmount = biddingWars.reduce((sum, p) => sum + (p.soldPrice * p.overUnderPercent / 100), 0) / biddingWars.length;

console.log(`\n📊 BIDDING WAR PREMIUMS`);
console.log('========================');
console.log(`Average premium: ${avgPremiumPercent.toFixed(1)}%`);
console.log(`Average premium amount: €${avgPremiumAmount.toFixed(0).toLocaleString()}`);

console.log(`\n💰 MORTGAGE COST ANALYSIS`);
console.log('==========================');

// Example scenarios
const scenarios = [
  { name: 'Entry Level', basePrice: 300000, depositPercent: 10 },
  { name: 'Family Home', basePrice: 500000, depositPercent: 20 },
  { name: 'Premium Property', basePrice: 800000, depositPercent: 20 }
];

const interestRate = 3.5; // Current Irish mortgage rate
const mortgageTerm = 30; // years

scenarios.forEach(scenario => {
  const basePrice = scenario.basePrice;
  const deposit = basePrice * (scenario.depositPercent / 100);
  const mortgageAmount = basePrice - deposit;

  // Base mortgage
  const baseMortgage = calculateAmortizationSchedule(mortgageAmount, interestRate, mortgageTerm);

  // With bidding war premium
  const premiumAmount = basePrice * (avgPremiumPercent / 100);
  const premiumPrice = basePrice + premiumAmount;
  const premiumMortgageAmount = premiumPrice - deposit;
  const premiumMortgage = calculateAmortizationSchedule(premiumMortgageAmount, interestRate, mortgageTerm);

  const extraMonthlyPayment = premiumMortgage.monthlyPayment - baseMortgage.monthlyPayment;
  const extraTotalInterest = premiumMortgage.totalInterest - baseMortgage.totalInterest;
  const extraTotalPaid = premiumMortgage.totalPaid - baseMortgage.totalPaid;

  console.log(`\n${scenario.name} (€${basePrice.toLocaleString()} base price):`);
  console.log(`  Base mortgage: €${baseMortgage.monthlyPayment.toFixed(0)}/month, Total interest: €${baseMortgage.totalInterest.toFixed(0).toLocaleString()}`);
  console.log(`  With ${avgPremiumPercent.toFixed(1)}% premium: €${premiumMortgage.monthlyPayment.toFixed(0)}/month, Total interest: €${premiumMortgage.totalInterest.toFixed(0).toLocaleString()}`);
  console.log(`  Extra monthly cost: €${extraMonthlyPayment.toFixed(0)}`);
  console.log(`  Extra total interest: €${extraTotalInterest.toFixed(0).toLocaleString()}`);
  console.log(`  Extra total paid: €${extraTotalPaid.toFixed(0).toLocaleString()}`);
  console.log(`  Premium payback period: ${(premiumAmount / extraMonthlyPayment / 12).toFixed(1)} years`);
});

console.log(`\n📈 PREMIUM PAYBACK ANALYSIS`);
console.log('============================');

// Calculate how long it takes to "pay back" the bidding war premium
const paybackScenarios = [5, 10, 15, 20, 30]; // percentage premiums

const baseScenario = {
  price: 450000,
  depositPercent: 15,
  interestRate: 3.5,
  term: 30
};

const baseMortgageAmount = baseScenario.price * (1 - baseScenario.depositPercent / 100);
const baseMortgage = calculateAmortizationSchedule(baseMortgageAmount, baseScenario.interestRate, baseScenario.term);

console.log(`Base property: €${baseScenario.price.toLocaleString()}, Mortgage: €${baseMortgage.monthlyPayment.toFixed(0)}/month`);

paybackScenarios.forEach(premiumPercent => {
  const premiumAmount = baseScenario.price * (premiumPercent / 100);
  const premiumPrice = baseScenario.price + premiumAmount;
  const premiumMortgageAmount = premiumPrice * (1 - baseScenario.depositPercent / 100);
  const premiumMortgage = calculateAmortizationSchedule(premiumMortgageAmount, baseScenario.interestRate, baseScenario.term);

  const extraMonthly = premiumMortgage.monthlyPayment - baseMortgage.monthlyPayment;
  const paybackYears = premiumAmount / (extraMonthly * 12);

  console.log(`${premiumPercent}% premium (€${premiumAmount.toFixed(0).toLocaleString()}):`);
  console.log(`  Extra monthly payment: €${extraMonthly.toFixed(0)}`);
  console.log(`  Premium payback time: ${paybackYears.toFixed(1)} years`);
  console.log(`  Total extra interest paid: €${(premiumMortgage.totalInterest - baseMortgage.totalInterest).toFixed(0).toLocaleString()}`);
});

console.log(`\n🎯 BREAK-EVEN ANALYSIS`);
console.log('======================');

// Calculate break-even points for different holding periods
const holdingPeriods = [1, 3, 5, 10, 15, 20];
const annualAppreciation = 0.03; // 3% annual appreciation

console.log(`Property: €${baseScenario.price.toLocaleString()}, Premium: €${(baseScenario.price * 0.10).toLocaleString()} (10%)`);

holdingPeriods.forEach(years => {
  const premiumAmount = baseScenario.price * 0.10;
  const futureValueWithoutPremium = baseScenario.price * Math.pow(1 + annualAppreciation, years);
  const futureValueWithPremium = (baseScenario.price + premiumAmount) * Math.pow(1 + annualAppreciation, years);

  const capitalGainWithout = futureValueWithoutPremium - baseScenario.price;
  const capitalGainWith = futureValueWithPremium - (baseScenario.price + premiumAmount);

  const netCostOfPremium = premiumAmount - (capitalGainWith - capitalGainWithout);

  console.log(`${years} years: Net cost of premium = €${netCostOfPremium.toFixed(0).toLocaleString()}`);
});

console.log(`\n💡 OPPORTUNITY COST ANALYSIS`);
console.log('=============================');

// Calculate opportunity cost of bidding war premium
const opportunityScenarios = [
  { name: 'Stock Market (7% annual)', return: 0.07 },
  { name: 'High-Yield Savings (4%)', return: 0.04 },
  { name: 'Index Funds (8%)', return: 0.08 }
];

const premiumInvested = baseScenario.price * 0.10; // 10% premium
const investmentYears = 10;

opportunityScenarios.forEach(scenario => {
  const futureValue = premiumInvested * Math.pow(1 + scenario.return, investmentYears);
  const totalReturn = futureValue - premiumInvested;

  console.log(`${scenario.name}: €${premiumInvested.toLocaleString()} premium could grow to €${futureValue.toFixed(0).toLocaleString()} in ${investmentYears} years`);
  console.log(`  Total return: €${totalReturn.toFixed(0).toLocaleString()} (${(scenario.return * 100).toFixed(1)}% annual return)`);
});

console.log(`\n📊 REGIONAL PREMIUM VARIATION`);
console.log('==============================');

// Analyze premium variation by area
const areaPremiums = {};
biddingWars.forEach(p => {
  if (!areaPremiums[p.dublinPostcode]) {
    areaPremiums[p.dublinPostcode] = { total: 0, premiums: [] };
  }
  areaPremiums[p.dublinPostcode].total++;
  areaPremiums[p.dublinPostcode].premiums.push(p.overUnderPercent);
});

const topPremiumAreas = Object.entries(areaPremiums)
  .filter(([code, data]) => data.total >= 50)
  .map(([code, data]) => ({
    code,
    avgPremium: data.premiums.reduce((sum, p) => sum + p, 0) / data.premiums.length,
    count: data.total
  }))
  .sort((a, b) => b.avgPremium - a.avgPremium)
  .slice(0, 10);

console.log('Highest premium areas:');
topPremiumAreas.forEach(area => {
  console.log(`  ${area.code}: ${area.avgPremium.toFixed(1)}% average premium (${area.count} bidding wars)`);
});

// Generate chart data for visualization
const chartData = {
  premiumPayback: paybackScenarios.map(premium => {
    const premiumAmount = baseScenario.price * (premium / 100);
    const premiumMortgageAmount = (baseScenario.price + premiumAmount) * (1 - baseScenario.depositPercent / 100);
    const premiumMortgage = calculateAmortizationSchedule(premiumMortgageAmount, baseScenario.interestRate, baseScenario.term);
    const extraMonthly = premiumMortgage.monthlyPayment - baseMortgage.monthlyPayment;
    const paybackYears = premiumAmount / (extraMonthly * 12);

    return {
      premiumPercent: premium,
      premiumAmount: premiumAmount,
      extraMonthlyPayment: extraMonthly,
      paybackYears: paybackYears,
      extraTotalInterest: premiumMortgage.totalInterest - baseMortgage.totalInterest
    };
  }),
  breakEvenAnalysis: holdingPeriods.map(years => {
    const premiumAmount = baseScenario.price * 0.10;
    const futureValueWithoutPremium = baseScenario.price * Math.pow(1 + annualAppreciation, years);
    const futureValueWithPremium = (baseScenario.price + premiumAmount) * Math.pow(1 + annualAppreciation, years);

    return {
      years: years,
      netCostOfPremium: premiumAmount - (futureValueWithPremium - futureValueWithoutPremium) + baseScenario.price
    };
  }),
  areaPremiums: topPremiumAreas.map(area => ({
    area: area.code,
    avgPremium: area.avgPremium,
    count: area.count
  })),
  opportunityCost: opportunityScenarios.map(scenario => ({
    investment: scenario.name,
    futureValue: premiumInvested * Math.pow(1 + scenario.return, investmentYears),
    totalReturn: (premiumInvested * Math.pow(1 + scenario.return, investmentYears)) - premiumInvested
  }))
};

// Save chart data for blog
const outputPath = path.join(__dirname, '../blogs/blog16_bidding_war_costs_chart_data.json');
fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
console.log(`\n📈 Chart data saved to: ${outputPath}`);

console.log('\n✅ BIDDING WAR COST ANALYSIS COMPLETE');
console.log('Key insights:');
console.log(`• Average bidding war premium: ${avgPremiumPercent.toFixed(1)}% (€${avgPremiumAmount.toFixed(0).toLocaleString()})`);
console.log(`• 10% premium payback period: ${(baseScenario.price * 0.10 / ((calculateAmortizationSchedule((baseScenario.price * 1.10) * (1 - baseScenario.depositPercent / 100), baseScenario.interestRate, baseScenario.term).monthlyPayment - baseMortgage.monthlyPayment) * 12)).toFixed(1)} years`);
console.log(`• Extra interest paid on 10% premium: €${(calculateAmortizationSchedule((baseScenario.price * 1.10) * (1 - baseScenario.depositPercent / 100), baseScenario.interestRate, baseScenario.term).totalInterest - baseMortgage.totalInterest).toFixed(0).toLocaleString()}`);
console.log(`• Opportunity cost: €${avgPremiumAmount.toFixed(0).toLocaleString()} premium could grow to €${(avgPremiumAmount * Math.pow(1 + 0.07, 10)).toFixed(0).toLocaleString()} in stock market over 10 years`);
console.log(`• Highest premium areas: ${topPremiumAreas.slice(0, 3).map(a => `${a.code} (${a.avgPremium.toFixed(1)}%)`).join(', ')}`);
