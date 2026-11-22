import { NextResponse, type NextRequest } from 'next/server';

const APP_ASSET_RE = /\.(png|jpe?g|gif|webp|svg|ico|css|js|map|woff2?|ttf|otf)$/i;

/**
 * Host-based routing:
 *   app host   → dashboard
 *   any other  → published site rendered by /s/[...path]
 * No database access here (edge/runtime agnostic) — resolution happens in the route.
 */
export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host') ?? '';
  const hostname = hostHeader.split(':')[0]!.toLowerCase();
  const appHostname = (process.env.APP_HOST ?? 'localhost:3000').split(':')[0]!.toLowerCase();

  const isAppHost =
    hostname === appHostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  if (isAppHost) {
    // Plans are removed from this build: keep old links working.
    if (request.nextUrl.pathname === '/billing') {
      const url = request.nextUrl.clone();
      url.pathname = '/projects';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next') || APP_ASSET_RE.test(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/s' : `/s${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
