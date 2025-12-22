import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { logPropertySaved, logPropertyUnsaved } from '@/lib/logger';

/**
 * GET /api/saved-properties
 * Fetch all saved properties for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const propertyType = searchParams.get('type');

    let query = supabase
      .from('saved_properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching saved properties:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved properties' },
        { status: 500 }
      );
    }

    return NextResponse.json({ properties: data || [] });
  } catch (error) {
    console.error('Saved properties GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-properties
 * Save a new property (requires premium tier)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has premium tier
    if (user.tier !== 'premium') {
      return NextResponse.json(
        { error: 'Premium subscription required', requiresUpgrade: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { property_id, property_type, property_data, notes } = body;

    if (!property_id || !property_type || !property_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['listing', 'rental', 'sold'].includes(property_type)) {
      return NextResponse.json(
        { error: 'Invalid property type' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saved_properties')
      .insert({
        user_id: user.id,
        property_id,
        property_type,
        property_data,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation (already saved)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Property already saved' },
          { status: 409 }
        );
      }

      console.error('Error saving property:', error);
      return NextResponse.json(
        { error: 'Failed to save property' },
        { status: 500 }
      );
    }

    // Log the event
    await logPropertySaved(user.id, property_id, property_type);

    return NextResponse.json({ property: data }, { status: 201 });
  } catch (error) {
    console.error('Saved properties POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/saved-properties
 * Update notes for a saved property
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { property_id, property_type, notes } = body;

    if (!property_id || !property_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['listing', 'rental'].includes(property_type)) {
      return NextResponse.json(
        { error: 'Invalid property type' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('saved_properties')
      .update({ notes: notes || null })
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .eq('property_type', property_type);

    if (error) {
      console.error('Error updating property notes:', error);
      return NextResponse.json(
        { error: 'Failed to update property notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Saved properties PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved-properties
 * Remove a saved property
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const property_id = searchParams.get('property_id');
    const property_type = searchParams.get('property_type');

    if (!property_id || !property_type) {
      return NextResponse.json(
        { error: 'Missing property_id or property_type' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .eq('property_type', property_type);

    if (error) {
      console.error('Error deleting saved property:', error);
      return NextResponse.json(
        { error: 'Failed to delete saved property' },
        { status: 500 }
      );
    }

    // Log the event
    await logPropertyUnsaved(user.id, property_id, property_type as 'listing' | 'rental');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Saved properties DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

