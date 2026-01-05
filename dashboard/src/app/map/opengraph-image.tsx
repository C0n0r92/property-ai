import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Dublin Property Map - Interactive Property Search & Price Data';
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
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
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
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Mock Map Interface */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 50,
            right: 50,
            bottom: 200,
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Search bar mock */}
          <div
            style={{
              position: 'absolute',
              top: 15,
              left: 15,
              right: 15,
              height: 30,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
            }}
          >
            <div style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '50%', marginRight: '8px' }}></div>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '1px' }}></div>
          </div>

          {/* Filter toggles mock */}
          <div
            style={{
              position: 'absolute',
              top: 55,
              left: 15,
              display: 'flex',
              gap: '8px',
            }}
          >
            <div style={{ width: '16px', height: '16px', background: '#FFFFFF', borderRadius: '3px', border: '1px solid rgba(255, 255, 255, 0.3)' }}></div>
            <div style={{ width: '16px', height: '16px', background: '#F43F5E', borderRadius: '3px', border: '1px solid rgba(255, 255, 255, 0.3)' }}></div>
            <div style={{ width: '16px', height: '16px', background: '#A855F7', borderRadius: '3px', border: '1px solid rgba(255, 255, 255, 0.3)' }}></div>
          </div>
          {/* Map background */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              position: 'relative',
            }}
          >
            {/* Dublin area outline */}
            <div
              style={{
                position: 'absolute',
                top: '30%',
                left: '30%',
                width: '200px',
                height: '150px',
                border: '3px solid rgba(6, 182, 212, 0.6)',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.1)',
              }}
            />

            {/* Street labels */}
            <div style={{ position: 'absolute', top: '25%', left: '45%', fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 'bold' }}>
              O'Connell St
            </div>
            <div style={{ position: 'absolute', top: '55%', left: '25%', fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Merrion Sq
            </div>
            <div style={{ position: 'absolute', top: '40%', left: '60%', fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Grafton St
            </div>

            {/* Property markers - using actual map colors */}
            {/* Sold property (white) */}
            <div style={{ position: 'absolute', top: '35%', left: '35%' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#FFFFFF',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
                  border: '1px solid #374151',
                }}
              />
            </div>
            {/* For sale listing (hot pink) */}
            <div style={{ position: 'absolute', top: '42%', left: '42%' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#F43F5E',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px rgba(244, 63, 94, 0.6)',
                }}
              />
            </div>
            {/* Active rental (bright purple) */}
            <div style={{ position: 'absolute', top: '38%', left: '48%' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#A855F7',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px rgba(168, 85, 247, 0.6)',
                }}
              />
            </div>
            {/* Historical rental (dark purple) */}
            <div style={{ position: 'absolute', top: '45%', left: '38%' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#7C3AED',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px rgba(124, 58, 237, 0.6)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            position: 'absolute',
            bottom: 140,
            left: 50,
            right: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              background: 'linear-gradient(90deg, #06b6d4, #10b981)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
              textAlign: 'center',
            }}
          >
            Dublin Property Map
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            position: 'absolute',
            bottom: 110,
            left: 50,
            right: 50,
            fontSize: 20,
            color: '#94a3b8',
            display: 'flex',
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          Explore 43,000+ Properties • Real-Time Data
        </div>

        {/* Feature highlights */}
        <div
          style={{
            position: 'absolute',
            bottom: 85,
            left: 50,
            right: 50,
            fontSize: 14,
            color: '#64748b',
            display: 'flex',
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          Sold Prices • For Sale Listings • Rental Data
        </div>

        {/* Stats with map-style colors */}
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            display: 'flex',
            gap: 50,
            justifyContent: 'center',
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
                color: '#FFFFFF',
                display: 'flex',
                textShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
              }}
            >
              43,000+
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#94a3b8',
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
                fontSize: 32,
                fontWeight: 700,
                color: '#F43F5E',
                display: 'flex',
                textShadow: '0 0 8px rgba(244, 63, 94, 0.6)',
              }}
            >
              2,800+
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#94a3b8',
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
                fontSize: 32,
                fontWeight: 700,
                color: '#A855F7',
                display: 'flex',
                textShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
              }}
            >
              980+
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#94a3b8',
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
            bottom: 15,
            fontSize: 18,
            color: '#475569',
            display: 'flex',
          }}
        >
          irishpropertydata.com/map
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
