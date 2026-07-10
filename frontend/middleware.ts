import { NextResponse, type NextRequest } from "next/server";
import { isPlatformHost, stripPort } from "@/lib/platform-hosts";
import { resolveBusinessIdByCustomDomain } from "@/lib/resolve-domain-edge";

export async function middleware(request: NextRequest) {
  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const host = stripPort(hostHeader);

  if (!host || isPlatformHost(host)) {
    return NextResponse.next();
  }

  // Already rewritten mini-site path with business id — continue
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const businessId = await resolveBusinessIdByCustomDomain(host);
  if (!businessId) {
    return new NextResponse("Mini site bulunamadı (domain aktif değil).", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Root and any path on custom domain → mini site for this business
  const rewriteUrl = request.nextUrl.clone();
  if (pathname === "/" || pathname === "") {
    rewriteUrl.pathname = `/site/${businessId}`;
  } else if (!pathname.startsWith(`/site/${businessId}`)) {
    // Keep query (e.g. preview=1); map unknown paths to mini site root
    rewriteUrl.pathname = `/site/${businessId}`;
  }

  const response = NextResponse.rewrite(rewriteUrl);
  response.headers.set("x-mini-site-business-id", businessId);
  response.headers.set("x-mini-site-custom-domain", host);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
