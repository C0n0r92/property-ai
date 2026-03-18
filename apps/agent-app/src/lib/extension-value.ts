/**
 * Extension Value Calculator
 * Calculates potential value of property extensions based on area price/sqm data
 */

export interface ExtensionType {
  id: string;
  name: string;
  sqm: number;
  description: string;
}

export const EXTENSION_TYPES: ExtensionType[] = [
  {
    id: 'rear_single',
    name: 'Single-storey rear',
    sqm: 20,
    description: 'Typical kitchen/dining extension',
  },
  {
    id: 'rear_two_storey',
    name: 'Two-storey extension',
    sqm: 30,
    description: 'Ground + first floor addition',
  },
  {
    id: 'attic',
    name: 'Attic conversion',
    sqm: 15,
    description: 'Loft conversion with dormer',
  },
  {
    id: 'full',
    name: 'Full ext + attic',
    sqm: 50,
    description: 'Comprehensive extension package',
  },
];

export interface ExtensionValue {
  type: ExtensionType;
  estimatedValue: number;
}

export interface ExtensionValueResult {
  postcode: string;
  pricePerSqm: number;
  sampleSize: number;
  extensions: ExtensionValue[];
  propertyType: string;
}

export interface Property {
  soldPrice?: number;
  areaSqm?: number | null;
  dublinPostcode?: string | null;
  propertyType?: string;
}

// Property types that qualify for extension calculations (houses only)
const HOUSE_TYPES = [
  'Semi-D',
  'Semi-Detached',
  'Terraced',
  'Terrace',
  'Detached',
  'End of Terrace',
  'Townhouse',
  'Bungalow',
];

/**
 * Check if property type is eligible for extension value calculation
 */
export function isHouseType(propertyType: string | undefined): boolean {
  if (!propertyType) return false;
  return HOUSE_TYPES.some(type =>
    propertyType.toLowerCase().includes(type.toLowerCase())
  );
}

/**
 * Calculate median price per sqm for houses in a given postcode
 */
export function calculateAreaPricePerSqm(
  postcode: string,
  allProperties: Property[]
): { pricePerSqm: number; sampleSize: number } | null {
  // Filter to houses in this postcode with valid sqm and price data
  const houses = allProperties.filter(p => {
    if (p.dublinPostcode !== postcode) return false;
    if (!p.soldPrice || p.soldPrice <= 0) return false;
    if (!p.areaSqm || p.areaSqm <= 0) return false;
    if (!isHouseType(p.propertyType)) return false;
    return true;
  });

  if (houses.length < 10) {
    return null; // Need minimum sample size
  }

  // Calculate price per sqm for each house
  const pricesPerSqm = houses.map(p => p.soldPrice! / p.areaSqm!);

  // Calculate median
  const sorted = [...pricesPerSqm].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    pricePerSqm: Math.round(median),
    sampleSize: houses.length,
  };
}

/**
 * Calculate extension values for a property
 */
export function calculateExtensionValues(
  propertyType: string | undefined,
  postcode: string | null | undefined,
  allProperties: Property[]
): ExtensionValueResult | null {
  // Only show for houses
  if (!isHouseType(propertyType)) {
    return null;
  }

  if (!postcode) {
    return null;
  }

  // Get area price per sqm
  const areaData = calculateAreaPricePerSqm(postcode, allProperties);
  if (!areaData) {
    return null;
  }

  // Calculate value for each extension type
  const extensions: ExtensionValue[] = EXTENSION_TYPES.map(extType => ({
    type: extType,
    estimatedValue: Math.round(areaData.pricePerSqm * extType.sqm),
  }));

  return {
    postcode,
    pricePerSqm: areaData.pricePerSqm,
    sampleSize: areaData.sampleSize,
    extensions,
    propertyType: propertyType || 'House',
  };
}

/**
 * Format extension value as currency
 */
export function formatExtensionValue(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(2)}M`;
  }
  return `€${value.toLocaleString()}`;
}
