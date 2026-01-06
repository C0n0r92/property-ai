import { NextRequest, NextResponse } from 'next/server';
import { loadListings } from '@/lib/data';

/**
 * API endpoint for individual listing data
 * GET /api/listings/[address]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    const decodedAddress = decodeURIComponent(address);
    console.log('🔍 Looking for listing:', decodedAddress);

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

    return NextResponse.json(
      {
        error: 'Listing not found',
        searched: decodedAddress,
        found: false
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

