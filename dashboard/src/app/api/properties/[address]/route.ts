import { NextRequest, NextResponse } from 'next/server';
import { loadProperties, loadListings, loadRentals } from '@/lib/data';
import { slugToArea, addressMatchesArea } from '@/lib/areas';
import type { Property, Listing, RentalListing } from '@/types/property';

/**
 * API endpoint for individual property data
 * GET /api/properties/[address]
 * Supports sold properties, for-sale listings, and rentals by address
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    // Decode the URL-encoded address
    const decodedAddress = decodeURIComponent(address);

    console.log('🔍 Looking for property:', decodedAddress);

    // Try to find the property in sold properties first
    const soldProperties = await loadProperties();
    const soldProperty = soldProperties.find(p =>
      p.address.toLowerCase().includes(decodedAddress.toLowerCase()) ||
      decodedAddress.toLowerCase().includes(p.address.toLowerCase())
    );

    if (soldProperty) {
      console.log('✅ Found sold property:', soldProperty.address);
      return NextResponse.json({
        property: soldProperty,
        type: 'sold',
        found: true
      });
    }

    // Try to find in for-sale listings
    const listings = await loadListings();
    const listing = listings.find(l =>
      l.address.toLowerCase().includes(decodedAddress.toLowerCase()) ||
      decodedAddress.toLowerCase().includes(l.address.toLowerCase())
    );

    if (listing) {
      console.log('✅ Found listing:', listing.address);
      return NextResponse.json({
        property: listing,
        type: 'forSale',
        found: true
      });
    }

    // Try to find in rentals
    const rentals = await loadRentals();
    const rental = rentals.find(r =>
      r.address.toLowerCase().includes(decodedAddress.toLowerCase()) ||
      decodedAddress.toLowerCase().includes(r.address.toLowerCase())
    );

    if (rental) {
      console.log('✅ Found rental:', rental.address);
      return NextResponse.json({
        property: rental,
        type: 'rental',
        found: true
      });
    }

    // If no exact match, try fuzzy matching
    const allProperties = [
      ...soldProperties.map(p => ({ ...p, type: 'sold' as const })),
      ...listings.map(l => ({ ...l, type: 'forSale' as const })),
      ...rentals.map(r => ({ ...r, type: 'rental' as const }))
    ];

    // Find best fuzzy match
    const fuzzyMatches = allProperties.filter(p => {
      const propertyAddress = p.address.toLowerCase();
      const searchAddress = decodedAddress.toLowerCase();

      // Check if key parts match
      const searchParts = searchAddress.split(',').map(s => s.trim());
      return searchParts.some(part =>
        propertyAddress.includes(part) && part.length > 3
      );
    });

    if (fuzzyMatches.length > 0) {
      const bestMatch = fuzzyMatches[0];
      console.log('🔍 Found fuzzy match:', bestMatch.address);
      return NextResponse.json({
        property: bestMatch,
        type: bestMatch.type,
        found: true,
        fuzzyMatch: true
      });
    }

    console.log('❌ No property found for:', decodedAddress);
    return NextResponse.json(
      {
        error: 'Property not found',
        searched: decodedAddress,
        found: false
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
