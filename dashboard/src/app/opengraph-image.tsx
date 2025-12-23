import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Irish Property Data - Property Intelligence & Market Insights';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
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
        
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 30,
          }}
        >
          <svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.5))' }}
          >
            {/* House outline - roof and walls */}
            <path
              d="M 20 90 L 100 20 L 180 90 L 180 180 L 20 180 Z"
              fill="#3B73C5"
              stroke="#FFFFFF"
              strokeWidth="8"
              strokeLinejoin="round"
            />
            
            {/* Inner house shape */}
            <path
              d="M 40 100 L 100 50 L 160 100 L 160 165 L 40 165 Z"
              fill="#4A85D9"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            
            {/* Chart bars */}
            <rect x="50" y="130" width="18" height="25" fill="#FFFFFF" rx="2" />
            <rect x="75" y="115" width="18" height="40" fill="#FFFFFF" rx="2" />
            <rect x="100" y="125" width="18" height="30" fill="#FFFFFF" rx="2" />
            <rect x="125" y="105" width="18" height="50" fill="#FFFFFF" rx="2" />
            
            {/* Trend line with dots */}
            <circle cx="59" cy="125" r="5" fill="#FFFFFF" />
            <circle cx="84" cy="110" r="5" fill="#FFFFFF" />
            <circle cx="109" cy="118" r="5" fill="#FFFFFF" />
            <circle cx="134" cy="95" r="5" fill="#FFFFFF" />
            
            <path
              d="M 59 125 L 84 110 L 109 118 L 134 95"
              stroke="#FFFFFF"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
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
              fontSize: 56,
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

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#94a3b8',
            marginBottom: 40,
            display: 'flex',
          }}
        >
          Market Intelligence
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 60,
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
                fontSize: 42,
                fontWeight: 700,
                color: '#10b981',
                display: 'flex',
              }}
            >
              43,000+
            </div>
            <div
              style={{
                fontSize: 18,
                color: '#64748b',
                display: 'flex',
              }}
            >
              Sold Properties
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
                fontSize: 42,
                fontWeight: 700,
                color: '#f43f5e',
                display: 'flex',
              }}
            >
              2,800+
            </div>
            <div
              style={{
                fontSize: 18,
                color: '#64748b',
                display: 'flex',
              }}
            >
              For Sale
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
                fontSize: 42,
                fontWeight: 700,
                color: '#a855f7',
                display: 'flex',
              }}
            >
              980+
            </div>
            <div
              style={{
                fontSize: 18,
                color: '#64748b',
                display: 'flex',
              }}
            >
              Rentals
            </div>
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#475569',
            display: 'flex',
          }}
        >
          irishpropertydata.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

