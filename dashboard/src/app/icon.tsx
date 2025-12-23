import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#3B73C5',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 200 200"
          fill="none"
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
    ),
    {
      ...size,
    }
  );
}



