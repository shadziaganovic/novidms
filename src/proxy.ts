import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Gate the authenticated areas. Public pages (landing, /login, /register, the
// invite link) and their API routes are not matched below. Fine-grained ADMIN
// checks happen in the pages / server actions themselves.
//
// (Next 16 renamed the `middleware` file convention to `proxy`.)
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const { pathname } = req.nextUrl;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/admin/:path*",
    "/api/documents/:path*",
    "/api/categories/:path*",
    "/api/users/:path*",
  ],
};
