import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatFullPrice } from '@/lib/format';
import PropertyDetailsClient from './PropertyDetailsClient';

interface Props {
  params: Promise<{ type: string; id: string }>;
}

async function fetchPropertyData(type: string, id: string) {
  const decodedId = decodeURIComponent(id);

  try {
    const supabase = await createClient();

    if (type === 'sold') {
      // Try ID lookup first (clean URL), then address fallback (legacy URLs)
      const { data: byId } = await supabase
        .from('sold_properties')
        .select('id, address, beds, baths, area_sqm, sold_price, asking_price, sold_date, property_type, dublin_postcode, latitude, longitude, eircode')
        .eq('id', decodedId)
        .single();

      if (byId) return { property: byId, table: 'sold' };

      // Legacy: address-based lookup
      const { data: byAddress } = await supabase
        .from('sold_properties')
        .select('id, address, beds, baths, area_sqm, sold_price, asking_price, sold_date, property_type, dublin_postcode, latitude, longitude, eircode')
        .ilike('address', `%${decodedId.split(',')[0]}%`)
        .limit(1)
        .single();

      if (byAddress) return { property: byAddress, table: 'sold' };

    } else if (type === 'forSale') {
      const { data: byId } = await supabase
        .from('property_listings')
        .select('id, address, beds, baths, area_sqm, asking_price, property_type, dublin_postcode, latitude, longitude, eircode')
        .eq('id', decodedId)
        .single();

      if (byId) return { property: byId, table: 'forSale' };

      const { data: byAddress } = await supabase
        .from('property_listings')
        .select('id, address, beds, baths, area_sqm, asking_price, property_type, dublin_postcode, latitude, longitude, eircode')
        .ilike('address', `%${decodedId.split(',')[0]}%`)
        .limit(1)
        .single();

      if (byAddress) return { property: byAddress, table: 'forSale' };

    } else if (type === 'rental') {
      const { data: byId } = await supabase
        .from('rental_listings')
        .select('id, address, beds, baths, area_sqm, monthly_rent, property_type, dublin_postcode, latitude, longitude, eircode')
        .eq('id', decodedId)
        .single();

      if (byId) return { property: byId, table: 'rental' };

      const { data: byAddress } = await supabase
        .from('rental_listings')
        .select('id, address, beds, baths, area_sqm, monthly_rent, property_type, dublin_postcode, latitude, longitude, eircode')
        .ilike('address', `%${decodedId.split(',')[0]}%`)
        .limit(1)
        .single();

      if (byAddress) return { property: byAddress, table: 'rental' };
    }
  } catch (err) {
    console.error('SSR property fetch error:', err);
  }

  return null;
}

function buildTitle(property: any, type: string): string {
  const parts: string[] = [];

  // Beds + property type
  if (property.beds && property.property_type) {
    parts.push(`${property.beds} bed ${property.property_type.toLowerCase()}`);
  } else if (property.beds) {
    parts.push(`${property.beds} bed property`);
  } else if (property.property_type) {
    parts.push(property.property_type);
  }

  // Extract first meaningful part of address (street + area)
  const address = property.address || '';
  const addressParts = address.split(',').map((s: string) => s.trim());
  const shortAddress = addressParts.slice(0, 2).join(', ');
  if (shortAddress) parts.push(`in ${shortAddress}`);

  // Action + price
  if (type === 'sold' && property.sold_price) {
    parts.push(`sold for ${formatFullPrice(property.sold_price)}`);
  } else if (type === 'forSale' && property.asking_price) {
    parts.push(`for sale at ${formatFullPrice(property.asking_price)}`);
  } else if (type === 'rental' && property.monthly_rent) {
    parts.push(`to rent for €${property.monthly_rent.toLocaleString()}/mo`);
  }

  const base = parts.length > 0 ? parts.join(' ') : address;
  // Capitalize first letter
  const capitalised = base.charAt(0).toUpperCase() + base.slice(1);
  return `${capitalised} | Irish Property Data`;
}

function buildDescription(property: any, type: string): string {
  const address = property.address || 'Dublin';
  const beds = property.beds ? `${property.beds} bedroom ` : '';
  const propType = property.property_type ? property.property_type.toLowerCase() : 'property';
  const area = property.area_sqm ? ` (${property.area_sqm}m²)` : '';

  if (type === 'sold') {
    const price = property.sold_price ? ` Sold for ${formatFullPrice(property.sold_price)}.` : '';
    const date = property.sold_date ? ` Sale date: ${new Date(property.sold_date).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}.` : '';
    return `${beds}${propType}${area} at ${address}.${price}${date} View full sale history, price analysis and local market data on Irish Property Data.`;
  } else if (type === 'forSale') {
    const price = property.asking_price ? ` Asking price: ${formatFullPrice(property.asking_price)}.` : '';
    return `${beds}${propType}${area} for sale at ${address}.${price} View price history, local market data and nearby properties on Irish Property Data.`;
  } else {
    const rent = property.monthly_rent ? ` €${property.monthly_rent.toLocaleString()}/month.` : '';
    return `${beds}${propType}${area} to rent at ${address}.${rent} View rental listings, market data and nearby properties on Irish Property Data.`;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, id } = await params;
  const result = await fetchPropertyData(type, id);

  if (!result) {
    return {
      title: 'Property | Irish Property Data',
      description: 'View property details, price history and local market data on Irish Property Data.',
    };
  }

  const { property } = result;
  const title = buildTitle(property, type);
  const description = buildDescription(property, type);
  const canonicalId = property.id || encodeURIComponent(property.address);
  const canonicalUrl = `https://irishpropertydata.com/property/${type}/${canonicalId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Irish Property Data',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function PropertyDetailsPage({ params }: Props) {
  const { type, id } = await params;
  const result = await fetchPropertyData(type, id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = result?.property as any;

  return (
    <>
      {/* SSR-rendered content for crawlers — hidden visually but readable by bots */}
      {property && (
        <div
          id="ssr-property-data"
          style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
          aria-hidden="true"
        >
          <h1>{property.address}</h1>
          {type === 'sold' && property.sold_price && (
            <p>Sold for {formatFullPrice(property.sold_price)}</p>
          )}
          {type === 'sold' && property.sold_date && (
            <p>Sale date: {property.sold_date}</p>
          )}
          {type === 'forSale' && property.asking_price && (
            <p>Asking price: {formatFullPrice(property.asking_price)}</p>
          )}
          {type === 'rental' && property.monthly_rent && (
            <p>Monthly rent: €{property.monthly_rent.toLocaleString()}</p>
          )}
          {property.beds && <p>Bedrooms: {property.beds}</p>}
          {property.baths && <p>Bathrooms: {property.baths}</p>}
          {property.area_sqm && <p>Floor area: {property.area_sqm}m²</p>}
          {property.property_type && <p>Property type: {property.property_type}</p>}
          {property.dublin_postcode && <p>Area: {property.dublin_postcode}</p>}
        </div>
      )}

      {/* Full interactive client component */}
      <PropertyDetailsClient />
    </>
  );
}
