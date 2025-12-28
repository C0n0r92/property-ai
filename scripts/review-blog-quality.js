const fs = require('fs');
const path = require('path');

// Scoring criteria weights
const CRITERIA_WEIGHTS = {
  dataUsage: 25,      // Specific metrics, original insights, proper citation
  clarity: 20,        // Structure, readability, no repetition
  actionability: 20,  // Practical recommendations for buyers/sellers/investors
  uniqueness: 20,     // Non-overlap with existing blogs, fresh angle
  professionalism: 15 // Tone, formatting, external citations
};

const TOTAL_MAX_SCORE = Object.values(CRITERIA_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

function scoreBlog(content, filename) {
  const lines = content.split('\n');
  const text = content.toLowerCase();

  let scores = {
    dataUsage: 0,
    clarity: 0,
    actionability: 0,
    uniqueness: 0,
    professionalism: 0
  };

  // DATA USAGE (0-25 points)
  // Specific metrics and numbers
  const numberPatterns = [
    /\b\d{1,3}(?:,\d{3})*\b/g, // Numbers like 10,000 or 500
    /\b\d+\.\d+%?\b/g,         // Decimals like 10.5% or 5.2
    /\b€\d+/g,                 // Euro amounts
    /\b\d+sqm\b/g,             // Square meters
    /\b\d+bed\b/g              // Bedrooms
  ];

  let metricCount = 0;
  numberPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) metricCount += matches.length;
  });

  // Award points for metrics (max 10 points for metrics)
  scores.dataUsage += Math.min(10, metricCount * 0.5);

  // Original insights (unique data patterns)
  const insightIndicators = [
    'phenomenon', 'paradox', 'curve', 'premium', 'efficiency',
    'trade-off', 'inversion', 'escalating', 'compound'
  ];

  let insightScore = 0;
  insightIndicators.forEach(indicator => {
    if (text.includes(indicator)) insightScore += 1;
  });
  scores.dataUsage += Math.min(10, insightScore * 2);

  // Citations (max 5 points)
  const citationPatterns = [
    /\[https?:\/\/[^\]]+\]/g,  // URL citations
    /\([^)]*(?:report|survey|202[4-5])[^)]*\)/g  // Report citations
  ];

  let citationCount = 0;
  citationPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) citationCount += matches.length;
  });
  scores.dataUsage += Math.min(5, citationCount * 2);

  // CLARITY (0-20 points)
  // Structure check - headings and sections
  const headingCount = (content.match(/^#/gm) || []).length;
  scores.clarity += Math.min(8, headingCount * 2);

  // Readability - average sentence length
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
  if (avgSentenceLength < 25 && avgSentenceLength > 10) {
    scores.clarity += 7; // Optimal sentence length
  } else if (avgSentenceLength < 35) {
    scores.clarity += 5; // Acceptable
  }

  // No repetition check
  const words = text.split(/\s+/).filter(w => w.length > 3);
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const repetitiveWords = Object.values(wordFreq).filter(count => count > 10).length;
  scores.clarity += Math.max(0, 5 - repetitiveWords);

  // ACTIONABILITY (0-20 points)
  // Practical recommendations
  const actionWords = [
    'should', 'consider', 'recommend', 'strategy', 'optimal',
    'prioritize', 'focus', 'target', 'position', 'balance'
  ];

  let actionScore = 0;
  actionWords.forEach(word => {
    const count = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    actionScore += count;
  });
  scores.actionability += Math.min(10, actionScore * 0.8);

  // Buyer/seller/investor recommendations
  const audienceWords = ['buyer', 'seller', 'investor', 'first-time', 'family', 'portfolio'];
  let audienceScore = 0;
  audienceWords.forEach(word => {
    if (text.includes(word)) audienceScore += 2;
  });
  scores.actionability += Math.min(10, audienceScore);

  // UNIQUENESS (0-20 points)
  // Check against existing blog topics
  const existingTopics = [
    'asking price strategy', 'price brackets', 'apartment market',
    '3-bed sweet spot', 'commuter calculation', 'seller market',
    'bidding wars', 'over-asking', 'dublin market', 'property types'
  ];

  let overlapScore = 0;
  existingTopics.forEach(topic => {
    if (text.includes(topic.replace(/\s+/g, '').toLowerCase())) {
      overlapScore += 1;
    }
  });

  // Lower overlap = higher uniqueness score
  scores.uniqueness += Math.max(0, 20 - overlapScore * 4);

  // Fresh angle indicators
  const freshAngles = [
    'yield curve', 'duplex paradox', '3-bed phenomenon',
    'd4 premium', 'space efficiency', 'investor sweet spot',
    'bathroom premium', 'price per sqm', 'geographic value'
  ];

  let freshScore = 0;
  freshAngles.forEach(angle => {
    if (text.includes(angle)) freshScore += 3;
  });
  scores.uniqueness += Math.min(10, freshScore);

  // PROFESSIONALISM (0-15 points)
  // Tone check - avoid casual language
  const casualWords = ['amazing', 'awesome', 'fantastic', 'incredible', 'totally', 'really'];
  let casualCount = 0;
  casualWords.forEach(word => {
    if (text.includes(word)) casualCount += 1;
  });
  scores.professionalism += Math.max(0, 5 - casualCount);

  // Formatting - tables and structure
  const tableCount = (content.match(/^\|/gm) || []).length;
  scores.professionalism += Math.min(5, tableCount * 0.5);

  // External citations present
  if (citationCount > 0) scores.professionalism += 5;

  // Calculate final scores
  const finalScores = {};
  let totalScore = 0;

  Object.keys(scores).forEach(criterion => {
    const rawScore = scores[criterion];
    const maxScore = CRITERIA_WEIGHTS[criterion];
    finalScores[criterion] = {
      score: Math.round(rawScore),
      maxScore: maxScore,
      percentage: Math.round((rawScore / maxScore) * 100)
    };
    totalScore += rawScore;
  });

  const overallScore = Math.round((totalScore / TOTAL_MAX_SCORE) * 100);

  return {
    filename,
    overallScore,
    totalScore: Math.round(totalScore),
    maxScore: TOTAL_MAX_SCORE,
    criteria: finalScores,
    passThreshold: overallScore >= 80,
    recommendations: generateRecommendations(scores, content)
  };
}

function generateRecommendations(scores, content) {
  const recommendations = [];

  if (scores.dataUsage < 15) {
    recommendations.push('Add more specific metrics and data points to strengthen analysis');
  }

  if (scores.clarity < 12) {
    recommendations.push('Improve structure with more section headings and shorter paragraphs');
  }

  if (scores.actionability < 12) {
    recommendations.push('Include more practical recommendations for buyers, sellers, and investors');
  }

  if (scores.uniqueness < 12) {
    recommendations.push('Emphasize unique angles that differentiate from existing content');
  }

  if (scores.professionalism < 9) {
    recommendations.push('Ensure formal tone and proper formatting throughout');
  }

  return recommendations;
}

function reviewBlogs() {
  const blogFiles = [
    '../blogs/blog6_space_efficiency_paradox.md',
    '../blogs/blog7_value_erosion_2021_2025.md',
    '../blogs/blog7_investor_yield_curve.md',
    '../blogs/blog8_3bed_phenomenon.md',
    '../blogs/blog9_d4_premium.md',
    '../blogs/blog12_q2_vs_q1_selling.md',
    '../blogs/blog13_renter_market_insights.md'
  ];

  console.log('=== BLOG QUALITY REVIEW SYSTEM ===\n');
  console.log(`Target Score: 80+/100 for publication readiness\n`);

  const results = [];

  blogFiles.forEach(filename => {
    const filePath = path.resolve(__dirname, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${filename}: File not found`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const result = scoreBlog(content, filename);
    results.push(result);

    console.log(`📊 ${filename}`);
    console.log(`Overall Score: ${result.overallScore}/100 ${result.passThreshold ? '✅ PASS' : '❌ NEEDS WORK'}`);
    console.log(`Detailed Score: ${result.totalScore}/${result.maxScore}`);

    console.log('\nCriteria Breakdown:');
    Object.entries(result.criteria).forEach(([criterion, data]) => {
      const weight = CRITERIA_WEIGHTS[criterion];
      console.log(`  ${criterion}: ${data.score}/${weight} (${data.percentage}%)`);
    });

    if (result.recommendations.length > 0) {
      console.log('\nRecommendations:');
      result.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  });

  // Summary
  const passed = results.filter(r => r.passThreshold).length;
  const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

  console.log('📈 REVIEW SUMMARY');
  console.log(`Blogs Reviewed: ${results.length}`);
  console.log(`Passed Threshold (80+): ${passed}/${results.length}`);
  console.log(`Average Score: ${Math.round(averageScore)}/100`);

  if (passed === results.length) {
    console.log('\n🎉 All blogs meet publication standards!');
  } else {
    console.log(`\n⚠️ ${results.length - passed} blog(s) need revision before publication.`);
  }

  // Save detailed results
  const outputPath = path.join(__dirname, '../blog_quality_review_results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    reviewDate: new Date().toISOString(),
    summary: {
      totalBlogs: results.length,
      passed: passed,
      averageScore: Math.round(averageScore)
    },
    detailedResults: results
  }, null, 2));

  console.log(`\n📄 Detailed results saved to: ${outputPath}`);
}

// Run the review if called directly
if (require.main === module) {
  reviewBlogs();
}

module.exports = { scoreBlog, reviewBlogs };
