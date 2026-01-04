'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lazy load the map component to improve initial page load performance
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading interactive map...</p>
      </div>
    </div>
  )
});

function MapPageContent() {
  const searchParams = useSearchParams();
  const initialNewOnly = searchParams.get('newOnly') === 'true';

  return <MapComponent initialNewOnly={initialNewOnly} />;
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading interactive map...</p>
        </div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
