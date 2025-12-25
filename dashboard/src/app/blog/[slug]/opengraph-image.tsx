import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Irish Property Data Blog Post';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;

  // Create a formatted title from the slug
  const formattedTitle = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/And/g, '&');

  // Get category color based on slug patterns
  const getCategoryColor = (slug: string) => {
    if (slug.includes('market') || slug.includes('analysis')) return '#10b981'; // Market Analysis - green
    if (slug.includes('investment') || slug.includes('yield')) return '#f43f5e'; // Investment - red
    if (slug.includes('trend') || slug.includes('christmas') || slug.includes('price')) return '#a855f7'; // Market Trends - purple
    if (slug.includes('planning') || slug.includes('permission')) return '#06b6d4'; // Planning - cyan
    if (slug.includes('location') || slug.includes('area') || slug.includes('commuter')) return '#f59e0b'; // Location - amber
    if (slug.includes('guide') || slug.includes('ranking')) return '#8b5cf6'; // Market Guide - violet
    if (slug.includes('rent') || slug.includes('rental')) return '#ec4899'; // Renting - pink
    return '#10b981'; // Default green
  };

  const categoryColor = getCategoryColor(slug);

  // Get category name based on slug
  const getCategoryName = (slug: string) => {
    if (slug.includes('market') || slug.includes('analysis') || slug.includes('property')) return 'Market Analysis';
    if (slug.includes('investment') || slug.includes('yield')) return 'Investment';
    if (slug.includes('trend') || slug.includes('christmas') || slug.includes('price')) return 'Market Trends';
    if (slug.includes('planning') || slug.includes('permission')) return 'Planning';
    if (slug.includes('location') || slug.includes('area') || slug.includes('commuter')) return 'Location Analysis';
    if (slug.includes('guide') || slug.includes('ranking')) return 'Market Guide';
    if (slug.includes('rent') || slug.includes('rental')) return 'Renting';
    return 'Market Research';
  };

  const categoryName = getCategoryName(slug);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 60px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 200 200"
              fill="none"
            >
              {/* Simplified house icon */}
              <path
                d="M 20 90 L 100 20 L 180 90 L 180 180 L 20 180 Z"
                fill="#3B73C5"
                stroke="#FFFFFF"
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <rect x="60" y="130" width="12" height="25" fill="#FFFFFF" rx="2" />
              <rect x="80" y="115" width="12" height="40" fill="#FFFFFF" rx="2" />
              <rect x="100" y="125" width="12" height="30" fill="#FFFFFF" rx="2" />
              <rect x="120" y="105" width="12" height="50" fill="#FFFFFF" rx="2" />
            </svg>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Irish Property Data
            </div>
          </div>

          {/* Category Badge */}
          <div
            style={{
              backgroundColor: categoryColor,
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {categoryName}
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 60px',
            textAlign: 'center',
          }}
        >
          {/* Article Title */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: 24,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {formattedTitle}
          </div>

          {/* Article Description */}
          <div
            style={{
              fontSize: 24,
              color: '#94a3b8',
              lineHeight: 1.4,
              marginBottom: 32,
            }}
          >
            Market Research & Analysis
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 60,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: categoryColor,
                  marginBottom: 4,
                }}
              >
                43K+
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Properties
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#f59e0b',
                  marginBottom: 4,
                }}
              >
                2025
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Data
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#ec4899',
                  marginBottom: 4,
                }}
              >
                FREE
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Research
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 60px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: '#64748b',
            }}
          >
            Professional Market Intelligence
          </div>
          <div
            style={{
              fontSize: 16,
              color: '#94a3b8',
            }}
          >
            irishpropertydata.com/blog
          </div>
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: '120px',
            height: '120px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '10%',
            width: '100px',
            height: '100px',
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '50%',
            filter: 'blur(30px)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
