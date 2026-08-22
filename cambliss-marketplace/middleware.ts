import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protected vendor routes that require authentication
  const protectedRoutes = ["/vendor/dashboard"];

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    // In a real app, verify JWT token here
    // For now, this middleware is a placeholder for future auth verification
    // Token verification happens client-side via useVendorAuth hook
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vendor/:path*", "/api/:path*"],
};
