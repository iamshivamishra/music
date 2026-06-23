export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/upload/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
    "/studio/:path*",
    "/admin/:path*",
    "/onboarding",
    "/login",
    "/signup",
  ],
};
