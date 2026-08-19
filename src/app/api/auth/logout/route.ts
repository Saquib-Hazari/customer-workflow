import { NextResponse } from "next/server";
import { DEMO_USER_COOKIE } from "@/lib/current-user";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(DEMO_USER_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
