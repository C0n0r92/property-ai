import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-utils';

/**
 * POST /api/saved-properties/view
 * Update view count and last viewed timestamp for a saved property
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

    const body = await request.json();
    const { property_id, property_type } = body;

    if (!property_id || !property_type) {
      return NextResponse.json(
        { error: 'Missing property_id or property_type' },
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

    // Check if metadata column exists and get current data
    const { data: currentProperty, error: selectError } = await supabase
      .from('saved_properties')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .eq('property_type', property_type)
      .single();

    if (selectError || !currentProperty) {
      // If metadata column doesn't exist or property not found, just return success
      // This maintains backwards compatibility
      return NextResponse.json({ success: true, view_count: 1 });
    }

    const currentMetadata = currentProperty.metadata || {};
    const newViewCount = (currentMetadata.view_count || 0) + 1;

    // Try to update metadata, but don't fail if column doesn't exist
    const { error } = await supabase
      .from('saved_properties')
      .update({
        metadata: {
          ...currentMetadata,
          view_count: newViewCount,
          last_viewed: new Date().toISOString(),
        },
      })
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .eq('property_type', property_type);

    // Don't return error if metadata update fails (backwards compatibility)
    if (error) {
      console.warn('Failed to update metadata (column may not exist):', error);
    }

    if (error) {
      console.error('Error updating view metadata:', error);
      return NextResponse.json(
        { error: 'Failed to update view metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, view_count: newViewCount });
  } catch (error) {
    console.error('Saved properties view update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
