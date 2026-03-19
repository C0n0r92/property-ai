import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/ShareButton';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { ReadingProgress } from '@/components/ReadingProgress';
import { TableOfContents } from '@/components/TableOfContents';
import { BlogVoteButton } from '@/components/BlogVoteButton';
import { BlogShareButton } from '@/components/BlogShareButton';
import { BlogViewTracker } from '@/components/BlogViewTracker';
import { MapLink } from '@/components/MapLink';
import { getCategoryConfig } from '@/lib/blog-categories';
import { AISignupCTA } from '@/components/AISignupCTA';
import { OverAskingChart, DistanceChart, ThreeBedChart, ChristmasPriceChart, YieldCurveChart, BedroomPerformanceChart, D4PremiumChart, JanuaryVolumeChart, RentalPricingChart, TopRentalAreasChart, Q2VsQ1Chart, MonthlyTrendChart, RentalYieldChart, YieldDistributionChartNew, SizeEfficiencyChartNew, PostcodeEfficiencyChart, YearOverYearPricesChart, PropertyTypeComparisonChart, PremiumDistributionChartNew, PremiumPaybackChart, OpportunityCostChart, BreakEvenChart, AreaPremiumChart, PriceIncreaseChart, BiddingWarsChart, PriceChangeComparisonChart, YearOverYearChart, PropertyTypeChart, PriceDistributionChart, PriceTrendChart, YearOverYearChartD7, PropertyTypeChartD7, PriceDistributionChartD7, PriceTrendChartD7, YearOverYearChartD2, PropertyTypeChartD2, PriceDistributionChartD2, PriceTrendChartD2, SeasonalPerformanceChart, MonthlyTimingChart, TimingValueTradeoffChart, BestTypeByAreaChart, MortgageImpactChart, OverpaymentSavingsChartNew, MonthlyPaymentBreakdownChart, PropertyTypeSavingsChart, BiddingWarImpactChart, YieldByPostcodeChart, YieldByPriceBracketChart, BestValueAreasChart, YieldDistributionChartNew2, BedroomEfficiencyChart, PropertyTypeEfficiencyChart, SizeBracketEfficiencyChart, EfficiencyParadoxChart, OverAskingByPriceBracketChart, OverAskingByPropertyTypeChart, OverAskingByPostcodeChart, PremiumDistributionChartNew2, OptimalStrategyChart, D3PropertyTypesChart, D3MonthlyTrendsChart, SizeBandMortgageChart, OverpaymentSavingsChartNew as OverpaymentSavingsChartNew2, SizeBandOverAskingChart, BreakEvenAnalysisChart, YieldBySizeBandChart, GeographicPriceVariationsChart, PriceEfficiencyChart, OverAskingSuccessChart, PropertySizeVariationsChart, PricePredictabilityChart, RentalYieldMapChart, BuyerTypeScoresChart, CyclicalPerformanceChart, SeasonalIndexChart, PeakPerformanceChart, MarketTimingChart, PriceVolatilityChart, AutumnForecastChart, SizeEfficiencyChartNew2, OverAskingParadoxChart, ValueEfficiencyChart, QuarterlyTimingChart, PropertyTypeDistributionChart, BuyerProfileOptimizationChart, SalesVolumeChart, PriceStabilityChart, OverAskingStabilityChart, AnnualAppreciationChart, ConservativeStrategyChart, BuyerAdvantageChart, RentalVolumeChart, PremiumRentalsChart, ValueRentalsChart, YieldEfficiencyChart, D5YearlyTrendsChart, D5PropertyTypeChart, D5PriceDistributionChart, CovidRecoveryChart, CovidPropertyTypeChart, CovidGrowthRatesChart, StreetTypeGrowthChart, PriceProgressionChart, StreetTypeInvestmentEfficiencyChart, PropertySizeInvestmentEfficiencyChart, CornerDiscountOverviewChart, CornerDiscountByTypeChart, CornerDiscountBySizeChart, CornerDiscountByAreaChart, SmallerAreaHotspotsChart, SmallerAreaPriceBracketChart, SmallerAreaPropertyTypeChart } from '@/components/BlogCharts';
import { getAllSlugs, readArticle, readArticleMeta } from '@/lib/blog';

// MapLink component will be imported from a separate client component file

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = readArticleMeta(slug);

  if (!article) {
    notFound();
  }


  const baseUrl = 'https://irishpropertydata.com';
  const canonicalUrl = `${baseUrl}/blog/${slug}`;

  return {
    title: `${article.title} | Irish Property Data`,
    description: article.excerpt,
    keywords: [...article.tags, 'Dublin property', 'Irish property market'],
    authors: [{ name: article.author }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: canonicalUrl,
      siteName: 'Irish Property Data',
      type: 'article',
      publishedTime: article.date,
      tags: article.tags,
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: ['/opengraph-image'],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

// Function to process markdown content to HTML
function processMarkdownToHtml(content: string): string {
  const lines = content.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip chart component lines - they'll be handled separately
    if (trimmedLine === '<OverAskingChart />' || trimmedLine === '<ThreeBedChart />' || trimmedLine === '<DistanceChart />' || trimmedLine === '<ChristmasPriceChart />' || trimmedLine === '<YieldCurveChart />' || trimmedLine === '<BedroomPerformanceChart />' || trimmedLine === '<D4PremiumChart />' || trimmedLine === '<JanuaryVolumeChart />' || trimmedLine === '<RentalPricingChart />' || trimmedLine === '<TopRentalAreasChart />' || trimmedLine === '<Q2VsQ1Chart />' || trimmedLine === '<MonthlyTrendChart />' || trimmedLine === '<RentalYieldChart />' || trimmedLine === '<YieldDistributionChartNew />' || trimmedLine === '<SizeEfficiencyChartNew />' || trimmedLine === '<PostcodeEfficiencyChart />' || trimmedLine === '<YearOverYearPricesChart />' || trimmedLine === '<PropertyTypeComparisonChart />' || trimmedLine === '<PriceIncreaseChart />' || trimmedLine === '<BiddingWarsChart />' || trimmedLine === '<PriceChangeComparisonChart />' || trimmedLine === '<YearOverYearChart />' || trimmedLine === '<PropertyTypeChart />' || trimmedLine === '<PriceDistributionChart />' || trimmedLine === '<PriceTrendChart />' || trimmedLine === '<YearOverYearChartD7 />' || trimmedLine === '<PropertyTypeChartD7 />' || trimmedLine === '<PriceDistributionChartD7 />' || trimmedLine === '<PriceTrendChartD7 />' || trimmedLine === '<YearOverYearChartD2 />' || trimmedLine === '<PropertyTypeChartD2 />' || trimmedLine === '<PriceDistributionChartD2 />' || trimmedLine === '<PriceTrendChartD2 />' || trimmedLine === '<SeasonalPerformanceChart />' || trimmedLine === '<MonthlyTimingChart />' || trimmedLine === '<TimingValueTradeoffChart />' || trimmedLine === '<BestTypeByAreaChart />' || trimmedLine === '<MortgageImpactChart />' || trimmedLine === '<OverpaymentSavingsChartNew />' || trimmedLine === '<MonthlyPaymentBreakdownChart />' || trimmedLine === '<PropertyTypeSavingsChart />' || trimmedLine === '<BiddingWarImpactChart />' || trimmedLine === '<YieldByPostcodeChart />' || trimmedLine === '<YieldByPriceBracketChart />' || trimmedLine === '<BestValueAreasChart />' || trimmedLine === '<YieldDistributionChartNew2 />' || trimmedLine === '<BedroomEfficiencyChart />' || trimmedLine === '<PropertyTypeEfficiencyChart />' || trimmedLine === '<SizeBracketEfficiencyChart />' || trimmedLine === '<EfficiencyParadoxChart />' || trimmedLine === '<OverAskingByPriceBracketChart />' || trimmedLine === '<OverAskingByPropertyTypeChart />' || trimmedLine === '<OverAskingByPostcodeChart />' || trimmedLine === '<PremiumDistributionChartNew2 />' || trimmedLine === '<OptimalStrategyChart />' || trimmedLine === '<D3PropertyTypesChart />' || trimmedLine === '<D3MonthlyTrendsChart />' || trimmedLine === '<SizeBandMortgageChart />' || trimmedLine === '<OverpaymentSavingsChartNew2 />' || trimmedLine === '<SizeBandOverAskingChart />' || trimmedLine === '<BreakEvenAnalysisChart />' || trimmedLine === '<YieldBySizeBandChart />' || trimmedLine === '<GeographicPriceVariationsChart />' || trimmedLine === '<PriceEfficiencyChart />' || trimmedLine === '<OverAskingSuccessChart />' || trimmedLine === '<PropertySizeVariationsChart />' || trimmedLine === '<PricePredictabilityChart />' || trimmedLine === '<RentalYieldMapChart />' || trimmedLine === '<BuyerTypeScoresChart />' || trimmedLine === '<CyclicalPerformanceChart />' || trimmedLine === '<SeasonalIndexChart />' || trimmedLine === '<PeakPerformanceChart />' || trimmedLine === '<MarketTimingChart />' || trimmedLine === '<PriceVolatilityChart />' || trimmedLine === '<AutumnForecastChart />' || trimmedLine === '<SizeEfficiencyChartNew2 />' || trimmedLine === '<OverAskingParadoxChart />' || trimmedLine === '<ValueEfficiencyChart />' || trimmedLine === '<QuarterlyTimingChart />' || trimmedLine === '<StreetTypeInvestmentEfficiencyChart />' || trimmedLine === '<PropertyTypeDistributionChart />' || trimmedLine === '<BuyerProfileOptimizationChart />' || trimmedLine === '<CornerDiscountOverviewChart />' || trimmedLine === '<CornerDiscountByTypeChart />' || trimmedLine === '<CornerDiscountBySizeChart />' || trimmedLine === '<CornerDiscountByAreaChart />') {
      continue;
    }

    // Handle bold formatting
    let processedLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Handle markdown images ![alt text](url)
    processedLine = processedLine.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-6" />');

    // Handle markdown links [text](url)
    processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Check for table rows (lines containing | separators)
    const isTableRow = trimmedLine.includes('|') && trimmedLine.split('|').length > 2;

    if (isTableRow && !inList) {
      // Parse table row
      const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      const isSeparatorRow = cells.every(cell => /^-+$/.test(cell));

      if (!inTable) {
        // Start new table
        inTable = true;
        tableRows = [];
      }

      if (!isSeparatorRow) {
        tableRows.push(cells);
      }
    } else {
      // End table if we were in one
      if (inTable) {
        // Convert table to HTML
        if (tableRows.length > 0) {
          processedLines.push('<div class="my-6 overflow-x-auto">');
          processedLines.push('<table class="w-full bg-slate-800 border border-slate-700 rounded-lg shadow-sm text-sm">');

          tableRows.forEach((row, rowIndex) => {
            if (rowIndex === 0) {
              // Header row
              processedLines.push('<thead class="bg-slate-700">');
              processedLines.push('<tr>');
              row.forEach(cell => {
                let processedCell = cell.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                processedCell = processedCell.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-2" />');
                processedCell = processedCell.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');
                processedLines.push(`<th class="px-4 py-3 text-left font-semibold text-white border-b border-slate-600 first:rounded-tl-lg last:rounded-tr-lg">${processedCell}</th>`);
              });
              processedLines.push('</tr>');
              processedLines.push('</thead>');
              processedLines.push('<tbody>');
            } else {
              // Data rows
              processedLines.push('<tr class="hover:bg-slate-700/50 transition-colors">');
              row.forEach(cell => {
                let processedCell = cell.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                processedCell = processedCell.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-2" />');
                processedCell = processedCell.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');
                processedLines.push(`<td class="px-4 py-3 text-slate-300 border-b border-slate-600">${processedCell}</td>`);
              });
              processedLines.push('</tr>');
            }
          });

          processedLines.push('</tbody>');
          processedLines.push('</table>');
          processedLines.push('</div>');
        }

        inTable = false;
        tableRows = [];
      }

      // Check for list items
      const isBulletList = trimmedLine.startsWith('- ');
      const isNumberedList = /^\d+\.\s/.test(trimmedLine);

      if (isBulletList || isNumberedList) {
        // Start or continue a list
        if (!inList) {
          listType = isBulletList ? 'ul' : 'ol';
          processedLines.push(`<${listType} class="list-disc list-inside text-slate-300 leading-relaxed mb-4 text-lg space-y-2">`);
          inList = true;
        }

        // Extract list item content
        const listContent = isBulletList
          ? processedLine.substring(processedLine.indexOf('- ') + 2)
          : processedLine.substring(processedLine.indexOf('. ') + 2);

        processedLines.push(`<li class="ml-4">${listContent}</li>`);
      } else {
        // End list if we were in one
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = null;
        }

        // Handle headings
        if (processedLine.startsWith('# ')) {
          const text = processedLine.substring(2);
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          processedLines.push(`<h1 id="${id}" class="text-3xl font-bold text-white mt-12 mb-6 scroll-mt-24">${text}</h1>`);
        } else if (processedLine.startsWith('## ')) {
          const text = processedLine.substring(3);
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          processedLines.push(`<h2 id="${id}" class="text-2xl font-semibold text-white mt-10 mb-4 scroll-mt-24">${text}</h2>`);
        } else if (processedLine.startsWith('### ')) {
          const text = processedLine.substring(4);
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          processedLines.push(`<h3 id="${id}" class="text-xl font-semibold text-white mt-8 mb-3 scroll-mt-24">${text}</h3>`);
        } else if (trimmedLine === '') {
          processedLines.push('<br/>');
        } else {
          processedLines.push(`<p class="text-slate-300 leading-relaxed mb-4 text-lg">${processedLine}</p>`);
        }
      }
    }
  }

  // Close any open list
  if (inList && listType) {
    processedLines.push(`</${listType}>`);
  }

  // Close any open table
  if (inTable && tableRows.length > 0) {
    processedLines.push('<div class="my-6 overflow-x-auto">');
    processedLines.push('<table class="w-full bg-slate-800 border border-slate-700 rounded-lg shadow-sm text-sm">');

    tableRows.forEach((row, rowIndex) => {
      if (rowIndex === 0) {
        // Header row
        processedLines.push('<thead class="bg-slate-700">');
        processedLines.push('<tr>');
        row.forEach(cell => {
          const processedCell = cell.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          processedLines.push(`<th class="px-4 py-3 text-left font-semibold text-white border-b border-slate-600 first:rounded-tl-lg last:rounded-tr-lg">${processedCell}</th>`);
        });
        processedLines.push('</tr>');
        processedLines.push('</thead>');
        processedLines.push('<tbody>');
      } else {
        // Data rows
        processedLines.push('<tr class="hover:bg-slate-700/50 transition-colors">');
        row.forEach(cell => {
          const processedCell = cell.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          processedLines.push(`<td class="px-4 py-3 text-slate-300 border-b border-slate-600">${processedCell}</td>`);
        });
        processedLines.push('</tr>');
      }
    });

    processedLines.push('</tbody>');
    processedLines.push('</table>');
    processedLines.push('</div>');
  }

  return processedLines.join('');
}

// Function to split content and identify chart positions
interface ContentSegment {
  type: 'html' | 'chart';
  content?: string;
  chartComponent?: 'OverAskingChart' | 'ThreeBedChart' | 'DistanceChart' | 'ChristmasPriceChart' | 'YieldCurveChart' | 'BedroomPerformanceChart' | 'D4PremiumChart' | 'JanuaryVolumeChart' | 'RentalPricingChart' | 'TopRentalAreasChart' | 'Q2VsQ1Chart' | 'MonthlyTrendChart' | 'RentalYieldChart' | 'YieldDistributionChart' | 'SizeEfficiencyChart' | 'PostcodeEfficiencyChart' | 'YearOverYearPricesChart' | 'PropertyTypeComparisonChart' | 'PremiumDistributionChart' | 'PremiumPaybackChart' | 'BreakEvenChart' | 'OpportunityCostChart' | 'AreaPremiumChart' | 'PriceIncreaseChart' | 'BiddingWarsChart' | 'PriceChangeComparisonChart' | 'YearOverYearChart' | 'PropertyTypeChart' | 'PriceDistributionChart' | 'PriceTrendChart' | 'YearOverYearChartD7' | 'PropertyTypeChartD7' | 'PriceDistributionChartD7' | 'PriceTrendChartD7' | 'YearOverYearChartD2' | 'PropertyTypeChartD2' | 'PriceDistributionChartD2' | 'PriceTrendChartD2' | 'PropertyTypeSavingsChart' | 'BiddingWarImpactChart' | 'YieldByPostcodeChart' | 'YieldByPriceBracketChart' | 'BestValueAreasChart' | 'YieldDistributionChartNew' | 'BedroomEfficiencyChart' | 'PropertyTypeEfficiencyChart' | 'SizeBracketEfficiencyChart' | 'EfficiencyParadoxChart' | 'OverAskingByPriceBracketChart' | 'OverAskingByPropertyTypeChart' | 'OverAskingByPostcodeChart' | 'PremiumDistributionChartNew' | 'OptimalStrategyChart' | 'D3PropertyTypesChart' | 'D3MonthlyTrendsChart' | 'SizeBandMortgageChart' | 'OverpaymentSavingsChartNew2' | 'SizeBandOverAskingChart' | 'BreakEvenAnalysisChart' | 'YieldBySizeBandChart' | 'GeographicPriceVariationsChart' | 'PriceEfficiencyChart' | 'OverAskingSuccessChart' | 'PropertySizeVariationsChart' | 'PricePredictabilityChart' | 'RentalYieldMapChart' | 'BuyerTypeScoresChart' | 'CyclicalPerformanceChart' | 'SeasonalIndexChart' | 'PeakPerformanceChart' | 'MarketTimingChart' | 'PriceVolatilityChart' | 'AutumnForecastChart' | 'SizeEfficiencyChartNew2' | 'OverAskingParadoxChart' | 'ValueEfficiencyChart' | 'QuarterlyTimingChart' | 'StreetTypeInvestmentEfficiencyChart' | 'PropertyTypeDistributionChart' | 'BuyerProfileOptimizationChart' | 'SalesVolumeChart' | 'PriceStabilityChart' | 'OverAskingStabilityChart' | 'AnnualAppreciationChart' | 'ConservativeStrategyChart' | 'BuyerAdvantageChart' | 'RentalVolumeChart' | 'PremiumRentalsChart' | 'ValueRentalsChart' | 'YieldEfficiencyChart' | 'D5YearlyTrendsChart' | 'D5PropertyTypeChart' | 'D5PriceDistributionChart' | 'CovidRecoveryChart' | 'CovidPropertyTypeChart' | 'CovidGrowthRatesChart' | 'CornerDiscountOverviewChart' | 'CornerDiscountByTypeChart' | 'CornerDiscountBySizeChart' | 'CornerDiscountByAreaChart';
}

function splitContentWithCharts(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const lines = content.split('\n');
  
  let currentHtml: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line is a chart component
    if (trimmedLine === '<OverAskingChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'OverAskingChart'
      });
    } else if (trimmedLine === '<ThreeBedChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'ThreeBedChart'
      });
    } else if (trimmedLine === '<DistanceChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'DistanceChart'
      });
    } else if (trimmedLine === '<ChristmasPriceChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'ChristmasPriceChart'
      });
    } else if (trimmedLine === '<YieldCurveChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YieldCurveChart'
      });
    } else if (trimmedLine === '<BedroomPerformanceChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'BedroomPerformanceChart'
      });
    } else if (trimmedLine === '<D4PremiumChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'D4PremiumChart'
      });
    } else if (trimmedLine === '<JanuaryVolumeChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'JanuaryVolumeChart'
      });
    } else if (trimmedLine === '<RentalPricingChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'RentalPricingChart'
      });
    } else if (trimmedLine === '<TopRentalAreasChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'TopRentalAreasChart'
      });
    } else if (trimmedLine === '<Q2VsQ1Chart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'Q2VsQ1Chart'
      });
    } else if (trimmedLine === '<MonthlyTrendChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'MonthlyTrendChart'
      });
    } else if (trimmedLine === '<RentalYieldChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'RentalYieldChart'
      });
    } else if (trimmedLine === '<YieldDistributionChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YieldDistributionChart'
      });
    } else if (trimmedLine === '<SizeEfficiencyChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'SizeEfficiencyChart'
      });
    } else if (trimmedLine === '<PostcodeEfficiencyChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PostcodeEfficiencyChart'
      });
    } else if (trimmedLine === '<YearOverYearPricesChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YearOverYearPricesChart'
      });
    } else if (trimmedLine === '<PropertyTypeComparisonChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PropertyTypeComparisonChart'
      });
    } else if (trimmedLine === '<PremiumDistributionChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PremiumDistributionChart'
      });
    } else if (trimmedLine === '<PremiumPaybackChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PremiumPaybackChart'
      });
    } else if (trimmedLine === '<BreakEvenChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'BreakEvenChart'
      });
    } else if (trimmedLine === '<OpportunityCostChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'OpportunityCostChart'
      });
    } else if (trimmedLine === '<AreaPremiumChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'AreaPremiumChart'
      });
    } else if (trimmedLine === '<PriceIncreaseChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceIncreaseChart'
      });
    } else if (trimmedLine === '<BiddingWarsChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'BiddingWarsChart'
      });
    } else if (trimmedLine === '<PriceChangeComparisonChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceChangeComparisonChart'
      });
    } else if (trimmedLine === '<YearOverYearChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YearOverYearChart'
      });
    } else if (trimmedLine === '<PropertyTypeChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PropertyTypeChart'
      });
    } else if (trimmedLine === '<PriceDistributionChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceDistributionChart'
      });
    } else if (trimmedLine === '<PriceTrendChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceTrendChart'
      });
    } else if (trimmedLine === '<YearOverYearChartD7 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YearOverYearChartD7'
      });
    } else if (trimmedLine === '<PropertyTypeChartD7 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PropertyTypeChartD7'
      });
    } else if (trimmedLine === '<PriceDistributionChartD7 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceDistributionChartD7'
      });
    } else if (trimmedLine === '<PriceTrendChartD7 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceTrendChartD7'
      });
    } else if (trimmedLine === '<YearOverYearChartD2 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YearOverYearChartD2'
      });
    } else if (trimmedLine === '<PropertyTypeChartD2 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PropertyTypeChartD2'
      });
    } else if (trimmedLine === '<PriceDistributionChartD2 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceDistributionChartD2'
      });
    } else if (trimmedLine === '<PriceTrendChartD2 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceTrendChartD2'
      });
    } else if (trimmedLine === '<D3PropertyTypesChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'D3PropertyTypesChart'
      });
    } else if (trimmedLine === '<D3MonthlyTrendsChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'D3MonthlyTrendsChart'
      });
    } else if (trimmedLine === '<SizeBandMortgageChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'SizeBandMortgageChart'
      });
    } else if (trimmedLine === '<OverpaymentSavingsChartNew2 />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'OverpaymentSavingsChartNew2'
      });
    } else if (trimmedLine === '<SizeBandOverAskingChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'SizeBandOverAskingChart'
      });
    } else if (trimmedLine === '<BreakEvenAnalysisChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'BreakEvenAnalysisChart'
      });
    } else if (trimmedLine === '<YieldBySizeBandChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'YieldBySizeBandChart'
      });
    } else if (trimmedLine === '<GeographicPriceVariationsChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'GeographicPriceVariationsChart'
      });
    } else if (trimmedLine === '<PriceEfficiencyChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PriceEfficiencyChart'
      });
    } else if (trimmedLine === '<OverAskingSuccessChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'OverAskingSuccessChart'
      });
    } else if (trimmedLine === '<PropertySizeVariationsChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PropertySizeVariationsChart'
      });
    } else if (trimmedLine === '<PricePredictabilityChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'PricePredictabilityChart'
      });
    } else if (trimmedLine === '<RentalYieldMapChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'RentalYieldMapChart'
      });
    } else if (trimmedLine === '<BuyerTypeScoresChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'BuyerTypeScoresChart'
      });
    } else if (trimmedLine === '<CyclicalPerformanceChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'CyclicalPerformanceChart'
        });
      } else if (trimmedLine === '<SeasonalIndexChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'SeasonalIndexChart'
        });
      } else if (trimmedLine === '<PeakPerformanceChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'PeakPerformanceChart'
        });
      } else if (trimmedLine === '<MarketTimingChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'MarketTimingChart'
        });
      } else if (trimmedLine === '<PriceVolatilityChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'PriceVolatilityChart'
        });
      } else if (trimmedLine === '<AutumnForecastChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'AutumnForecastChart'
        });
      } else if (trimmedLine === '<SizeEfficiencyChartNew2 />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'SizeEfficiencyChartNew2'
        });
      } else if (trimmedLine === '<OverAskingParadoxChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'OverAskingParadoxChart'
        });
      } else if (trimmedLine === '<ValueEfficiencyChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'ValueEfficiencyChart'
        });
      } else if (trimmedLine === '<QuarterlyTimingChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'QuarterlyTimingChart'
        });
      } else if (trimmedLine === '<StreetTypeInvestmentEfficiencyChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'StreetTypeInvestmentEfficiencyChart'
        });
      } else if (trimmedLine === '<PropertyTypeDistributionChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'PropertyTypeDistributionChart'
        });
      } else if (trimmedLine === '<BuyerProfileOptimizationChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'BuyerProfileOptimizationChart'
        });
      } else if (trimmedLine === '<SalesVolumeChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'SalesVolumeChart'
        });
      } else if (trimmedLine === '<PriceStabilityChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'PriceStabilityChart'
        });
      } else if (trimmedLine === '<OverAskingStabilityChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'OverAskingStabilityChart'
        });
      } else if (trimmedLine === '<AnnualAppreciationChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'AnnualAppreciationChart'
        });
      } else if (trimmedLine === '<ConservativeStrategyChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'ConservativeStrategyChart'
        });
      } else if (trimmedLine === '<BuyerAdvantageChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'BuyerAdvantageChart'
        });
      } else if (trimmedLine === '<RentalVolumeChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'RentalVolumeChart'
        });
      } else if (trimmedLine === '<PremiumRentalsChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'PremiumRentalsChart'
        });
      } else if (trimmedLine === '<ValueRentalsChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        // Add chart segment
        segments.push({
          type: 'chart',
          chartComponent: 'ValueRentalsChart'
        });
      } else if (trimmedLine === '<YieldEfficiencyChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'YieldEfficiencyChart'
        });
      } else if (trimmedLine === '<D5YearlyTrendsChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'D5YearlyTrendsChart'
        });
      } else if (trimmedLine === '<D5PropertyTypeChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'D5PropertyTypeChart'
        });
      } else if (trimmedLine === '<D5PriceDistributionChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'D5PriceDistributionChart'
        });
      } else if (trimmedLine === '<CovidRecoveryChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'CovidRecoveryChart'
        });
      } else if (trimmedLine === '<CovidPropertyTypeChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'CovidPropertyTypeChart'
        });
      } else if (trimmedLine === '<CovidGrowthRatesChart />') {
        // Save current HTML segment if it has content
        if (currentHtml.length > 0) {
          const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
          if (htmlContent.trim() !== '') {
            segments.push({
              type: 'html',
              content: htmlContent
            });
          }
          currentHtml = [];
        }
        segments.push({
          type: 'chart',
          chartComponent: 'CovidGrowthRatesChart'
        });
    } else if (trimmedLine === '<CornerDiscountOverviewChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'CornerDiscountOverviewChart'
      });
    } else if (trimmedLine === '<CornerDiscountByTypeChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'CornerDiscountByTypeChart'
      });
    } else if (trimmedLine === '<CornerDiscountBySizeChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'CornerDiscountBySizeChart'
      });
    } else if (trimmedLine === '<CornerDiscountByAreaChart />') {
      // Save current HTML segment if it has content
      if (currentHtml.length > 0) {
        const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
        if (htmlContent.trim() !== '') {
          segments.push({
            type: 'html',
            content: htmlContent
          });
        }
        currentHtml = [];
      }
      // Add chart segment
      segments.push({
        type: 'chart',
        chartComponent: 'CornerDiscountByAreaChart'
      });
    } else {
      // Add to current HTML segment
      currentHtml.push(line);
    }
  }
  
  // Add remaining HTML if it has content
  if (currentHtml.length > 0) {
    const htmlContent = processMarkdownToHtml(currentHtml.join('\n'));
    if (htmlContent.trim() !== '') {
      segments.push({
        type: 'html',
        content: htmlContent
      });
    }
  }
  
  // If no segments were created (empty content), return a single empty HTML segment
  if (segments.length === 0) {
    segments.push({
      type: 'html',
      content: ''
    });
  }
  
  return segments;
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({
    slug: slug,
  }));
}

export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = readArticle(slug);

  if (!article) {
    notFound();
  }

  // Blog content rendering enabled
  return (
    <div>
      <AISignupCTA />
      <div className="min-h-screen bg-slate-900">
        {/* Hero Section with Article Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-1 lg:py-2">
            <div className="max-w-4xl">
              {/* Minimal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Category Badge */}
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-medium border border-white/20">
                    {article.category}
                  </div>

                  {/* Article Meta - Inline */}
                  <div className="flex items-center gap-3 text-slate-300 text-xs">
                    <span>{article.date}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                    <span>•</span>
                    <span>{article.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight mb-6">
                {article.title}
              </h1>

              {/* Compact Map Link CTA - Top Right */}
              <div className="absolute top-4 right-4 md:top-6 md:right-6">
                <div className="w-36 md:w-40">
                  <MapLink />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Article Content */}
            <div className="lg:col-span-3">
              {/* Tags */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {article.tags && article.tags.map && article.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-700 text-slate-200 rounded-full text-xs sm:text-sm font-medium border border-slate-600">
                      {tag}
                    </span>
                  ))}
                  {article.tags && article.tags.length > 3 && (
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-600 text-slate-400 rounded-full text-xs sm:text-sm font-medium border border-slate-500">
                      +{article.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Vote Actions and Share */}
              <div className="mb-6 flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
                <BlogVoteButton articleSlug={slug} />
                <BlogShareButton 
                  title={article.title}
                  url={`/blog/${slug}`}
                  excerpt={article.excerpt}
                  variant="dropdown"
                />
              </div>

              <article className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700 p-8 lg:p-12">
                <div className="prose prose-lg prose-invert max-w-none">
                  {splitContentWithCharts(article.content).map((segment, index) => {
                    if (segment.type === 'html' && segment.content && segment.content.trim() !== '') {
                      return (
                        <div
                          key={`html-${index}`}
                          dangerouslySetInnerHTML={{
                            __html: segment.content
                          }}
                        />
                      );
                    } else if (segment.type === 'chart' && segment.chartComponent) {
                      if (segment.chartComponent === 'OverAskingChart') {
                        return <OverAskingChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'ThreeBedChart') {
                        return <ThreeBedChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'DistanceChart') {
                        return <DistanceChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'ChristmasPriceChart') {
                        return <ChristmasPriceChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldCurveChart') {
                        return <YieldCurveChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BedroomPerformanceChart') {
                        return <BedroomPerformanceChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'D4PremiumChart') {
                        return <D4PremiumChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'JanuaryVolumeChart') {
                        return <JanuaryVolumeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'RentalPricingChart') {
                        return <RentalPricingChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'TopRentalAreasChart') {
                        return <TopRentalAreasChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'Q2VsQ1Chart') {
                        return <Q2VsQ1Chart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'MonthlyTrendChart') {
                        return <MonthlyTrendChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'RentalYieldChart') {
                        return <RentalYieldChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldDistributionChart') {
                        return <YieldDistributionChartNew key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SizeEfficiencyChart') {
                        return <SizeEfficiencyChartNew key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PostcodeEfficiencyChart') {
                        return <PostcodeEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YearOverYearPricesChart') {
                        return <YearOverYearPricesChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeComparisonChart') {
                        return <PropertyTypeComparisonChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PremiumDistributionChart') {
                        return <PremiumDistributionChartNew key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PremiumPaybackChart') {
                        return <PremiumPaybackChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BreakEvenChart') {
                        return <BreakEvenChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OpportunityCostChart') {
                        return <OpportunityCostChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'AreaPremiumChart') {
                        return <AreaPremiumChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceIncreaseChart') {
                        return <PriceIncreaseChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BiddingWarsChart') {
                        return <BiddingWarsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceChangeComparisonChart') {
                        return <PriceChangeComparisonChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YearOverYearChart') {
                        return <YearOverYearChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeChart') {
                        return <PropertyTypeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceDistributionChart') {
                        return <PriceDistributionChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceTrendChart') {
                        return <PriceTrendChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YearOverYearChartD7') {
                        return <YearOverYearChartD7 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeChartD7') {
                        return <PropertyTypeChartD7 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceDistributionChartD7') {
                        return <PriceDistributionChartD7 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceTrendChartD7') {
                        return <PriceTrendChartD7 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YearOverYearChartD2') {
                        return <YearOverYearChartD2 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeChartD2') {
                        return <PropertyTypeChartD2 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceDistributionChartD2') {
                        return <PriceDistributionChartD2 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceTrendChartD2') {
                        return <PriceTrendChartD2 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeSavingsChart') {
                        return <PropertyTypeSavingsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BiddingWarImpactChart') {
                        return <BiddingWarImpactChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldByPostcodeChart') {
                        return <YieldByPostcodeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldByPriceBracketChart') {
                        return <YieldByPriceBracketChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BestValueAreasChart') {
                        return <BestValueAreasChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldDistributionChartNew') {
                        return <YieldDistributionChartNew key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BedroomEfficiencyChart') {
                        return <BedroomEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeEfficiencyChart') {
                        return <PropertyTypeEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SizeBracketEfficiencyChart') {
                        return <SizeBracketEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'EfficiencyParadoxChart') {
                        return <EfficiencyParadoxChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverAskingByPriceBracketChart') {
                        return <OverAskingByPriceBracketChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverAskingByPropertyTypeChart') {
                        return <OverAskingByPropertyTypeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverAskingByPostcodeChart') {
                        return <OverAskingByPostcodeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PremiumDistributionChartNew') {
                        return <PremiumDistributionChartNew key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OptimalStrategyChart') {
                        return <OptimalStrategyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'D3PropertyTypesChart') {
                        return <D3PropertyTypesChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'D3MonthlyTrendsChart') {
                        return <D3MonthlyTrendsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SizeBandMortgageChart') {
                        return <SizeBandMortgageChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverpaymentSavingsChartNew2') {
                        return <OverpaymentSavingsChartNew2 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SizeBandOverAskingChart') {
                        return <SizeBandOverAskingChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BreakEvenAnalysisChart') {
                        return <BreakEvenAnalysisChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldBySizeBandChart') {
                        return <YieldBySizeBandChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'GeographicPriceVariationsChart') {
                        return <GeographicPriceVariationsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceEfficiencyChart') {
                        return <PriceEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverAskingSuccessChart') {
                        return <OverAskingSuccessChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertySizeVariationsChart') {
                        return <PropertySizeVariationsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PricePredictabilityChart') {
                        return <PricePredictabilityChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'RentalYieldMapChart') {
                        return <RentalYieldMapChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BuyerTypeScoresChart') {
                        return <BuyerTypeScoresChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CyclicalPerformanceChart') {
                        return <CyclicalPerformanceChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SeasonalIndexChart') {
                        return <SeasonalIndexChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PeakPerformanceChart') {
                        return <PeakPerformanceChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'MarketTimingChart') {
                        return <MarketTimingChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceVolatilityChart') {
                        return <PriceVolatilityChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'AutumnForecastChart') {
                        return <AutumnForecastChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SizeEfficiencyChartNew2') {
                        return <SizeEfficiencyChartNew2 key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverAskingParadoxChart') {
                        return <OverAskingParadoxChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'ValueEfficiencyChart') {
                        return <ValueEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'QuarterlyTimingChart') {
                        return <QuarterlyTimingChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'StreetTypeInvestmentEfficiencyChart') {
                        return <StreetTypeInvestmentEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PropertyTypeDistributionChart') {
                        return <PropertyTypeDistributionChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BuyerProfileOptimizationChart') {
                        return <BuyerProfileOptimizationChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CornerDiscountOverviewChart') {
                        return <CornerDiscountOverviewChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CornerDiscountByTypeChart') {
                        return <CornerDiscountByTypeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CornerDiscountBySizeChart') {
                        return <CornerDiscountBySizeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CornerDiscountByAreaChart') {
                        return <CornerDiscountByAreaChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'SalesVolumeChart') {
                        return <SalesVolumeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PriceStabilityChart') {
                        return <PriceStabilityChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'OverAskingStabilityChart') {
                        return <OverAskingStabilityChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'AnnualAppreciationChart') {
                        return <AnnualAppreciationChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'ConservativeStrategyChart') {
                        return <ConservativeStrategyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'BuyerAdvantageChart') {
                        return <BuyerAdvantageChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'RentalVolumeChart') {
                        return <RentalVolumeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'PremiumRentalsChart') {
                        return <PremiumRentalsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'ValueRentalsChart') {
                        return <ValueRentalsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'YieldEfficiencyChart') {
                        return <YieldEfficiencyChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'D5YearlyTrendsChart') {
                        return <D5YearlyTrendsChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'D5PropertyTypeChart') {
                        return <D5PropertyTypeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'D5PriceDistributionChart') {
                        return <D5PriceDistributionChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CovidRecoveryChart') {
                        return <CovidRecoveryChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CovidPropertyTypeChart') {
                        return <CovidPropertyTypeChart key={`chart-${index}`} />;
                      } else if (segment.chartComponent === 'CovidGrowthRatesChart') {
                        return <CovidGrowthRatesChart key={`chart-${index}`} />;
                      }
                    }
                    return null;
                  })}
                </div>
              </article>

              {/* Newsletter Signup */}
              <div className="mt-12">
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-8 text-white text-center">
                  <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                      Stay Ahead of the Market
                    </h2>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                      Get weekly market insights and exclusive research delivered to your inbox.
                    </p>
                    <NewsletterSignup />
                  </div>
                </div>
              </div>

              {/* Related Articles */}
              <section className="mt-16">
                <h2 className="text-3xl font-bold text-white mb-8">Related Research</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {article.relatedArticles.map(relatedSlug => {
                    const relatedArticle = readArticleMeta(relatedSlug);
                    if (!relatedArticle) return null;

                    return (
                      <Link
                        key={relatedSlug}
                        href={`/blog/${relatedSlug}`}
                        className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
                      >
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-full text-slate-200 text-xs font-medium border border-slate-600">
                              {relatedArticle.category}
                            </div>
                            <span className="text-slate-400 text-xs">{relatedArticle.date}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                            {relatedArticle.title}
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                            {relatedArticle.excerpt}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Back to Blog */}
              <div className="text-center mt-16">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Blog
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-8">
                <TableOfContents content={article.content} />

                {/* Article Stats */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Article Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Views</span>
                      <span className="font-semibold text-white">{article.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Read Time</span>
                      <span className="font-semibold text-white">{article.readTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Category</span>
                      <span className="font-semibold text-white">{article.category}</span>
                    </div>
                  </div>
                </div>

                {/* Share Options */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Share This Article</h3>
                  <BlogShareButton
                    title={article.title}
                    url={`/blog/${slug}`}
                    excerpt={article.excerpt}
                    variant="inline"
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
