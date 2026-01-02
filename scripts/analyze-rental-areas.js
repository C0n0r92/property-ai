#!/usr/bin/env node

/**
 * Dublin Rental Areas Analysis
 * Analyzes rental data to find:
 * 1. Areas with the most rentals
 * 2. Areas with the most expensive rentals
 * 3. Areas with the best value rentals
 */

const fs = require('fs');
const path = require('path');

function loadRentalData() {
  const rentalsPath = path.join(__dirname, '../dashboard/public/scraper/data/rentals.json');
  if (!fs.existsSync(rentalsPath)) {
    console.error('❌ Rental data file not found:', rentalsPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(rentalsPath, 'utf8'));
  console.log(`📊 Loaded ${data.length} rental listings`);
  return data;
}

function analyzeRentalAreas(rentals) {
  const areaStats = {};

  rentals.forEach(rental => {
    const area = rental.dublinPostcode;
    if (!area) return; // Skip rentals without postcode

    if (!areaStats[area]) {
      areaStats[area] = {
        name: area,
        totalRentals: 0,
        totalRent: 0,
        rents: [],
        beds: [],
        rentPerBed: [],
        avgRent: 0,
        avgRentPerBed: 0,
        medianRent: 0,
        minRent: Infinity,
        maxRent: 0
      };
    }

    const stats = areaStats[area];
    stats.totalRentals++;

    if (rental.monthlyRent && rental.monthlyRent > 0) {
      stats.totalRent += rental.monthlyRent;
      stats.rents.push(rental.monthlyRent);

      if (rental.monthlyRent < stats.minRent) stats.minRent = rental.monthlyRent;
      if (rental.monthlyRent > stats.maxRent) stats.maxRent = rental.monthlyRent;
    }

    if (rental.beds && rental.beds > 0) {
      stats.beds.push(rental.beds);

      if (rental.monthlyRent && rental.monthlyRent > 0) {
        const rentPerBed = rental.monthlyRent / rental.beds;
        stats.rentPerBed.push(rentPerBed);
      }
    }
  });

  // Calculate averages and medians
  Object.values(areaStats).forEach(stats => {
    if (stats.totalRentals > 0) {
      stats.avgRent = Math.round(stats.totalRent / stats.rents.length);

      // Calculate median rent
      const sortedRents = [...stats.rents].sort((a, b) => a - b);
      const mid = Math.floor(sortedRents.length / 2);
      stats.medianRent = sortedRents.length % 2 === 0
        ? Math.round((sortedRents[mid - 1] + sortedRents[mid]) / 2)
        : sortedRents[mid];

      if (stats.rentPerBed.length > 0) {
        stats.avgRentPerBed = Math.round(
          stats.rentPerBed.reduce((sum, val) => sum + val, 0) / stats.rentPerBed.length
        );
      }
    }
  });

  return areaStats;
}

function displayTopAreasByCount(areaStats, limit = 10) {
  console.log('\n🏠 AREAS WITH THE MOST RENTALS');
  console.log('═'.repeat(50));

  const sorted = Object.values(areaStats)
    .filter(area => area.totalRentals >= 5) // Minimum threshold
    .sort((a, b) => b.totalRentals - a.totalRentals)
    .slice(0, limit);

  console.log('Rank | Area | Rentals | Avg Rent | Median Rent');
  console.log('─────┼──────┼─────────┼──────────┼─────────────');

  sorted.forEach((area, index) => {
    console.log(
      `${(index + 1).toString().padStart(4)} │ ${area.name.padEnd(4)} │ ${area.totalRentals.toString().padStart(7)} │ €${area.avgRent.toString().padStart(6)} │ €${area.medianRent.toString().padStart(6)}`
    );
  });
}

function displayTopAreasByPrice(areaStats, limit = 10) {
  console.log('\n💰 AREAS WITH THE MOST EXPENSIVE RENTALS');
  console.log('═'.repeat(50));

  const sorted = Object.values(areaStats)
    .filter(area => area.totalRentals >= 3) // Minimum threshold
    .sort((a, b) => b.avgRent - a.avgRent)
    .slice(0, limit);

  console.log('Rank | Area | Avg Rent | Median | Max Rent | Rentals');
  console.log('─────┼──────┼──────────┼─────────┼──────────┼─────────');

  sorted.forEach((area, index) => {
    console.log(
      `${(index + 1).toString().padStart(4)} │ ${area.name.padEnd(4)} │ €${area.avgRent.toString().padStart(6)} │ €${area.medianRent.toString().padStart(5)} │ €${area.maxRent.toString().padStart(6)} │ ${area.totalRentals.toString().padStart(7)}`
    );
  });
}

function displayBestValueAreas(areaStats, limit = 10) {
  console.log('\n💎 AREAS WITH THE BEST VALUE RENTALS');
  console.log('═'.repeat(50));

  const sorted = Object.values(areaStats)
    .filter(area => area.avgRentPerBed > 0 && area.totalRentals >= 3) // Must have rent per bed data
    .sort((a, b) => a.avgRentPerBed - b.avgRentPerBed) // Lowest rent per bed first
    .slice(0, limit);

  console.log('Rank | Area | Rent/Bed | Avg Rent | Median | Rentals');
  console.log('─────┼──────┼──────────┼──────────┼─────────┼─────────');

  sorted.forEach((area, index) => {
    console.log(
      `${(index + 1).toString().padStart(4)} │ ${area.name.padEnd(4)} │ €${area.avgRentPerBed.toString().padStart(6)} │ €${area.avgRent.toString().padStart(6)} │ €${area.medianRent.toString().padStart(5)} │ ${area.totalRentals.toString().padStart(7)}`
    );
  });
}

function generateChartData(areaStats) {
  // Top 10 areas by rental count
  const topByCount = Object.values(areaStats)
    .filter(area => area.totalRentals >= 5)
    .sort((a, b) => b.totalRentals - a.totalRentals)
    .slice(0, 10);

  // Top 10 areas by average rent
  const topByPrice = Object.values(areaStats)
    .filter(area => area.totalRentals >= 3)
    .sort((a, b) => b.avgRent - a.avgRent)
    .slice(0, 10);

  // Top 10 best value areas
  const bestValue = Object.values(areaStats)
    .filter(area => area.avgRentPerBed > 0 && area.totalRentals >= 3)
    .sort((a, b) => a.avgRentPerBed - b.avgRentPerBed)
    .slice(0, 10);

  const chartData = {
    rentalCountByArea: topByCount.map(area => ({
      area: area.name,
      rentals: area.totalRentals,
      avgRent: area.avgRent
    })),
    expensiveRentalsByArea: topByPrice.map(area => ({
      area: area.name,
      avgRent: area.avgRent,
      medianRent: area.medianRent,
      maxRent: area.maxRent
    })),
    bestValueRentalsByArea: bestValue.map(area => ({
      area: area.name,
      rentPerBed: area.avgRentPerBed,
      avgRent: area.avgRent,
      rentals: area.totalRentals
    }))
  };

  const outputPath = path.join(__dirname, 'rental-areas-analysis-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  console.log(`\n📊 Chart data exported to: ${outputPath}`);
}

function main() {
  console.log('🏠 DUBLIN RENTAL AREAS ANALYSIS');
  console.log('═'.repeat(50));

  const rentals = loadRentalData();
  const areaStats = analyzeRentalAreas(rentals);

  const totalAreas = Object.keys(areaStats).length;
  const totalRentals = Object.values(areaStats).reduce((sum, area) => sum + area.totalRentals, 0);

  console.log(`📍 Total areas analyzed: ${totalAreas}`);
  console.log(`🏠 Total rental listings: ${totalRentals}`);

  displayTopAreasByCount(areaStats);
  displayTopAreasByPrice(areaStats);
  displayBestValueAreas(areaStats);

  generateChartData(areaStats);

  console.log('\n✅ Analysis complete!');
}

main();
