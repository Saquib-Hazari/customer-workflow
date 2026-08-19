import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { DEMO_USER_COOKIE } from "@/lib/current-user";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid user ID is required" },
      { status: 400 },
    );
  }
  const userId =
    typeof body === "object" &&
    body !== null &&
    "userId" in body &&
    typeof body.userId === "string"
      ? body.userId.trim()
      : "";
  const username =
    typeof body === "object" &&
    body !== null &&
    "username" in body &&
    typeof body.username === "string"
      ? body.username.trim()
      : "";
  if (!userId && !username)
    return NextResponse.json(
      { error: "A valid user ID is required" },
      { status: 400 },
    );
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: { team: true },
      })
    : await prisma.user.findFirst({
        where: { OR: [{ email: username }, { name: username }] },
        include: { team: true },
      });
  if (!user)
    return NextResponse.json({ error: "Demo user not found" }, { status: 400 });

  const response = NextResponse.json({ user });
  response.cookies.set(DEMO_USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
