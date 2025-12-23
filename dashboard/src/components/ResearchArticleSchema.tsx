import Script from 'next/script';

interface ResearchArticleSchemaProps {
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author?: string;
  tags: string[];
  url: string;
  imageUrl?: string;
}

export function ResearchArticleSchema({
  title,
  excerpt,
  content,
  date,
  author = "Irish Property Data",
  tags,
  url,
  imageUrl
}: ResearchArticleSchemaProps) {
  // Article schema with author information
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": excerpt,
    "articleBody": content,
    "datePublished": date,
    "dateModified": date,
    "author": {
      "@type": "Organization",
      "name": author,
      "url": "https://irishpropertydata.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://irishpropertydata.com/logo.png"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "Irish Property Data",
      "logo": {
        "@type": "ImageObject",
        "url": "https://irishpropertydata.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "url": url,
    "keywords": tags.join(", "),
    "articleSection": "Market Research",
    "inLanguage": "en-IE",
    ...(imageUrl && {
      "image": {
        "@type": "ImageObject",
        "url": imageUrl,
        "width": 1200,
        "height": 630
      }
    })
  };

  // Author schema for personal branding
  const authorSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": author,
    "url": "https://irishpropertydata.com",
    "sameAs": [
      "https://www.linkedin.com/company/irish-property-data"
    ],
    "foundingDate": "2024",
    "description": "Professional property market intelligence and data analysis for Dublin and Ireland",
    "knowsAbout": [
      "Property Market Analysis",
      "Dublin Real Estate",
      "Irish Property Prices",
      "Market Research",
      "Data Analytics"
    ],
    "areaServed": {
      "@type": "Country",
      "name": "Ireland"
    }
  };

  // Breadcrumb schema for SEO
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://irishpropertydata.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Research",
        "item": "https://irishpropertydata.com/research"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": title,
        "item": url
      }
    ]
  };

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id="author-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
      />
      <Script
        id="breadcrumb-research-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}


