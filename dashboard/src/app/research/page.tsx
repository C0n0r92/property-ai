'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { NewsletterSignup } from '@/components/NewsletterSignup';

// Research articles data - this will be moved to a data file later
const researchArticles = [
  {
    id: 'dublin-property-market-q4-2024',
    title: 'Dublin Property Market Analysis Q4 2024',
    excerpt: 'Comprehensive analysis of Dublin\'s property market performance, price trends, and future outlook based on 43,000+ transactions.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '8 min read',
    featured: true,
    tags: ['Market Trends', 'Price Analysis', 'Q4 2024'],
  },
  {
    id: 'properties-over-asking-dublin',
    title: 'Where Dublin Properties Go Most Over Asking Price in 2024',
    excerpt: 'Detailed breakdown of Dublin areas where properties consistently sell above asking price, with market demand indicators.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '6 min read',
    featured: false,
    tags: ['Over Asking', 'Market Demand', 'Buyer Competition'],
  },
  {
    id: 'dublin-rental-yield-analysis',
    title: 'Dublin Rental Yield Analysis: Best Areas for Property Investment',
    excerpt: 'Comprehensive analysis of rental yields across Dublin areas with investment potential and risk assessment.',
    category: 'Investment',
    date: '2024-12-22',
    readTime: '7 min read',
    featured: false,
    tags: ['Rental Yield', 'Investment', 'Buy-to-Let'],
  },
  {
    id: 'dublin-price-per-square-meter',
    title: 'Dublin Property Price Per Square Meter: Comprehensive Area Comparison',
    excerpt: 'Detailed analysis of price per square meter across all Dublin areas with value insights and market segmentation.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '5 min read',
    featured: false,
    tags: ['Price per m²', 'Value Analysis', 'Market Comparison'],
  },
  {
    id: 'fastest-growing-areas-dublin',
    title: 'Dublin Areas with Fastest Property Price Growth: 6-Month Analysis',
    excerpt: 'Analysis of Dublin\'s fastest growing property markets with momentum indicators and emerging opportunities.',
    category: 'Market Trends',
    date: '2024-12-22',
    readTime: '6 min read',
    featured: false,
    tags: ['Price Growth', 'Market Momentum', 'Investment Opportunities'],
  },
  {
    id: 'planning-permission-activity',
    title: 'Planning Permission Activity and Future Property Supply in Dublin',
    excerpt: 'Analysis of development applications and future property supply across Dublin\'s planning pipeline.',
    category: 'Planning',
    date: '2024-12-22',
    readTime: '9 min read',
    featured: false,
    tags: ['Planning Permission', 'Future Supply', 'Development'],
  },
  {
    id: 'property-types-analysis',
    title: 'Dublin Property Types Analysis: Apartments vs Houses Market Dynamics',
    excerpt: 'Comparative analysis of apartments versus houses in Dublin with price trends and market preferences.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '7 min read',
    featured: false,
    tags: ['Property Types', 'Apartments', 'Houses'],
  },
  {
    id: 'bedroom-count-analysis',
    title: 'Bedroom Count vs Property Prices: Dublin Market Breakdown',
    excerpt: 'Analysis of how bedroom count affects property prices across Dublin with cost per bedroom insights.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '5 min read',
    featured: false,
    tags: ['Bedrooms', 'Price Analysis', 'Property Size'],
  },
  {
    id: 'amenities-impact-prices',
    title: 'Dublin Property Amenities Impact Analysis: Schools, Transport, and Value',
    excerpt: 'Quantitative analysis of how proximity to amenities affects Dublin property prices and values.',
    category: 'Location Analysis',
    date: '2024-12-22',
    readTime: '8 min read',
    featured: false,
    tags: ['Amenities', 'Schools', 'Transport'],
  },
  {
    id: 'complete-area-rankings',
    title: 'Complete Guide to Dublin Property Areas: Price, Yield, and Growth Rankings',
    excerpt: 'Comprehensive rankings of all Dublin areas across multiple factors for informed property decisions.',
    category: 'Market Guide',
    date: '2024-12-22',
    readTime: '10 min read',
    featured: false,
    tags: ['Area Rankings', 'Comprehensive Guide', 'Decision Framework'],
  },
];

const categories = ['All', 'Market Analysis', 'Investment', 'Market Trends', 'Planning', 'Location Analysis', 'Market Guide'];

export default function ResearchPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    return researchArticles.filter(article => {
      const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const featuredArticle = researchArticles.find(article => article.featured);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <nav className="text-sm text-slate-600 mb-4">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          {' / '}
          <span className="text-slate-900">Research</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Market Research & Intelligence</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Professional market analysis and data-driven insights to help you understand Dublin's property landscape.
          All research is based on comprehensive transaction data and market intelligence.
        </p>
      </div>

      {/* Featured Article */}
      {featuredArticle && (
        <div className="mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                  <span>Featured Research</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">{featuredArticle.title}</h2>
                <p className="text-blue-100 mb-6 text-lg">{featuredArticle.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-blue-100 mb-6">
                  <span>{featuredArticle.date}</span>
                  <span>•</span>
                  <span>{featuredArticle.readTime}</span>
                  <span>•</span>
                  <span>{featuredArticle.category}</span>
                </div>
                <Link
                  href={`/research/${featuredArticle.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Read Full Analysis →
                </Link>
              </div>
              <div className="md:w-80 h-48 bg-white/10 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-white/80 text-sm">Data-Driven Analysis</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search research..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 px-4 py-2 pl-10 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Article Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {filteredArticles.map(article => (
          <article key={article.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                article.category === 'Market Analysis' ? 'bg-blue-100 text-blue-800' :
                article.category === 'Investment' ? 'bg-emerald-100 text-emerald-800' :
                article.category === 'Planning' ? 'bg-purple-100 text-purple-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {article.category}
              </span>
              <span className="text-xs text-slate-500">{article.readTime}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
              <Link href={`/research/${article.id}`} className="hover:text-blue-600 transition-colors">
                {article.title}
              </Link>
            </h3>

            <p className="text-slate-600 mb-4 line-clamp-3">{article.excerpt}</p>

            <div className="flex flex-wrap gap-1 mb-4">
              {article.tags.slice(0, 2).map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{article.date}</span>
              <Link
                href={`/research/${article.id}`}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                Read More →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Newsletter Signup */}
      <NewsletterSignup />

      {/* Explore Areas */}
      <div className="mt-12 mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Explore Areas Featured in Research</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <Link
            href="/areas/dublin-4"
            className="text-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="font-semibold text-slate-900">Dublin 4</div>
            <div className="text-sm text-slate-600">Premium Market</div>
          </Link>
          <Link
            href="/areas/dublin-6"
            className="text-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="font-semibold text-slate-900">Dublin 6</div>
            <div className="text-sm text-slate-600">Family Areas</div>
          </Link>
          <Link
            href="/areas/dublin-2"
            className="text-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="font-semibold text-slate-900">Dublin 2</div>
            <div className="text-sm text-slate-600">City Centre</div>
          </Link>
          <Link
            href="/areas"
            className="text-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="font-semibold text-slate-900">All Areas</div>
            <div className="text-sm text-slate-600">Complete List</div>
          </Link>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-2xl font-bold text-slate-900 mb-1">43,000+</div>
          <div className="text-sm text-slate-600">Properties Analyzed</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 mb-1">150+</div>
          <div className="text-sm text-slate-600">Areas Covered</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 mb-1">10</div>
          <div className="text-sm text-slate-600">Research Reports</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 mb-1">24hrs</div>
          <div className="text-sm text-slate-600">Data Freshness</div>
        </div>
      </div>
    </div>
  );
}
