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

  // Visitors always arrive through the host's proxy, which says how they
  // connected in x-forwarded-proto. A request without it came straight to the
  // server (the platform's health check, by internal IP): leave it alone.
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  if (!forwardedProto) return NextResponse.next();
  const isHttp = forwardedProto === 'http';
  const isWww = hostname.startsWith('www.');
  if (!isHttp && !isWww) return NextResponse.next();

  const canonicalHost = isWww ? hostname.slice(4) : hostname;
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(`https://${canonicalHost}${pathname}${search}`, 301);
}

export const config = {
  // Static files, images and the health check never need it
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
