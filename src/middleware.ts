import { NextResponse, type NextRequest } from "next/server";

// Two entry points reach this Next.js process:
//   1. HA Ingress (authenticated, behind the user's HA login)
//   2. Direct LAN port (configured in dashboard/config.yaml as `ports: 3000/tcp: 3001`),
//      reachable as http://homeassistant.local:3001 — no HA login. Used by the iPad mini 2
//      (Safari 12) which can't run HA's frontend at all.
//
// HA Ingress sets the X-Ingress-Path header (and X-Hass-Source). Direct LAN clients don't.
// On a direct-LAN request we only let the legacy dashboard + its static assets through —
// every other route returns 404 so that things like `/api/tibber/...` stay protected
// behind the HA login.

const DIRECT_ALLOWED_EXACT = new Set<string>([
  "/ipad-legacy",
  "/favicon.ico",
  "/robots.txt",
]);

function isDirectAllowed(pathname: string): boolean {
  if (DIRECT_ALLOWED_EXACT.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const isIngress =
    request.headers.has("x-ingress-path") || request.headers.has("x-hass-source");
  if (isIngress) return NextResponse.next();

  if (isDirectAllowed(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return new NextResponse("Not Found", { status: 404 });
}

export const config = {
  // Run on every path, but skip Next.js internals and dev assets to keep dev fast
  matcher: "/((?!_next/static|_next/image).*)",
};
