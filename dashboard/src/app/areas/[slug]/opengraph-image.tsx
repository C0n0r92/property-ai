import { ImageResponse } from 'next/og';
import { slugToArea } from '@/lib/areas';
import { loadProperties, getAreaStats } from '@/lib/data';
import { formatFullPrice } from '@/lib/format';

export const runtime = 'edge';

export const alt = 'Irish Property Data - Area Property Analysis';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const areaName = slugToArea(slug);

  if (!areaName) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 48,
              color: '#374151',
              textAlign: 'center',
            }}
          >
            Area Not Found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // Fetch area data
  const properties = loadProperties();
  const areaStats = getAreaStats(properties);
  const areaData = areaStats.find(stat => stat.name === areaName);

  if (!areaData) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 48,
              color: '#374151',
              textAlign: 'center',
            }}
          >
            No Data Available
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const medianPrice = formatFullPrice(areaData.medianPrice);
  const change6m = areaData.change6m;
  const pricePerSqm = areaData.avgPricePerSqm > 0 ? `€${areaData.avgPricePerSqm.toLocaleString()}` : 'N/A';
  const totalSales = areaData.count;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
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
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
            padding: '40px',
          }}
        >
          {/* Area Name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: 20,
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            {areaName}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: '#cbd5e1',
              marginBottom: 40,
              textAlign: 'center',
              opacity: 0.9,
            }}
          >
            Property Market Analysis
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: 60,
              marginBottom: 40,
            }}
          >
            {/* Median Price */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#10b981',
                  marginBottom: 8,
                }}
              >
                {medianPrice}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: '#94a3b8',
                }}
              >
                Median Price
              </div>
            </div>

            {/* 6-Month Change */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: change6m >= 0 ? '#10b981' : '#ef4444',
                  marginBottom: 8,
                }}
              >
                {change6m >= 0 ? '+' : ''}{change6m}%
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: '#94a3b8',
                }}
              >
                6-Month Change
              </div>
            </div>

            {/* Price per sqm */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#8b5cf6',
                  marginBottom: 8,
                }}
              >
                {pricePerSqm}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: '#94a3b8',
                }}
              >
                Price per m²
              </div>
            </div>
          </div>

          {/* Sales Count */}
          <div
            style={{
              fontSize: 24,
              color: '#cbd5e1',
              marginBottom: 40,
              textAlign: 'center',
            }}
          >
            Based on {totalSales.toLocaleString()} property sales
          </div>

          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 700,
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)',
              }}
            >
              G
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              Irish Property Data
            </div>
          </div>

          {/* URL */}
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              fontSize: 16,
              color: '#64748b',
            }}
          >
            irishpropertydata.com/areas/{slug}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
