import { NextResponse } from "next/server";

// Single-operator tool: cookie value is the shared password itself
// (httpOnly + secure, HTTPS-only via Traefik). No sessions table, no JWT —
// ponytail: this isn't a multi-user app, don't build auth for one it doesn't have.
export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const auth = req.cookies.get("dashboard_auth")?.value;
  if (auth === process.env.DASHBOARD_PASSWORD) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
