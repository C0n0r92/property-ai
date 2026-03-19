#!/usr/bin/env node

/**
 * Extract blog articles from monolithic page.tsx into individual files
 * Reads src/app/blog/[slug]/page.tsx and creates:
 * - dashboard/public/blog-content/[slug].md (content)
 * - dashboard/public/blog-content/[slug].meta.json (metadata)
 */

const fs = require('fs');
const path = require('path');

// Paths
const DASHBOARD_ROOT = path.join(__dirname, '../dashboard');
const PAGE_FILE = path.join(DASHBOARD_ROOT, 'src/app/blog/[slug]/page.tsx.bak');
const OUTPUT_DIR = path.join(DASHBOARD_ROOT, 'public/blog-content');

console.log('🚀 Starting blog article extraction...\n');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Created directory: ${OUTPUT_DIR}\n`);
}

// Read the page.tsx file
const pageContent = fs.readFileSync(PAGE_FILE, 'utf-8');

// Extract the articles object using a regex approach
// Find the start of the articles object
const articlesStart = pageContent.indexOf('export const articles = {');
if (articlesStart === -1) {
  console.error('❌ Could not find articles object in page.tsx');
  process.exit(1);
}

// Extract from articlesStart to the matching closing brace
// We need to parse this carefully to handle nested braces
let braceCount = 0;
let inString = false;
let inTemplate = false;
let stringChar = null;
let articlesEnd = articlesStart;

for (let i = articlesStart; i < pageContent.length; i++) {
  const char = pageContent[i];
  const prevChar = i > 0 ? pageContent[i - 1] : '';

  // Handle template literals
  if (char === '`' && prevChar !== '\\') {
    inTemplate = !inTemplate;
    continue;
  }

  // Handle regular strings (only if not in template)
  if (!inTemplate && (char === '"' || char === "'") && prevChar !== '\\') {
    if (!inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar) {
      inString = false;
      stringChar = null;
    }
    continue;
  }

  // Count braces only if not in string or template
  if (!inString && !inTemplate) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        articlesEnd = i + 1;
        break;
      }
    }
  }
}

const articlesObjectStr = pageContent.substring(articlesStart, articlesEnd);

// Parse each article using regex
// Pattern: 'slug': { ... },
const articlePattern = /  '([^']+)':\s*\{([\s\S]*?)\n  \}(?:,|\n)/g;
const articles = {};

let match;
while ((match = articlePattern.exec(articlesObjectStr)) !== null) {
  const slug = match[1];
  const articleBody = match[2];

  // Extract fields using regex
  const extractField = (field, isArray = false, isTemplate = false) => {
    if (isTemplate) {
      // For template literals (content field)
      const regex = new RegExp(`${field}:\\s*\`([\\s\\S]*?)\`(?:,|\\n)`);
      const m = regex.exec(articleBody);
      return m ? m[1] : '';
    } else if (isArray) {
      // For arrays - need to handle escaped quotes in array items
      const regex = new RegExp(`${field}:\\s*\\[([^\\]]*?)\\]`, 's');
      const m = regex.exec(articleBody);
      if (!m) return [];
      return m[1]
        .split(',')
        .map(item => item.trim().replace(/^['"]|['"]$/g, '').replace(/\\'/g, "'").replace(/\\"/g, '"'))
        .filter(item => item);
    } else {
      // For simple string fields - match until unescaped quote
      // This regex handles escaped quotes by using (?:[^'\\]|\\.)*? which matches either non-quote-non-backslash OR backslash-followed-by-anything
      const singleQuoteRegex = new RegExp(`${field}:\\s*'((?:[^'\\\\]|\\\\.)*?)'(?:,|\\n)`, 's');
      const doubleQuoteRegex = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*?)"(?:,|\\n)`, 's');

      let m = singleQuoteRegex.exec(articleBody);
      if (!m) m = doubleQuoteRegex.exec(articleBody);
      if (!m) return '';

      // Unescape any escaped quotes
      return m[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
  };

  // Extract numeric/boolean fields separately
  const viewsMatch = /views:\s*(\d+)/.exec(articleBody);
  const featuredMatch = /featured:\s*(true|false)/.exec(articleBody);

  articles[slug] = {
    title: extractField('title'),
    excerpt: extractField('excerpt'),
    category: extractField('category'),
    date: extractField('date'),
    readTime: extractField('readTime'),
    featured: featuredMatch ? featuredMatch[1] === 'true' : false,
    tags: extractField('tags', true),
    author: extractField('author'),
    views: viewsMatch ? parseInt(viewsMatch[1]) : 0,
    relatedArticles: extractField('relatedArticles', true),
    content: extractField('content', false, true)
  };
}

console.log(`📊 Found ${Object.keys(articles).length} articles to extract\n`);

// Extract each article
let successCount = 0;
let errorCount = 0;

for (const [slug, article] of Object.entries(articles)) {
  try {
    // Extract metadata
    const metadata = {
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      date: article.date,
      readTime: article.readTime,
      tags: article.tags,
      author: article.author,
      views: article.views || 0,
      relatedArticles: article.relatedArticles || []
    };

    // Write metadata file
    const metaPath = path.join(OUTPUT_DIR, `${slug}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Write content file
    const contentPath = path.join(OUTPUT_DIR, `${slug}.md`);
    fs.writeFileSync(contentPath, article.content, 'utf-8');

    successCount++;
    console.log(`✅ ${slug}`);
  } catch (error) {
    errorCount++;
    console.error(`❌ ${slug}: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📈 Extraction complete!`);
console.log(`   ✅ Success: ${successCount} articles`);
console.log(`   ❌ Errors: ${errorCount} articles`);
console.log(`   📁 Output: ${OUTPUT_DIR}`);
console.log('='.repeat(60));
