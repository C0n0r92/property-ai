// Mapbox access token
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Month names for display
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const QUARTER_MONTHS: Record<number, number[]> = {
  1: [0, 1, 2],   // Q1: Jan, Feb, Mar
  2: [3, 4, 5],   // Q2: Apr, May, Jun
  3: [6, 7, 8],   // Q3: Jul, Aug, Sep
  4: [9, 10, 11], // Q4: Oct, Nov, Dec
};

// Common Dublin areas for quick access
export const DUBLIN_AREAS = [
  { name: 'Dublin City Centre', coords: [-6.2603, 53.3498], zoom: 14 },
  { name: 'Dublin 1', coords: [-6.2603, 53.3528], zoom: 14 },
  { name: 'Dublin 2', coords: [-6.2550, 53.3380], zoom: 14 },
  { name: 'Dublin 4', coords: [-6.2280, 53.3280], zoom: 14 },
  { name: 'Dublin 6', coords: [-6.2650, 53.3200], zoom: 14 },
  { name: 'Dublin 7', coords: [-6.2800, 53.3600], zoom: 14 },
  { name: 'Dublin 8', coords: [-6.2900, 53.3380], zoom: 14 },
  { name: 'Rathmines', coords: [-6.2650, 53.3220], zoom: 15 },
  { name: 'Ranelagh', coords: [-6.2580, 53.3260], zoom: 15 },
  { name: 'Drumcondra', coords: [-6.2550, 53.3700], zoom: 15 },
  { name: 'Sandymount', coords: [-6.2180, 53.3320], zoom: 15 },
  { name: 'Clontarf', coords: [-6.1900, 53.3650], zoom: 15 },
  { name: 'Howth', coords: [-6.0650, 53.3870], zoom: 14 },
  { name: 'Dun Laoghaire', coords: [-6.1350, 53.2940], zoom: 14 },
  { name: 'Blackrock', coords: [-6.1780, 53.3020], zoom: 15 },
  { name: 'Stillorgan', coords: [-6.2000, 53.2880], zoom: 15 },
  { name: 'Dundrum', coords: [-6.2450, 53.2920], zoom: 15 },
  { name: 'Tallaght', coords: [-6.3740, 53.2870], zoom: 14 },
  { name: 'Blanchardstown', coords: [-6.3880, 53.3930], zoom: 14 },
  { name: 'Swords', coords: [-6.2180, 53.4600], zoom: 14 },
];

export type DifferenceFilter = number | null;

// Data source selection - allows any combination
export interface DataSourceSelection {
  sold: boolean;
  forSale: boolean;
  rentals: boolean;
  savedOnly: boolean;
}
