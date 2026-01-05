# Dublin Property Market Blog Creation Guidelines

## Overview
This document outlines the systematic process for creating data-driven property market blogs using Dublin property transaction data. The process ensures professional, analytical content that reveals non-obvious market insights.

## Blog Topic Selection Process

### 1. Gap Analysis Against Existing Content
Review existing blogs to identify unaddressed market angles:

**Existing Blog Topics (DO NOT REPLICATE):**
- review all current blogs in /blogs page. do not replicate 


**Selection Criteria:**
- Must reveal non-obvious insights from data analysis
- Must provide actionable recommendations
- Must use specific metrics and data points
- Must target clear buyer/seller/investor segments
- Must contain data visualizations (graphs & charts)

### 2. Data-Driven Topic Validation
Before finalizing topics, perform preliminary data analysis to ensure:
- Sufficient data volume (minimum 2,000+ properties for analysis)
- Statistically significant patterns
- Non-obvious insights that surprise readers
- Practical implications for market participants

## Data Analysis Methodology

### 1. Data Source
Primary data source: `dashboard/public/data.json`
- 43,830+ Dublin property transactions
- Includes: price, location, property type, bedrooms, square meters, yield estimates
- Valid date range: 2024-2025 transactions only (exclude future dates)

### 2. Analysis Scripts Structure
Each blog requires a dedicated analysis script in `scripts/analyze-blog{N}-data.js`:

```javascript
// Required sections in analysis script:
1. Data filtering and validation
2. Statistical analysis and calculations
3. Table generation for blog content
4. Chart data export (JSON format)
5. Key insights summary
6. Methodology documentation
```

### 3. Statistical Validation
- Minimum sample sizes: 100+ properties for reliable patterns
- Geographic coverage: Dublin postcode validation
- Metric accuracy: Verified calculations with data cross-checks
- Outlier handling: Statistical bounds checking

### 4. Statistical Validation
- propose 3 subjects for the blog for my choosing. 
- you must do the background research and Statistical Validation proir to ensure they make sense
- I must appove the blog before continuing . 

## Blog Writing Structure Template

### Required Sections (DO NOT MODIFY ORDER)

```markdown
# [CATCHY TITLE]: [COMPELLING SUBTITLE]

## Executive Summary
- 2-3 sentences maximum
- Include 2-3 key metrics
- State main insight/conclusion

## [Context Section Name]
- Market background
- Data overview
- Analysis scope

## [Data Analysis Section 1]
- Primary findings with specific numbers
- Tables with data breakdowns
- Geographic comparisons

## [Data Analysis Section 2]
- Secondary insights
- Property type analysis
- Trend explanations

## [Additional Analysis Sections as Needed]
- Follow same data-first approach

## [Strategic Implications Section]
- For Sellers
- For Buyers
- For Investors

## Conclusion
- Restate key insights
- Include external data citation
- Link to broader market context

## Methodology
- Data source explanation
- Analysis parameters
- Geographic coverage details
```

### Writing Style Guidelines

**REQUIRED APPROACH:**
- **Data-first**: Every claim backed by specific numbers
- **Professional**: Formal tone, no casual language
- **Concise**: No repetition, direct statements
- **Actionable**: Clear recommendations for readers
- **Truthful**: No generic market platitudes

**PROHIBITED:**
- Generic statements ("properties are popular", "market is competitive")
- Casual language ("amazing deals", "fantastic locations")
- Unsubstantiated claims
- Marketing hype

## Review Criteria and Scoring Rubric

### Automated Quality Scoring (Target: 80+/100)

**Data Usage (25 points):**
- Specific metrics: Numbers, percentages, prices (10 pts)
- Original insights: Unique patterns revealed (10 pts)
- Citations: External sources properly formatted (5 pts)

**Clarity (20 points):**
- Structure: Clear headings and sections (8 pts)
- Readability: Optimal sentence length (7 pts)
- No repetition: Word frequency analysis (5 pts)

**Actionability (20 points):**
- Practical recommendations: Should/consider statements (10 pts)
- Audience targeting: Buyer/seller/investor focus (10 pts)

**Uniqueness (20 points):**
- Fresh angles: New market perspectives (10 pts)
- Non-overlap: Differentiation from existing blogs (10 pts)

**Professionalism (15 points):**
- Formal tone: No casual language (5 pts)
- Formatting: Tables, proper markdown (5 pts)
- Citations: External references included (5 pts)

### Review Process
1. Run `node scripts/review-blog-quality.js` after writing
2. Review detailed scoring breakdown
3. Address recommendations if score < 80
4. Re-run review until passing threshold

## Chart and Diagram Requirements

### Chart Data Format
Each blog analysis script must export chart data in JSON format:

```javascript
const chartData = {
  [chartName]: [
    { key: value, ... },
    ...
  ],
  ...
};
```

### Required Chart Types by Blog Topic
- **Yield Curve Blog**: Line chart showing yield by price bracket (YieldCurveChart)
- **3-Bed Phenomenon**: Bar chart of over-asking by bedroom count (BedroomPerformanceChart)
- **D4 Premium**: Line chart of premium escalation by bedroom count (D4PremiumChart)

### Implementation
Charts are implemented as React components in `BlogCharts.tsx` and embedded in blog content using `<ChartName />` tags. Chart components use Recharts library for responsive visualizations.

### Visualization Guidelines
**When to Use Charts vs Tables:**
- **Use Charts For**: Trends, comparisons, relationships, patterns that benefit from visual representation
- **Use Tables For**: Precise numbers, detailed breakdowns, when exact values matter more than visual patterns
- **Chart Types**: Line charts for trends over continuous variables, bar charts for categorical comparisons, scatter plots for relationships
- **Data Density**: Charts work best with 5-15 data points; use tables for more granular data

**Chart Best Practices:**
- Include descriptive captions explaining key insights
- Use consistent color schemes (blue primary, red secondary)
- Ensure mobile responsiveness with Recharts ResponsiveContainer
- Add tooltips for detailed values on hover
- Position charts immediately after relevant data sections

## External Citation Sources and Format

### Approved Sources
- **CSO (Central Statistics Office)**: Household surveys, population data
- **Daft.ie**: Market reports, transaction data
- **BPFI (Banking & Payments Federation)**: Mortgage lending statistics
- **SCSI (Society of Chartered Surveyors)**: Property price reports
- **RTB (Residential Tenancies Board)**: Rental market data
- **Transport for Ireland**: Commuter and transport statistics

### Citation Format
```markdown
According to the Central Statistics Office, household sizes in Ireland average 2.8 people (CSO Household Survey, November 2024). [https://www.cso.ie/en/statistics/]
```

**Requirements:**
- Include publication date
- Direct link to source
- One citation per blog minimum

## File Naming and Organization

### Blog Files
```
blog{N}_{topic_slug}.md
- N: Sequential number (7, 8, 9...)
- topic_slug: kebab-case topic identifier
```

### Analysis Scripts
```
scripts/analyze-blog{N}-data.js
- Matches blog number
- Exports chart data as JSON
- Includes comprehensive analysis
```

### Chart Data Files
```
blog{N}_{topic_slug}_chart_data.json
- Generated by analysis script
- Used for blog visualizations
```

### Quality Review Output
```
blog_quality_review_results.json
- Automated scoring results
- Detailed criteria breakdown
- Recommendations for improvement
```

## Blog Publication Process

### Adding Blogs to the Website

After blog creation and quality review approval, complete these steps:

1. **Add to Blog List Page** (`dashboard/src/app/blog/page.tsx`):
   - Add new blog entry to `researchArticles` array with:
     - `id`: URL slug (kebab-case)
     - `title`: Full title
     - `excerpt`: Short description (max 150 chars)
     - `category`: Matching existing category
     - `date`: Publication date (YYYY-MM-DD)
     - `readTime`: Estimated reading time
     - `featured`: Boolean for homepage highlight
     - `tags`: Array of relevant tags
     - `author`: "Market Research Team"
     - `views`: Start at 0
   - Update article count in hero section stats

2. **Add to Blog Content** (`dashboard/src/app/blog/[slug]/page.tsx`):
   - Add new entry to `articles` object with:
     - Same metadata as list page
     - `content`: Full blog content (markdown with tables)
     - `relatedArticles`: Array of 3 related blog IDs
   - Ensure chart components are imported if needed

3. **Chart Integration**:
   - Charts specified in analysis are implemented in `BlogCharts.tsx`
   - Chart components are imported and called in blog content
   - Chart data is exported from analysis scripts

4. **URL Structure**:
   - Blogs accessible at `/blog/{id}`
   - Dynamic routing handles all blog posts
   - SEO-friendly URLs with blog titles

### Final Verification

- [ ] Blog appears in blog list with correct metadata
- [ ] Blog content loads properly at `/blog/{id}`
- [ ] Charts render correctly (if applicable)
- [ ] Related articles link properly
- [ ] Mobile responsiveness verified
- [ ] Search and filtering work correctly

## Quality Assurance Checklist

### Pre-Publication Requirements
- [x] Analysis script runs without errors
- [x] All data claims verified against source
- [x] External citation included
- [x] Tables properly formatted
- [x] No overlap with existing blog topics
- [x] Quality score 80+/100
- [x] Actionable recommendations included
- [x] Professional tone throughout

### Content Validation
- [x] Specific numbers used (no "many", "some")
- [x] Geographic areas identified by postcode
- [x] Property types specified
- [x] Price ranges clearly defined
- [x] Statistical significance verified

### Publication Checklist
- [x] Blog added to researchArticles array
- [x] Blog added to articles object
- [x] Article count updated in stats
- [x] Related articles specified
- [x] Charts integrated (if applicable)
- [x] URLs tested and working

## Future Replication Steps

1. **Topic Ideation**: Analyze `data.json` for new patterns
2. **Gap Analysis**: Compare against existing blog topics
3. **Data Analysis**: Create analysis script, extract insights
4. **Content Writing**: Follow structure template, data-first approach
5. **Quality Review**: Run automated scoring, iterate as needed
6. **Publication**: Add to blog pages following steps above

## Success Metrics

- **Quality Score**: 80+/100 on automated review (Achieved: 84/100 average)
- **Engagement**: Unique insights drive reader interest
- **Accuracy**: All claims verifiable from data
- **Actionability**: Readers can make informed decisions
- **Professionalism**: Maintains brand standards
- **Publication**: Successfully integrated into website

---

**Last Updated**: Jan 2025
**Blogs Created**: 6 (Yield Curve, 3-Bed Phenomenon, D4 Premium, January Timing, Rental Market, Square Meter Efficiency)
**Average Quality Score**: 84/100
**Publication Status**: ✅ Complete - All blogs live on website
**New Blog Topics Added**: January 2025 market timing analysis and comprehensive rental market guide
