/**
 * Mapbox Static Map utilities for property comparison
 */

export interface MapboxImageOptions {
  width?: number;
  height?: number;
  zoom?: number;
  style?: string;
  markerColor?: string;
}

export function generatePropertyMapImage(
  latitude: number,
  longitude: number,
  options: MapboxImageOptions = {}
): string {
  const {
    width = 400,
    height = 300,
    zoom = 15,
    style = 'streets-v12',
    markerColor = '3b82f6' // Blue color
  } = options;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    console.error('Mapbox token not found');
    return '';
  }

  // Create custom marker (home icon)
  const marker = `pin-l-home+${markerColor}(${longitude},${latitude})`;

  // Construct URL
  const url = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${marker}/${longitude},${latitude},${zoom}/${width}x${height}@2x?access_token=${token}`;

  return url;
}

/**
 * Generate a fallback image URL for when coordinates are not available
 */
export function generateFallbackImage(): string {
  // Return a simple placeholder image URL
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIG1hcCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
}

/**
 * Get alternative view options
 */
export function getMapStyles(): { value: string; label: string; description: string }[] {
  return [
    {
      value: 'streets-v12',
      label: 'Street Map',
      description: 'Clean street view with roads and labels'
    },
    {
      value: 'satellite-v9',
      label: 'Satellite',
      description: 'Aerial satellite imagery'
    },
    {
      value: 'light-v11',
      label: 'Light',
      description: 'Minimal light theme'
    },
    {
      value: 'dark-v11',
      label: 'Dark',
      description: 'Minimal dark theme'
    }
  ];
}

