// Planning Permission Tool Analysis
// This script analyzes the actual functionality of the planning permission search tool

const fs = require('fs');

// Analysis of the actual planning permission tool functionality
const toolAnalysis = {
  functionality: {
    dataSource: 'Dublin City Council ArcGIS Planning Applications Database',
    searchRadii: [50, 100, 150],
    confidenceLevels: ['High (85%+)', 'Medium (70-84%)', 'Low (50-69%)'],
    matchingCriteria: [
      'Spatial proximity to property',
      'House number matching',
      'Street name similarity',
      'Postcode verification'
    ]
  },
  userBenefits: [
    'Real-time access to planning applications',
    'Confidence scoring for relevance',
    'Integration with property search',
    'Development potential assessment'
  ],
  technicalFeatures: {
    apiEndpoint: '/api/planning',
    cacheTTL: '24 hours',
    supportedParameters: ['lat', 'lng', 'address', 'radius', 'status', 'year'],
    responseFormat: 'GeoJSON features with confidence scores'
  }
};

console.log('Planning Permission Tool Analysis');
console.log('==================================');
console.log(`Data Source: ${toolAnalysis.functionality.dataSource}`);
console.log(`Search Radii: ${toolAnalysis.functionality.searchRadii.join(', ')} meters`);
console.log(`Confidence Levels: ${toolAnalysis.functionality.confidenceLevels.join(', ')}`);

console.log('\nMatching Criteria:');
toolAnalysis.functionality.matchingCriteria.forEach(criteria => {
  console.log(`- ${criteria}`);
});

console.log('\nUser Benefits:');
toolAnalysis.userBenefits.forEach(benefit => {
  console.log(`- ${benefit}`);
});

console.log('\nTechnical Features:');
console.log(`API Endpoint: ${toolAnalysis.technicalFeatures.apiEndpoint}`);
console.log(`Cache TTL: ${toolAnalysis.technicalFeatures.cacheTTL}`);
console.log(`Parameters: ${toolAnalysis.technicalFeatures.supportedParameters.join(', ')}`);
console.log(`Response: ${toolAnalysis.technicalFeatures.responseFormat}`);

// Export tool specification data
const toolData = {
  functionalityOverview: toolAnalysis.functionality,
  userBenefits: toolAnalysis.userBenefits,
  technicalSpecs: toolAnalysis.technicalFeatures,
  usageExamples: [
    {
      scenario: 'Property Investment Due Diligence',
      steps: ['Enter property address', 'Review high-confidence applications', 'Assess development impact', 'Cross-reference with property data']
    },
    {
      scenario: 'Development Opportunity Research',
      steps: ['Search target area', 'Identify approval patterns', 'Evaluate construction timeline', 'Assess value appreciation potential']
    }
  ]
};

fs.writeFileSync('../dashboard/public/blog52_planning_permission_chart_data.json', JSON.stringify(toolData, null, 2));
console.log('\nTool specification data exported to blog52_planning_permission_chart_data.json');