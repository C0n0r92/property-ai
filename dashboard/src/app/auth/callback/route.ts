import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logUserSignup } from '@/lib/logger';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;

  if (error) {
    console.error('Auth error:', error);
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (code) {
    const supabase = await createClient();

    // Exchange code for session (this handles email confirmations)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (data.user) {
      // Check if this is a new user (email signup confirmation)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingUser) {
        // New user - log signup (email confirmation)
        await logUserSignup(data.user.id, data.user.email || '');
      }
    }

    // Redirect to map page after successful authentication
    return NextResponse.redirect(`${origin}/map`);
  }

  // No code or error, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

