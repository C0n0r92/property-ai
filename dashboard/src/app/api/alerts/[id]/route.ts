import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const alertId = resolvedParams.id;
    const { status } = await request.json();

    if (!status || !['active', 'paused', 'expired'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, paused, or expired' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the alert belongs to the user
    const { data: existingAlert, error: fetchError } = await supabase
      .from('location_alerts')
      .select('id, user_id')
      .eq('id', alertId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      );
    }

    // Update the alert status
    const { data: updatedAlert, error: updateError } = await supabase
      .from('location_alerts')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating alert:', updateError);
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alert: updatedAlert });
  } catch (error: unknown) {
    console.error('Alert update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const alertId = resolvedParams.id;
    const supabase = await createClient();

    // Delete the alert (cascade will delete related events)
    const { error } = await supabase
      .from('location_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting alert:', error);
      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Alert delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
