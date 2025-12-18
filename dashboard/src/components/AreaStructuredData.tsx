import Script from 'next/script';

interface AreaStructuredDataProps {
  areaName: string;
  medianPrice: number;
  totalSales: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  change6m: number;
  recentSales: Array<{
    address: string;
    soldPrice: number;
    soldDate: string;
  }>;
  yieldData?: {
    avgYield: number;
    medianRent: number;
  } | null;
}

export function AreaStructuredData({ 
  areaName, 
  medianPrice, 
  totalSales,
  avgPricePerSqm,
  pctOverAsking,
  change6m,
  recentSales,
  yieldData 
}: AreaStructuredDataProps) {
  // Breadcrumb schema
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
        "name": "Areas",
        "item": "https://irishpropertydata.com/areas"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": areaName,
        "item": `https://irishpropertydata.com/areas/${areaName.toLowerCase().replace(/\s+/g, '-')}`
      }
    ]
  };

  // Dataset schema
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": `${areaName} Property Sales Data`,
    "description": `Comprehensive property sales data for ${areaName}, Dublin. Includes ${totalSales.toLocaleString()} property transactions with prices, dates, and market statistics.`,
    "url": `https://irishpropertydata.com/areas/${areaName.toLowerCase().replace(/\s+/g, '-')}`,
    "keywords": `${areaName}, Dublin, property prices, house prices, real estate data`,
    "creator": {
      "@type": "Organization",
      "name": "Irish Property Data"
    },
    "temporalCoverage": "2020/2025",
    "spatialCoverage": {
      "@type": "Place",
      "name": `${areaName}, Dublin, Ireland`
    },
    "distribution": {
      "@type": "DataDownload",
      "contentUrl": `https://irishpropertydata.com/api/areas/${areaName.toLowerCase().replace(/\s+/g, '-')}`
    }
  };

  // FAQPage schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is the average house price in ${areaName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Based on ${totalSales.toLocaleString()} property sales, the median house price in ${areaName} is €${medianPrice.toLocaleString()}. ${avgPricePerSqm > 0 ? `The average price per square meter is €${avgPricePerSqm.toLocaleString()}.` : ''}`
        }
      },
      {
        "@type": "Question",
        "name": `Are ${areaName} properties going over asking price?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Approximately ${pctOverAsking}% of properties in ${areaName} sell above their asking price, based on recent market data.`
        }
      },
      {
        "@type": "Question",
        "name": `How have ${areaName} property prices changed recently?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Over the past 6 months, property prices in ${areaName} have ${change6m >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change6m)}%.`
        }
      },
      ...(yieldData ? [{
        "@type": "Question",
        "name": `What is the rental yield in ${areaName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The average rental yield in ${areaName} is ${yieldData.avgYield}%, with estimated monthly rents around €${yieldData.medianRent.toLocaleString()}.`
        }
      }] : [])
    ]
  };

  // Place schema with real estate data
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": areaName,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": areaName,
      "addressRegion": "Dublin",
      "addressCountry": "IE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 53.3498,  // Dublin center (could be more specific per area)
      "longitude": -6.2603
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Median Property Price",
        "value": medianPrice,
        "unitCode": "EUR"
      },
      {
        "@type": "PropertyValue",
        "name": "Total Sales",
        "value": totalSales
      },
      {
        "@type": "PropertyValue",
        "name": "Price Per Square Meter",
        "value": avgPricePerSqm,
        "unitCode": "EUR"
      }
    ]
  };

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="dataset-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="place-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
    </>
  );
}

