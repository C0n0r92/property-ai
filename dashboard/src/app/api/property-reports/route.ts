import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-utils';

/**
 * POST /api/property-reports
 * Report a property with wrong geo location
 * Body: { 
 *   property_id: string,
 *   property_type: 'sold' | 'listing' | 'rental',
 *   address: string,
 *   current_latitude: number,
 *   current_longitude: number,
 *   reported_latitude?: number,
 *   reported_longitude?: number,
 *   report_details?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      property_id,
      property_type,
      address,
      current_latitude,
      current_longitude,
      reported_latitude,
      reported_longitude,
      report_details,
    } = body;

    if (!property_id || !property_type || !address) {
      return NextResponse.json(
        { error: 'property_id, property_type, and address are required' },
        { status: 400 }
      );
    }

    if (!['sold', 'listing', 'rental'].includes(property_type)) {
      return NextResponse.json(
        { error: 'property_type must be "sold", "listing", or "rental"' },
        { status: 400 }
      );
    }

    if (current_latitude === undefined || current_longitude === undefined) {
      return NextResponse.json(
        { error: 'current_latitude and current_longitude are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user already reported this property
    const { data: existingReport } = await supabase
      .from('property_reports')
      .select('id')
      .eq('property_id', property_id)
      .eq('property_type', property_type)
      .eq('user_id', user.id)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this property' },
        { status: 409 }
      );
    }

    // Create the report
    const { data, error } = await supabase
      .from('property_reports')
      .insert({
        user_id: user.id,
        property_id,
        property_type,
        address,
        current_latitude,
        current_longitude,
        reported_latitude: reported_latitude || null,
        reported_longitude: reported_longitude || null,
        report_reason: 'wrong_location',
        report_details: report_details || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating property report:', error);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report: data,
    }, { status: 201 });
  } catch (error) {
    console.error('Property reports POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/property-reports?property_id=xxx&property_type=xxx
 * Check if user has already reported a property
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { reported: false },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const propertyType = searchParams.get('property_type');

    if (!propertyId || !propertyType) {
      return NextResponse.json(
        { error: 'property_id and property_type parameters are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data } = await supabase
      .from('property_reports')
      .select('id')
      .eq('property_id', propertyId)
      .eq('property_type', propertyType)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      reported: !!data,
    });
  } catch (error) {
    console.error('Property reports GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





