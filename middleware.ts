import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This is a basic middleware - you'll need to implement proper auth checking
  // For now, it just allows all requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ADSCUST.html (specifically the ad landing page)
     * - any other files in public/ with extensions
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.html$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    '/patient/:path*',
    '/doctor/:path*',
  ],
};