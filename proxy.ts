import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.cookies.get("demo_user_id")?.value) {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(request.nextUrl.pathname)}`,
        request.url,
      ),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/applications/:path*",
    "/users/:path*",
  ],
};
