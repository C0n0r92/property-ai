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

    const supabase = await createClient();
    const { id: alertId } = await params;
    const { status } = await request.json();

    // Validate status
    if (!['active', 'paused', 'expired'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update the blog alert (ensure it belongs to the user)
    const { data: alert, error } = await supabase
      .from('blog_alerts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating blog alert:', error);
      return NextResponse.json(
        { error: 'Failed to update blog alert' },
        { status: 500 }
      );
    }

    if (!alert) {
      return NextResponse.json(
        { error: 'Blog alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ alert });
  } catch (error: unknown) {
    console.error('Blog alert update error:', error);
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

    const supabase = await createClient();
    const { id: alertId } = await params;

    // Delete the blog alert (ensure it belongs to the user)
    const { error } = await supabase
      .from('blog_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting blog alert:', error);
      return NextResponse.json(
        { error: 'Failed to delete blog alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Blog alert delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
