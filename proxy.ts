import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth?: { user?: { role?: string; status?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const user = session?.user;

  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
    if (user.role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/result")) {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
    if (user.status !== "APPROVED") return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/result/:path*", "/admin/:path*"],
};
