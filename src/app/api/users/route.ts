import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { currentActor } from "@/lib/authorization";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "EXECUTIVE"] } },
    select: { id: true, name: true, email: true, role: true, teamId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const actor = await currentActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const body = await request.json();
  const role = body.role;
  if (
    actor.role !== "ADMIN" &&
    !(actor.role === "MANAGER" && role === "EXECUTIVE")
  )
    return NextResponse.json(
      { error: "You do not have permission to add this user" },
      { status: 403 },
    );
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(body.email)
  )
    return NextResponse.json(
      { error: "Name and a valid email are required" },
      { status: 400 },
    );
  if (!["ADMIN", "MANAGER", "EXECUTIVE"].includes(role))
    return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
  const teamId = actor.role === "MANAGER" ? actor.teamId : body.teamId || null;
  if (actor.role === "MANAGER" && !teamId)
    return NextResponse.json(
      { error: "Manager must belong to a team" },
      { status: 400 },
    );
  try {
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        role,
        teamId,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Unable to create user" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const actor = await currentActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === actor.id)
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 },
    );
  if (
    actor.role !== "ADMIN" &&
    !(
      actor.role === "MANAGER" &&
      target.role === "EXECUTIVE" &&
      target.teamId === actor.teamId
    )
  )
    return NextResponse.json(
      { error: "You do not have permission to remove this user" },
      { status: 403 },
    );
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "User cannot be removed while records are assigned to them" },
      { status: 409 },
    );
  }
}
