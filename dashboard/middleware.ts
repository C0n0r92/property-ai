import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Check protocol - handle both direct and proxied requests
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isHttp = request.nextUrl.protocol === 'http:' || forwardedProto === 'http';
  
  // Check if www redirect is needed
  const needsWwwRedirect = hostname.startsWith('www.');
  
  // Handle auth session first (important for cookie management)
  // This ensures cookies are properly set/refreshed before any redirects
  const supabaseResponse = await updateSession(request);
  
  // Determine the final canonical URL (https, non-www)
  const needsRedirect = isHttp || needsWwwRedirect;
  
  if (needsRedirect) {
    // Build the canonical URL: https://irishpropertydata.com
    if (isHttp) {
      url.protocol = 'https:';
    }
    if (needsWwwRedirect) {
      const nonWwwHostname = hostname.replace('www.', '');
      url.hostname = nonWwwHostname;
    }
    
    // Create redirect response
    const redirectResponse = NextResponse.redirect(url, 301);
    
    // Preserve cookies from Supabase session by copying Set-Cookie headers
    // This is critical to maintain authentication across redirects
    const setCookieHeaders = supabaseResponse.headers.getSetCookie();
    setCookieHeaders.forEach(cookie => {
      redirectResponse.headers.append('Set-Cookie', cookie);
    });
    
    return redirectResponse;
  }
  
  // No redirect needed, return the Supabase response
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};





