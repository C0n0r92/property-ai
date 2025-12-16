import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Gaff Intel - Dublin Property Intelligence';
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
        
        {/* House icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 30,
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.5))' }}
          >
            {/* House shape */}
            <path
              d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="gradient" x1="3" y1="3" x2="21" y2="21">
                <stop stopColor="#10b981" />
                <stop offset="0.5" stopColor="#06b6d4" />
                <stop offset="1" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Logo */}
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
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 32,
              fontWeight: 700,
              boxShadow: '0 0 40px rgba(6, 182, 212, 0.4)',
            }}
          >
            G
          </div>
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
            Gaff Intel
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
          Dublin Property Intelligence
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
          gaffintel.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

