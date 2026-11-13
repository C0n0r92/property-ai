import { type NextRequest, NextResponse } from 'next/server';

/**
 * One canonical address for every page: https, without "www". Requests for
 * anything else are sent there permanently, keeping the path and query.
 */
export function middleware(request: NextRequest) {
  // The address the visitor used. request.nextUrl holds the server's own
  // internal address (e.g. 0.0.0.0:8080), so it cannot be used to redirect.
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
  const hostname = host.replace(/:\d+$/, '');
  if (!hostname || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(hostname)) return NextResponse.next();

  // Behind the host's proxy the app itself is reached over plain http, so the
  // proxy's x-forwarded-proto is what says how the visitor connected
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const isHttp = forwardedProto ? forwardedProto === 'http' : request.nextUrl.protocol === 'http:';
  const isWww = hostname.startsWith('www.');
  if (!isHttp && !isWww) return NextResponse.next();

  const canonicalHost = isWww ? hostname.slice(4) : hostname;
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(`https://${canonicalHost}${pathname}${search}`, 301);
}

export const config = {
  // Static files and images never need the check
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
