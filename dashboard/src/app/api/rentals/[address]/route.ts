import { NextRequest, NextResponse } from 'next/server';
import { loadRentals } from '@/lib/data';

/**
 * API endpoint for individual rental data
 * GET /api/rentals/[address]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    const decodedAddress = decodeURIComponent(address);
    console.log('🔍 Looking for rental:', decodedAddress);

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

    return NextResponse.json(
      {
        error: 'Rental not found',
        searched: decodedAddress,
        found: false
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error fetching rental:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

