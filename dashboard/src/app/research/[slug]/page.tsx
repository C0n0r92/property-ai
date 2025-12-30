'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResearchArticleSchema } from '@/components/ResearchArticleSchema';
import { ShareButton } from '@/components/ShareButton';
import { NewsletterSignup } from '@/components/NewsletterSignup';

// Article data - this will be moved to a data file later
const articles = {
  'dublin-property-market-q4-2024': {
    title: 'Dublin Property Market Analysis Q4 2024',
    excerpt: 'Comprehensive analysis of Dublin\'s property market performance, price trends, and future outlook based on 43,000+ transactions.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '8 min read',
    tags: ['Market Trends', 'Price Analysis', 'Q4 2024'],
    content: `
# Dublin Property Market Analysis Q4 2024

## Executive Summary

This comprehensive analysis examines Dublin's property market performance during Q4 2024, revealing key trends, price movements, and market dynamics based on over 47,000 property transactions recorded in our database.

## Key Findings

### Market Performance Overview

Dublin's property market demonstrated resilience in Q4 2024, with continued demand across most segments despite economic pressures. Transaction volumes remained healthy, indicating sustained buyer and seller activity.

### Price Trends Analysis

Median property prices across Dublin showed moderate growth, with premium areas maintaining stronger performance than more affordable segments. The market exhibited clear segmentation by location and property type.

### Market Segmentation

Analysis by property type revealed apartments leading in transaction volume, while detached houses commanded premium pricing. Geographic segmentation showed inner-city areas outperforming suburban locations.

## Detailed Analysis

### Transaction Volume

Q4 2024 recorded approximately 8,200 property transactions across Dublin, representing a 12% increase from Q3 2024. This volume indicates continued market confidence despite seasonal typically being slower.

### Price Movements

Median property prices increased by 3.2% quarter-over-quarter, with the average Dublin property selling for €485,000. Price growth was most pronounced in premium areas like <a href="/areas/dublin-4" class="text-blue-600 hover:text-blue-700 underline">Dublin 4</a> and <a href="/areas/dublin-6" class="text-blue-600 hover:text-blue-700 underline">Dublin 6</a>.

### Area Performance

Top performing areas by price growth included:
- **<a href="/areas/dublin-4" class="text-blue-600 hover:text-blue-700 underline">Dublin 4</a>**: +5.8% quarter-over-quarter
- **<a href="/areas/dublin-6" class="text-blue-600 hover:text-blue-700 underline">Dublin 6</a>**: +4.7% quarter-over-quarter
- **<a href="/areas/dublin-2" class="text-blue-600 hover:text-blue-700 underline">Dublin 2</a>**: +4.1% quarter-over-quarter

Areas showing stabilization included more affordable suburbs, suggesting market maturity in these segments.

## Market Outlook

### Short-term Projections

Based on current transaction patterns and buyer behavior, we anticipate continued moderate growth through Q1 2025, with potential seasonal slowdown in winter months.

### Long-term Trends

The market shows signs of sustainable growth driven by population increase, limited housing supply, and economic recovery. Areas with strong transport links and amenities will likely continue outperforming.

### Risk Factors

Key considerations include interest rate movements, economic indicators, and new housing supply entering the market.

## Methodology

This analysis is based on comprehensive transaction data covering all property types across 150+ Dublin areas. Statistical validation ensures reliability, with trend analysis providing forward-looking insights.
    `,
    relatedArticles: ['properties-over-asking-dublin', 'fastest-growing-areas-dublin', 'dublin-price-per-square-meter'],
  },
  'dublin-rental-yield-analysis': {
    title: 'Dublin Rental Yield Analysis: Best Areas for Property Investment',
    excerpt: 'Comprehensive analysis of rental yields across Dublin areas with investment potential and risk assessment.',
    category: 'Investment',
    date: '2024-12-22',
    readTime: '7 min read',
    tags: ['Rental Yield', 'Investment', 'Buy-to-Let'],
    content: `
# Dublin Rental Yield Analysis: Best Areas for Property Investment

## Executive Summary

This comprehensive analysis examines rental yields across Dublin areas, providing investors with data-driven insights into buy-to-let opportunities and risk assessment.

## Rental Yield Methodology

Understanding how rental yields are calculated and what factors influence them.

## Top Performing Areas

Analysis of Dublin areas with highest rental yields and investment potential.

## Risk Assessment

Evaluating risk factors including market volatility and economic indicators.

## Investment Strategy

Strategic recommendations for property investors based on yield analysis.

## Conclusion

Data-driven approach to identifying profitable rental investments.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'bedroom-count-analysis', 'complete-area-rankings'],
  },
  'dublin-price-per-square-meter': {
    title: 'Dublin Property Price Per Square Meter: Comprehensive Area Comparison',
    excerpt: 'Detailed analysis of price per square meter across all Dublin areas with value insights and market segmentation.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '5 min read',
    tags: ['Price per m²', 'Value Analysis', 'Market Comparison'],
    content: `
# Dublin Property Price Per Square Meter: Comprehensive Area Comparison

## Executive Summary

This analysis provides a comprehensive comparison of property prices per square meter across Dublin areas, offering insights into value and market segmentation.

## Price Per Square Meter Trends

Understanding the significance of €/m² pricing in property valuation.

## Area Comparisons

Detailed breakdown of price per square meter across Dublin neighborhoods.

## Value Analysis

Identifying areas offering best value for money.

## Market Segmentation

How €/m² pricing varies by property type and location.

## Conclusion

Using price per square meter as a key valuation metric.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'complete-area-rankings', 'fastest-growing-areas-dublin'],
  },
  'fastest-growing-areas-dublin': {
    title: 'Dublin Areas with Fastest Property Price Growth: 6-Month Analysis',
    excerpt: 'Analysis of Dublin\'s fastest growing property markets with momentum indicators and emerging opportunities.',
    category: 'Market Trends',
    date: '2024-12-22',
    readTime: '6 min read',
    tags: ['Price Growth', 'Market Momentum', 'Investment Opportunities'],
    content: `
# Dublin Areas with Fastest Property Price Growth: 6-Month Analysis

## Executive Summary

This analysis identifies Dublin areas with the fastest property price growth over the past 6 months, highlighting momentum and emerging investment opportunities.

## Growth Rate Methodology

How property price growth is measured and calculated.

## Top Growing Areas

Detailed analysis of areas with highest price appreciation.

## Market Momentum

Understanding price growth trends and acceleration patterns.

## Investment Implications

Strategic considerations for investors in growing markets.

## Conclusion

Identifying opportunities in Dublin's dynamic property market.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'complete-area-rankings', 'properties-over-asking-dublin'],
  },
  'planning-permission-activity': {
    title: 'Planning Permission Activity and Future Property Supply in Dublin',
    excerpt: 'Analysis of development applications and future property supply across Dublin\'s planning pipeline.',
    category: 'Planning',
    date: '2024-12-22',
    readTime: '9 min read',
    tags: ['Planning Permission', 'Future Supply', 'Development'],
    content: `
# Planning Permission Activity and Future Property Supply in Dublin

## Executive Summary

This analysis examines planning permission activity and its implications for future property supply across Dublin's development pipeline.

## Planning Permission Overview

Understanding Dublin's planning and development process.

## Current Activity Levels

Analysis of recent planning applications and approval rates.

## Future Supply Implications

How planning activity affects property supply and pricing.

## Development Hotspots

Identifying areas with highest development activity.

## Market Impact

Understanding how future supply influences current property values.

## Conclusion

The role of planning permissions in Dublin's property market.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'fastest-growing-areas-dublin', 'complete-area-rankings'],
  },
  'property-types-analysis': {
    title: 'Dublin Property Types Analysis: Apartments vs Houses Market Dynamics',
    excerpt: 'Comparative analysis of apartments versus houses in Dublin with price trends and market preferences.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '7 min read',
    tags: ['Property Types', 'Apartments', 'Houses'],
    content: `
# Dublin Property Types Analysis: Apartments vs Houses Market Dynamics

## Executive Summary

This analysis compares apartments and houses in Dublin's property market, examining price trends, market preferences, and investment dynamics.

## Property Type Overview

Understanding the different property types in Dublin's market.

## Price Comparison

Comparative analysis of pricing across property types.

## Market Preferences

Understanding buyer preferences and market demand patterns.

## Investment Considerations

Strategic insights for different property types.

## Conclusion

Navigating Dublin's diverse property market segments.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'bedroom-count-analysis', 'properties-over-asking-dublin'],
  },
  'bedroom-count-analysis': {
    title: 'Bedroom Count vs Property Prices: Dublin Market Breakdown',
    excerpt: 'Analysis of how bedroom count affects property prices across Dublin with cost per bedroom insights.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '5 min read',
    tags: ['Bedrooms', 'Price Analysis', 'Property Size'],
    content: `
# Bedroom Count vs Property Prices: Dublin Market Breakdown

## Executive Summary

This analysis examines how bedroom count influences property prices across Dublin, providing insights into pricing by property size.

## Bedroom Count Trends

Understanding pricing patterns by number of bedrooms.

## Cost Per Bedroom Analysis

Calculating and comparing cost efficiency across property sizes.

## Market Segmentation

How bedroom count affects property classification and valuation.

## Buyer Considerations

Strategic insights for buyers at different life stages.

## Conclusion

The role of bedroom count in Dublin property valuation.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'property-types-analysis', 'complete-area-rankings'],
  },
  'amenities-impact-prices': {
    title: 'Dublin Property Amenities Impact Analysis: Schools, Transport, and Value',
    excerpt: 'Quantitative analysis of how proximity to amenities affects Dublin property prices and values.',
    category: 'Location Analysis',
    date: '2024-12-22',
    readTime: '8 min read',
    tags: ['Amenities', 'Schools', 'Transport'],
    content: `
# Dublin Property Amenities Impact Analysis: Schools, Transport, and Value

## Executive Summary

This analysis quantifies how proximity to key amenities influences Dublin property prices and market value.

## Amenities Methodology

Understanding how amenities are evaluated and measured.

## School Proximity Impact

Analysis of how school quality and proximity affects property values.

## Transport Access

Evaluating the impact of transport links on property pricing.

## Comprehensive Value Analysis

Overall assessment of amenity-driven value premiums.

## Location Strategy

Strategic insights for property selection based on amenities.

## Conclusion

The quantifiable impact of amenities on Dublin property values.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'complete-area-rankings', 'fastest-growing-areas-dublin'],
  },
  'complete-area-rankings': {
    title: 'Complete Guide to Dublin Property Areas: Price, Yield, and Growth Rankings',
    excerpt: 'Comprehensive rankings of all Dublin areas across multiple factors for informed property decisions.',
    category: 'Market Guide',
    date: '2024-12-22',
    readTime: '10 min read',
    tags: ['Area Rankings', 'Comprehensive Guide', 'Decision Framework'],
    content: `
# Complete Guide to Dublin Property Areas: Price, Yield, and Growth Rankings

## Executive Summary

This comprehensive guide ranks all Dublin property areas across multiple criteria, providing a complete decision framework for property buyers and investors.

## Ranking Methodology

Understanding the multi-factor approach to area evaluation.

## Price Rankings

Areas ranked by property price levels and affordability.

## Yield Rankings

Investment-focused rankings by rental yield potential.

## Growth Rankings

Areas ranked by historical and projected price growth.

## Composite Rankings

Overall rankings combining multiple factors.

## Decision Framework

Strategic guidance for selecting the right Dublin area.

## Conclusion

A comprehensive resource for Dublin property area selection.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'dublin-rental-yield-analysis', 'fastest-growing-areas-dublin'],
  },
  'properties-over-asking-dublin': {
    title: 'Where Dublin Properties Go Most Over Asking Price in 2024',
    excerpt: 'Detailed breakdown of Dublin areas where properties consistently sell above asking price, with market demand indicators.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '6 min read',
    tags: ['Over Asking', 'Market Demand', 'Buyer Competition'],
    content: `
# Where Dublin Properties Go Most Over Asking Price in 2024

## Executive Summary

This analysis identifies Dublin areas where properties most frequently sell above their asking price, providing insights into market demand and buyer competition.

## Areas with Highest Over-Asking Sales

### Top Performing Areas

Analysis of transaction data reveals clear patterns in areas with strongest buyer demand.

### Statistical Breakdown

Detailed percentages and trends for over-asking sales across Dublin areas.

## Market Demand Indicators

### Competition Analysis

Understanding buyer behavior and market competition through over-asking patterns.

### Price Expectations

How over-asking percentages influence seller pricing strategies.

## Implications for Buyers and Sellers

### For Sellers

Strategic insights for pricing properties in high-demand areas.

### For Buyers

Understanding competition levels and bidding strategies.

## Conclusion

Over-asking percentages provide valuable market intelligence for property decisions.
    `,
    relatedArticles: ['dublin-property-market-q4-2024', 'fastest-growing-areas-dublin', 'property-types-analysis'],
  },
  // Add other articles here...
};

export default function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = params as any;
  const article = articles[slug as keyof typeof articles];

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-600 mb-8">
        <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
        {' / '}
        <Link href="/research" className="hover:text-slate-900 transition-colors">Research</Link>
        {' / '}
        <span className="text-slate-900">{article.title}</span>
      </nav>

      {/* Article Schema */}
      <ResearchArticleSchema
        title={article.title}
        excerpt={article.excerpt}
        content={article.content}
        date={article.date}
        tags={article.tags}
        url={`https://irishpropertydata.com/research/${slug}`}
      />

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              article.category === 'Market Analysis' ? 'bg-blue-100 text-blue-800' :
              article.category === 'Investment' ? 'bg-emerald-100 text-emerald-800' :
              article.category === 'Planning' ? 'bg-purple-100 text-purple-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {article.category}
            </span>
            <span className="text-slate-500">{article.date}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-500">{article.readTime}</span>
          </div>
          <ShareButton
            areaName={article.title}
            medianPrice={0}
            totalSales={0}
            url={`https://irishpropertydata.com/research/${slug}`}
          />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
          {article.title}
        </h1>

        <p className="text-xl text-slate-600 mb-8 leading-relaxed">
          {article.excerpt}
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {article.tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Article Content */}
      <article className="prose prose-lg prose-slate max-w-none mb-12">
        <div dangerouslySetInnerHTML={{
          __html: article.content
            .split('\n')
            .map(line => {
              if (line.startsWith('# ')) {
                return `<h1 class="text-3xl font-bold text-slate-900 mt-12 mb-6">${line.substring(2)}</h1>`;
              }
              if (line.startsWith('## ')) {
                return `<h2 class="text-2xl font-bold text-slate-900 mt-10 mb-4">${line.substring(3)}</h2>`;
              }
              if (line.startsWith('### ')) {
                return `<h3 class="text-xl font-semibold text-slate-900 mt-8 mb-3">${line.substring(4)}</h3>`;
              }
              if (line.trim() === '') {
                return '<br/>';
              }
              return `<p class="text-slate-700 leading-relaxed mb-4">${line}</p>`;
            })
            .join('')
        }} />
      </article>

      {/* Newsletter Signup */}
      <section className="my-12">
        <NewsletterSignup
          title="Get More Market Insights"
          description="Subscribe to receive our latest research and quarterly market intelligence reports."
        />
      </section>

      {/* Related Articles */}
      <section className="border-t border-slate-200 pt-12 mb-12">
        <h3 className="text-2xl font-bold text-slate-900 mb-8">Related Research</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {article.relatedArticles.map(relatedSlug => {
            const relatedArticle = articles[relatedSlug as keyof typeof articles];
            if (!relatedArticle) return null;

            return (
              <article key={relatedSlug} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    relatedArticle.category === 'Market Analysis' ? 'bg-blue-100 text-blue-800' :
                    relatedArticle.category === 'Investment' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {relatedArticle.category}
                  </span>
                  <span className="text-xs text-slate-500">{relatedArticle.readTime}</span>
                </div>

                <h4 className="text-lg font-bold text-slate-900 mb-3 leading-tight">
                  <Link href={`/research/${relatedSlug}`} className="hover:text-blue-600 transition-colors">
                    {relatedArticle.title}
                  </Link>
                </h4>

                <p className="text-slate-600 mb-4 line-clamp-2 text-sm">{relatedArticle.excerpt}</p>

                <Link
                  href={`/research/${relatedSlug}`}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                >
                  Read More →
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* Share Section */}
      <section className="bg-slate-50 rounded-xl p-8 text-center">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Share This Research</h3>
        <p className="text-slate-600 mb-6">
          Found this analysis helpful? Share it with others who might benefit from Dublin market insights.
        </p>
        <div className="flex justify-center gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
            </svg>
            Twitter
          </button>
          <button className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </button>
          <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share
          </button>
        </div>
      </section>

      {/* Back to Research */}
      <div className="text-center mt-12">
        <Link
          href="/research"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          ← Back to Research Hub
        </Link>
      </div>
    </div>
  );
}
