import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, source = 'homepage', blogSlug } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Store email in newsletter_subscribers table
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email: email.toLowerCase().trim(),
        subscribed_at: new Date().toISOString(),
        source: source,
        blog_slug: blogSlug
      }, {
        onConflict: 'email'
      });

    if (error) {
      console.error('Error storing newsletter subscription:', error);
      // Still return success to user (don't break UX)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Welcome to our community.'
    });

  } catch (error: unknown) {
    console.error('Newsletter API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
