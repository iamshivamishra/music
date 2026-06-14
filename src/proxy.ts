import { NextRequest, NextResponse } from "next/server";

// Ye routes sirf logged-in users ke liye hain
const PROTECTED_ROUTES = ["/upload", "/profile", "/music"];

// Ye routes sirf admins ke liye hain
const ADMIN_ROUTES = ["/upload"];

// Ye routes logged-in users ko nahi dikhni chahiye (login/signup)
const AUTH_ROUTES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("music_token")?.value;

  let payload: { role?: string; exp?: number } | null = null;

  if (token) {
    const parts = token.split(".");
    if (parts.length === 3) {
      try {
        const decoded = JSON.parse(atob(parts[1]));
        if (!decoded.exp || decoded.exp * 1000 > Date.now()) {
          payload = decoded;
        }
      } catch {
        payload = null;
      }
    }
  }

  const isLoggedIn = !!payload;

  // 1. Agar logged in hai aur /login ya /signup pe jaa raha hai -> home pe bhejo
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Protected routes check
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Admin check
    const isAdminRoute = ADMIN_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute && payload?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/upload/:path*",
    "/profile/:path*",
    "/music/:path*",
    "/music",
    "/login",
    "/signup",
  ],
};