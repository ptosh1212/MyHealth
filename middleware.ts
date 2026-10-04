import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Currently allows all matched requests.
  // Add authentication/authorization here later.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - API routes
     * - Next.js static/image files
     * - favicon
     * - HTML files in /public
     * - common image files in /public
     */
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.html$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
      missing: [
        {
          type: 'header',
          key: 'next-router-prefetch',
        },
        {
          type: 'header',
          key: 'purpose',
          value: 'prefetch',
        },
      ],
    },

    // Explicitly include protected application areas
    '/patient/:path*',
    '/doctor/:path*',
    '/founder/:path*',
    '/instabooking/:path*',
  ],
};