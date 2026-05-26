import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that do not require authentication */
const PUBLIC_PATHS = new Set(['/login']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('pcx_session')?.value;
  const isAuthenticated = Boolean(session);

  // Already logged in → skip the login page
  if (PUBLIC_PATHS.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Not authenticated → send to login, preserving intended destination
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all paths EXCEPT:
   * - _next/static  (static files)
   * - _next/image   (image optimisation)
   * - favicon.ico
   * - common image extensions
   */
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
