import { NextResponse, type NextRequest } from "next/server";

// The cockpit is only served through HA Ingress (behind the user's HA login). HA Ingress
// sets X-Ingress-Path / X-Hass-Source; anything else (e.g. a request straight to the
// container) gets a 404 so routes like `/api/tibber/...` stay protected.
export function middleware(request: NextRequest) {
  // Dev: allow direct localhost requests (preview / npm run dev) — production unchanged.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const isIngress =
    request.headers.has("x-ingress-path") || request.headers.has("x-hass-source");
  if (isIngress) return NextResponse.next();

  return new NextResponse("Not Found", { status: 404 });
}

export const config = {
  // Run on every path, but skip Next.js internals and dev assets to keep dev fast
  matcher: "/((?!_next/static|_next/image).*)",
};
